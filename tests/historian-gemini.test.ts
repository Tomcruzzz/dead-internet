import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { countTokens, generateContent, constructed } = vi.hoisted(() => ({ countTokens: vi.fn(), generateContent: vi.fn(), constructed: vi.fn() }));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class { models = { countTokens, generateContent }; constructor(options: unknown) { constructed(options); } },
  ThinkingLevel: { LOW: "LOW" },
}));
import { askGeminiHistorian, historianAvailability, historianAnswerCache } from "@/lib/historian/gemini";
import { HistorianBudget, historianBudget } from "@/lib/historian/budget";
import type { EvidencePack } from "@/lib/historian/types";

const evidence: EvidencePack = {
  context: { url: "http://youtube.com/", requestedDate: "2007-06-15", timestamp: "20070614120959", captureDate: "June 14, 2007", requestedDisplayDate: "June 15, 2007" },
  sources: [{ id: "E1", kind: "archive_text", label: "Archived text", excerpt: "Featured Videos. Broadcast Yourself. Browse videos shared by members.", url: "https://web.archive.org/web/20070614120959/http://youtube.com/" }],
  coverage: "archive_text", limitations: ["One capture only."], retrievedAt: "2026-11-05T00:00:00Z",
};
const answer = { observations: [{ claim: "The page includes a featured-video section.", evidenceId: "E1", quote: "Featured Videos" }], inferences: [], gaps: ["One capture cannot establish evolution."] };
const response = () => ({ text: JSON.stringify(answer), candidates: [{ finishReason: "STOP" }], usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 300, thoughtsTokenCount: 100, totalTokenCount: 1400 } });

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "test-key-never-send-to-model"); vi.stubEnv("GEMINI_MODEL", "gemini-3.8-flash"); vi.stubEnv("AI_HISTORIAN_ENABLED", "true");
  countTokens.mockReset().mockResolvedValue({ totalTokens: 1500 }); generateContent.mockReset().mockResolvedValue(response()); constructed.mockReset();
  historianAnswerCache.clear(); vi.spyOn(historianBudget, "reserve").mockReturnValue(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("official SDK historian boundary", () => {
  it("uses token preflight, bounded structured generation, no retries, and no prompt secrets", async () => {
    const result = await askGeminiHistorian("What does this page show?", evidence);
    expect(result.status).toBe("answered");
    expect(result.answer.observations[0].quote).toBe("Featured Videos");
    expect(constructed.mock.calls[0][0]).toMatchObject({ apiKey: "test-key-never-send-to-model", httpOptions: { retryOptions: { attempts: 1 } } });
    expect(countTokens).toHaveBeenCalledTimes(1);
    const request = generateContent.mock.calls[0][0];
    expect(request.model).toBe("gemini-3.8-flash");
    expect(request.config.responseMimeType).toBe("application/json");
    expect(request.config.maxOutputTokens).toBe(2048);
    expect(request.config.thinkingConfig.thinkingLevel).toBe("LOW");
    expect(request.config.tools).toBeUndefined();
    expect(JSON.stringify(request)).not.toContain("test-key-never-send-to-model");
    expect(JSON.stringify(result)).not.toContain("test-key-never-send-to-model");
    expect(result.usage.totalTokens).toBe(1400);
  });
  it("does not generate when token preflight exceeds budget", async () => {
    countTokens.mockResolvedValue({ totalTokens: 8001 });
    await expect(askGeminiHistorian("Question", evidence)).rejects.toMatchObject({ status: "too_large" });
    expect(generateContent).not.toHaveBeenCalled();
  });
  it("caches only validated answers and retains original generation time", async () => {
    const first = await askGeminiHistorian("Question", evidence);
    const second = await askGeminiHistorian("Question", evidence);
    expect(second.cached).toBe(true); expect(second.generatedAt).toBe(first.generatedAt);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });
  it("rejects fabricated quotes without caching an answer", async () => {
    generateContent.mockResolvedValue({ ...response(), text: JSON.stringify({ ...answer, observations: [{ ...answer.observations[0], quote: "Made-up evidence" }] }) });
    await expect(askGeminiHistorian("Question", evidence)).rejects.toMatchObject({ status: "invalid_answer" });
    expect(historianAnswerCache.size).toBe(0);
  });
  it("does not display incomplete model output", async () => {
    generateContent.mockResolvedValue({ ...response(), candidates: [{ finishReason: "MAX_TOKENS" }] });
    await expect(askGeminiHistorian("Question", evidence)).rejects.toMatchObject({ status: "invalid_answer" });
  });
  it("requires an explicit successful completion reason", async () => {
    generateContent.mockResolvedValue({ ...response(), candidates: [] });
    await expect(askGeminiHistorian("Question", evidence)).rejects.toMatchObject({ status: "invalid_answer" });
  });
  it("sanitizes provider errors", async () => {
    generateContent.mockRejectedValue(Object.assign(new Error("secret test-key-never-send-to-model"), { status: 429 }));
    await expect(askGeminiHistorian("Question", evidence)).rejects.toMatchObject({ status: "rate_limited", message: expect.not.stringContaining("secret") });
  });
  it("does not initialize Gemini when missing a key or disabled", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(historianAvailability().configured).toBe(false);
    await expect(askGeminiHistorian("Question", evidence)).rejects.toMatchObject({ status: "not_configured" });
    vi.stubEnv("AI_HISTORIAN_ENABLED", "false");
    await expect(askGeminiHistorian("Question", evidence)).rejects.toMatchObject({ status: "disabled" });
    expect(constructed).not.toHaveBeenCalled();
  });
});

describe("prototype budget", () => {
  it("enforces concurrency and idempotent release", () => {
    const budget = new HistorianBudget(); const release1 = budget.reserve(); const release2 = budget.reserve();
    expect(() => budget.reserve()).toThrow(); release1(); release1();
    const release3 = budget.reserve(); expect(() => budget.reserve()).toThrow(); release2(); release3();
  });
  it("enforces daily attempts with a UTC-day reset", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-05T00:00:00Z"));
    const budget = new HistorianBudget(); budget.reserve(1)(); expect(() => budget.reserve(1)).toThrow();
    vi.setSystemTime(new Date("2026-11-06T00:00:00Z")); expect(() => budget.reserve(1)).not.toThrow();
  });
});

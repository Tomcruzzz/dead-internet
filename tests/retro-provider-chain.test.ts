import { beforeEach, afterEach, it, expect, vi } from "vitest";
const { generate, count, groq, reserve } = vi.hoisted(() => ({ generate: vi.fn(), count: vi.fn(), groq: vi.fn(), reserve: vi.fn() }));
vi.mock("@google/genai", () => ({ GoogleGenAI: class { models = { countTokens: count, generateContent: generate }; }, ThinkingLevel: { LOW: "LOW" } }));
vi.mock("@/lib/retro/groq", () => ({ groqRetroPlan: groq }));
vi.mock("@/lib/historian/budget", () => ({ historianBudget: { reserve } }));
import { aiRebuild } from "@/lib/retro/ai";
const page = { title: "Demo", description: "", sourceUrl: "https://example.com", blocks: [{ kind: "paragraph" as const, text: "Source text" }], links: [], fetchedAt: "now", truncated: false };
const plan = { layout: "directory", featuredBlocks: [0], rationale: "Directory design" };
beforeEach(() => { vi.stubEnv("GEMINI_API_KEY", "test"); vi.stubEnv("AI_HISTORIAN_ENABLED", "true"); count.mockReset().mockResolvedValue({ totalTokens: 100 }); generate.mockReset(); groq.mockReset().mockResolvedValue({ model: "openai/gpt-oss-20b", plan }); reserve.mockReset().mockReturnValue(() => {}); });
afterEach(() => vi.unstubAllEnvs());
it("skips Groq on a valid Gemini answer", async () => {
  generate.mockResolvedValue({ candidates: [{ finishReason: "STOP" }], text: JSON.stringify(plan) });
  expect((await aiRebuild(page, "web95", new AbortController().signal)).ai.provider).toBe("gemini"); expect(groq).not.toHaveBeenCalled();
});
it("uses Groq when Gemini fails or returns invalid output", async () => {
  generate.mockRejectedValue(new Error("provider failure"));
  expect((await aiRebuild(page, "web95", new AbortController().signal)).ai.provider).toBe("groq");
  generate.mockResolvedValue({ candidates: [{ finishReason: "STOP" }], text: '{"html":"bad"}' });
  expect((await aiRebuild(page, "web95", new AbortController().signal)).ai.provider).toBe("groq");
});
it("does not bypass budgets or cancellation via Groq", async () => {
  reserve.mockImplementation(() => { throw new Error("Limit"); });
  await expect(aiRebuild(page, "web95", new AbortController().signal)).rejects.toThrow(); expect(groq).not.toHaveBeenCalled();
});

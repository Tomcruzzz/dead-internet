import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/historian/gemini", () => ({ historianAvailability: vi.fn(), requireHistorianConfiguration: vi.fn(), askGeminiHistorian: vi.fn() }));
vi.mock("@/lib/historian/evidence", () => ({ loadHistorianEvidence: vi.fn() }));
import { GET, POST } from "@/app/api/historian/route";
import { POST as evidencePost } from "@/app/api/historian/evidence/route";
import { historianAvailability, requireHistorianConfiguration, askGeminiHistorian } from "@/lib/historian/gemini";
import { loadHistorianEvidence } from "@/lib/historian/evidence";
import { HistorianError } from "@/lib/historian/errors";

const context = { url: "youtube.com", requestedDate: "2007-06-15", timestamp: "20070614120959" };
const request = (body: unknown) => new Request("https://app.test/api/historian", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => { vi.resetAllMocks(); vi.mocked(historianAvailability).mockReturnValue({ configured: false, enabled: true, model: "gemini-3.8-flash" }); });

describe("historian API", () => {
  it("reports configuration without returning a secret", async () => {
    const result = await GET(new Request("https://app.test/api/historian")); expect(await result.json()).toEqual({ configured: false, enabled: true, model: "gemini-3.8-flash" });
    expect(result.headers.get("cache-control")).toBe("no-store");
  });
  it.each([null, {}, { ...context, question: "" }, { ...context, question: "x".repeat(1001) }, { ...context, timestamp: "20070231000000", question: "Purpose?" }])("rejects invalid requests before paid work", async body => {
    expect((await POST(request(body))).status).toBe(400); expect(askGeminiHistorian).not.toHaveBeenCalled();
  });
  it("fails honestly before evidence/model work when no key is configured", async () => {
    vi.mocked(requireHistorianConfiguration).mockImplementation(() => { throw new HistorianError("not_configured", "Configure the server key."); });
    const result = await POST(request({ ...context, question: "Purpose?" })); expect(result.status).toBe(503);
    expect(loadHistorianEvidence).not.toHaveBeenCalled(); expect(askGeminiHistorian).not.toHaveBeenCalled();
  });
  it("does not return raw unexpected provider errors", async () => {
    vi.mocked(loadHistorianEvidence).mockRejectedValue(new Error("sensitive error text"));
    const result = await POST(request({ ...context, question: "Purpose?" }));
    expect(result.status).toBe(502); expect(JSON.stringify(await result.json())).not.toContain("sensitive");
  });
  it("supports evidence review without invoking Gemini", async () => {
    vi.mocked(loadHistorianEvidence).mockResolvedValue({ sources: [], limitations: [], context: { ...context, captureDate: "June 14, 2007", requestedDisplayDate: "June 15, 2007" }, coverage: "metadata_only", retrievedAt: "2026-11-05T00:00:00Z" });
    const result = await evidencePost(request(context)); expect(result.status).toBe(200);
    expect((await result.json()).status).toBe("ready"); expect(askGeminiHistorian).not.toHaveBeenCalled();
  });
});

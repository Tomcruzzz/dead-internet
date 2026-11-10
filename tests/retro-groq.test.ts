import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { groqRetroPlan } from "@/lib/retro/groq";
const plan = { layout: "directory", featuredBlocks: [0], rationale: "Keep the source navigation prominent." };
const fetcher = vi.fn();
beforeEach(() => { vi.stubEnv("GROQ_API_KEY", "local-test-secret"); vi.stubEnv("GROQ_MODEL", "openai/gpt-oss-20b"); vi.stubGlobal("fetch", fetcher); fetcher.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const response = (content = JSON.stringify(plan), finish = "stop") => Response.json({ choices: [{ finish_reason: finish, message: { content } }] });
describe("Groq planner boundary", () => {
  it("uses a fixed endpoint and strict schema, with credentials only in headers", async () => {
    fetcher.mockResolvedValue(response());
    const result = await groqRetroPlan("System", "Source", 1, new AbortController().signal);
    expect(result.plan).toEqual(plan); expect(result.model).toBe("openai/gpt-oss-20b");
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(options.redirect).toBe("error"); expect(options.headers.Authorization).toBe("Bearer local-test-secret");
    expect(options.body).not.toContain("local-test-secret");
    expect(JSON.parse(options.body).response_format.json_schema.strict).toBe(true);
  });
  it.each([response('{"html":"<script>"}'), response(JSON.stringify({ ...plan, featuredBlocks: [100] })), response(JSON.stringify(plan), "length"), new Response("secret provider error", { status: 429 }), new Response("x".repeat(65537))])("rejects bad/oversized/partial/rate-limited responses", async result => {
    fetcher.mockResolvedValue(result);
    await expect(groqRetroPlan("System", "Source", 1, new AbortController().signal)).rejects.toThrow();
  });
  it("skips network access without credentials or after cancellation", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    await expect(groqRetroPlan("System", "Source", 1, new AbortController().signal)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
});

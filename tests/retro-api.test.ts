import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/retro/fetch", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/retro/fetch")>(), fetchPublicPage: vi.fn() }));
import { fetchPublicPage } from "@/lib/retro/fetch";
vi.mock("@/lib/retro/public-content", () => ({ publicRemake: vi.fn() }));
import { publicRemake } from "@/lib/retro/public-content";
import { RetroError } from "@/lib/retro/errors";
import { POST } from "@/app/api/retro/route";
const source = { url: "https://example.com/", contentType: "text/html", body: Buffer.from('<title>Example</title><main><p>This source has enough readable text to make a genuine text-based conversion preview without fabricated information.</p></main>') };
const request = (body: unknown) => new Request("http://localhost/api/retro", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => { vi.mocked(fetchPublicPage).mockReset(); vi.mocked(publicRemake).mockReset(); });
describe("POST /api/retro", () => {
  it.each(["youtube", "facebook", "github"])("creates a labeled %s remake without fetching account data", async kind => {
    const result = await POST(request({ url: `https://${kind}.com`, content: "sample" }));
    const data = await result.json();
    expect(result.status).toBe(200);
    expect(data.page.remake).toMatchObject({ kind, content: "sample" });
    expect(fetchPublicPage).not.toHaveBeenCalled();
  });
  it("supports a chosen remake layout for another public website", async () => {
    const result = await POST(request({ url: "example.com", layout: "youtube", content: "sample" }));
    const data = await result.json();
    expect(result.status).toBe(200);
    expect(data.page.title).toBe("example.com");
    expect(data.page.remake.kind).toBe("youtube");
    expect(fetchPublicPage).not.toHaveBeenCalled();
  });
  it.each([{url:"http://127.0.0.1",layout:"facebook"},{url:"example.com",layout:"unrecognized"}])("validates URLs and layout selection before generating a remake", async body => {
    expect((await POST(request(body))).status).toBe(400);
    expect(fetchPublicPage).not.toHaveBeenCalled();
  });
  it("does not silently replace a public adapter failure with sample content", async () => {
    vi.mocked(publicRemake).mockRejectedValue(new RetroError("unavailable", "Source blocked"));
    const result = await POST(request({ url: "https://youtube.com", content: "public" }));
    const data = await result.json();
    expect(result.status).toBe(502);
    expect(data.status).toBe("unavailable");
    expect(data.page).toBeUndefined();
  });
  it.each([null, {}, { url: 123 }])("rejects invalid request %j", async body => {
    const result = await POST(request(body));
    expect(result.status).toBe(400);
    expect(fetchPublicPage).not.toHaveBeenCalled();
  });
  it("rejects malformed JSON", async () => {
    const result = await POST(new Request("http://localhost/api/retro", { method: "POST", body: "{" }));
    expect(result.status).toBe(400);
  });
  it("returns semantic content instead of arbitrary source markup", async () => {
    vi.mocked(fetchPublicPage).mockResolvedValue(source);
    const result = await POST(request({ url: "example.com" }));
    const data = await result.json();
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(data.status).toBe("ready");
    expect(data.page.title).toBe("Example");
    expect(data.page.blocks[0].kind).toBe("paragraph");
    expect(data.page.html).toBeUndefined();
  });
  it.each([
    ["invalid_input", 400], ["unsupported", 422], ["unavailable", 502],
  ] as const)("maps %s failures to HTTP %s", async (status, code) => {
    vi.mocked(fetchPublicPage).mockRejectedValue(new RetroError(status, "Conversion failed"));
    const result = await POST(request({ url: "example.com" }));
    expect(result.status).toBe(code);
    expect((await result.json()).status).toBe(status);
  });
});

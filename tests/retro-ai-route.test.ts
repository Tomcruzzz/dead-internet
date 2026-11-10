import { describe, it, expect, vi, beforeEach } from "vitest";
const { load, rebuild } = vi.hoisted(() => ({ load: vi.fn(), rebuild: vi.fn() }));
vi.mock("@/app/api/retro/route", () => ({ POST: load }));
vi.mock("@/lib/retro/ai", () => ({ aiRebuild: rebuild }));
import { POST } from "@/app/api/retro/ai/route";
const page = { title: "Demo", sourceUrl: "https://example.com", blocks: [], links: [], description: "", fetchedAt: "2026-11-06T00:00:00Z", truncated: false };
const request = (extra = {}) => new Request("http://localhost/api/retro/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: "example.com", style: "web95", ...extra }) });
beforeEach(() => { load.mockReset().mockImplementation(async () => Response.json({ status: "ready", page })); rebuild.mockReset(); });
describe("automatic retro fallback", () => {
  it("returns a labeled classic preview when AI fails, without leaking errors", async () => {
    rebuild.mockRejectedValue(new Error("private provider details"));
    const response = await POST(request()); const result = await response.json();
    expect(response.status).toBe(200); expect(result.page.aiFallback).toContain("classic renderer");
    expect(result.page.blocks).toEqual(page.blocks); expect(result.page.ai).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("private provider details");
  });
  it("keeps a successful AI plan", async () => {
    rebuild.mockResolvedValue({ ...page, ai: { layout: "directory" } });
    const result = await (await POST(request())).json();
    expect(result.page.ai.layout).toBe("directory"); expect(result.page.aiFallback).toBeUndefined();
  });
  it("does not conceal source fetch failures with a fake preview", async () => {
    load.mockResolvedValue(Response.json({ status: "unavailable", message: "Source unavailable" }, { status: 502 }));
    expect((await POST(request())).status).toBe(502); expect(rebuild).not.toHaveBeenCalled();
  });
  it("rejects invalid themes before loading a source", async () => {
    expect((await POST(request({ style: "arbitrary-css" }))).status).toBe(400); expect(load).not.toHaveBeenCalled();
  });
});

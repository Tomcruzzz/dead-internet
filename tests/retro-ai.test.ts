import { describe, it, expect } from "vitest";
import { normalizeAiPage, validateRetroPlan, applyRetroPlan } from "@/lib/retro/ai-plan";
import { renderRetroPage } from "@/lib/retro/render";
import type { RetroPage } from "@/lib/retro/types";
const page: RetroPage = { sourceUrl: "https://example.com/", title: "Test", description: "Source description", blocks: [{ kind: "heading", text: "Source heading" }, { kind: "paragraph", text: "Original source text <script>alert(1)</script>" }], links: [{ label: "Original", url: "https://example.com/" }], fetchedAt: "2026-11-06T00:00:00Z", truncated: false };
const plan = { layout: "newspaper" as const, featuredBlocks: [1], rationale: "Feature the source text in a two-column reading layout." };
describe("AI transformation safety", () => {
  it("preserves every original block and source link while applying order", () => {
    const result = applyRetroPlan(page, plan, "test-model");
    expect(result.blocks).toEqual([page.blocks[1], page.blocks[0]]);
    expect(result.links).toEqual(page.links); expect(page.blocks[0].text).toBe("Source heading");
  });
  it.each([{ ...plan, html: "<script>" }, { ...plan, layout: "evil" }, { ...plan, featuredBlocks: [99] }, { ...plan, featuredBlocks: [-1] }, { ...plan, featuredBlocks: [0, 0] }, { ...plan, rationale: "<script>alert(1)</script>" }])("rejects unsafe/unknown plan fields and references", value => {
    expect(() => validateRetroPlan(value, 2)).toThrow();
  });
  it("renders only trusted CSS, escapes source text and disables scripts", () => {
    const html = renderRetroPage(applyRetroPlan(page, plan, "test-model"), "web95");
    expect(html).toContain("column-count:2"); expect(html).toContain("AI REMAKE");
    expect(html).toContain("script-src 'none'"); expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
  it("normalizes controlled demos without executing interactive templates", () => {
    const normalized = normalizeAiPage({ ...page, remake: { kind: "youtube", content: "sample", notice: "Demo", videos: [{ id: "1", title: "Source video", author: "Author", duration: "2:00", url: "https://youtube.com/watch?v=1", thumbnail: "https://example.com/thumbnail" }] } });
    expect(normalized.remake).toBeUndefined(); expect(normalized.blocks.some(block => block.text === "Source video")).toBe(true);
    expect(normalized.links.some(link => link.url.includes("watch?v=1"))).toBe(true);
  });
});

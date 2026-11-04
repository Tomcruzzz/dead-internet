import { describe, expect, it } from "vitest";
import { createRemake, detectRemake } from "@/lib/retro/remake";
import { renderRetroPage } from "@/lib/retro/render";
import { RETRO_STYLES, type RemakeKind } from "@/lib/retro/types";

describe("recognizable interactive remakes", () => {
  it.each([
    ["https://www.youtube.com/watch?v=123", "youtube"], ["https://youtu.be/123", "youtube"],
    ["https://m.facebook.com", "facebook"], ["https://github.com/owner/project", "github"],
    ["https://notyoutube.com", undefined], ["https://youtube.com.evil.com", undefined],
  ])("detects platform hosts for %s", (url, kind) => expect(detectRemake(new URL(url!))).toBe(kind));

  for (const kind of ["youtube", "facebook", "github"] as RemakeKind[]) {
    it.each(RETRO_STYLES)(`renders the ${kind} remake in $name with sample provenance and isolated trusted interactions`, style => {
      const page = createRemake(new URL(`https://${kind}.com`), kind);
      const html = renderRetroPage(page, style.id);
      expect(html).toContain("SIMULATED / INTERACTIVE REMAKE");
      expect(html).toContain("Sample content");
      expect(html).toContain("connect-src 'none'");
      expect(html).toContain("script-src 'nonce-retro-local-v1'");
      expect(html.match(/<script /g)).toHaveLength(1);
      expect(html).not.toContain("allow-same-origin");
      expect(html).not.toContain("<iframe");
      expect(html).toContain(`theme-${style.id}`);
      expect(html).toContain(kind === "youtube" ? 'id="video-search"' : kind === "facebook" ? 'id="post-draft"' : 'id="file-content"');
    });
  }
  it("escapes title and URL-derived project names outside the authored script", () => {
    const page = createRemake(new URL("https://github.com/%3Cscript%3E/test"), "github");
    page.title = '</h1><script>alert("injection")</script>';
    const html = renderRetroPage(page, "win98");
    expect(html).not.toContain('<script>alert("injection")');
    expect(html).toContain("&lt;script&gt;alert(&quot;injection&quot;)&lt;/script&gt;");
    expect(html.match(/<script /g)).toHaveLength(1);
  });
});

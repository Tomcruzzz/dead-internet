import { describe, expect, it } from "vitest";
import { initialJson, publicYoutube, youtubeSource, youtubeVideos } from "@/lib/retro/public-youtube";
import { publicGithub, repositoryLocation } from "@/lib/retro/public-github";
import { publicActionTarget } from "@/lib/retro/actions";
import { renderRetroPage } from "@/lib/retro/render";
import { fetchPublicPage } from "@/lib/retro/fetch";

const video = (id = "abcdefghijk", title = "Real title with } and \\\"quotes") => ({ videoRenderer: {
  videoId: id, title: { runs: [{ text: title }] }, ownerText: { simpleText: "Public creator" }, lengthText: { simpleText: "3:25" },
} });
const html = `var ytInitialData = ${JSON.stringify({ contents: [video(), video(), video("invalid"), video("lmnopqrstuv", "Second video")] })}; trailingCode();`;

describe("YouTube public page adapter", () => {
  it("parses balanced JSON without evaluating source code", () => {
    expect(initialJson(html, "ytInitialData")).toHaveProperty("contents");
    expect(initialJson("var ytInitialData = executeCode();", "ytInitialData")).toBeUndefined();
    expect(initialJson('var ytInitialData = {broken:true};', "ytInitialData")).toBeUndefined();
  });
  it("deduplicates video IDs, preserves order, and builds canonical source URLs", () => {
    const videos = youtubeVideos(html);
    expect(videos.map(video => video.id)).toEqual(["abcdefghijk", "lmnopqrstuv"]);
    expect(videos[0].author).toBe("Public creator");
    expect(videos[0].url).toBe("https://www.youtube.com/watch?v=abcdefghijk");
    expect(videos[0].thumbnail).toBe("https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg");
  });
  it("puts the requested watch video's public player details first", () => {
    const input = html + `var ytInitialPlayerResponse = ${JSON.stringify({ videoDetails: { videoId: "zyxwvutsrqp", title: "The requested video", author: "A channel", lengthSeconds: "125" } })};`;
    expect(youtubeVideos(input)[0]).toMatchObject({ id: "zyxwvutsrqp", title: "The requested video", duration: "2:05" });
  });
  it("supports public channel lockup cards without inventing channel metadata", () => {
    const initial = { metadata: { channelMetadataRenderer: { title: "Actual channel" } }, contents: [{ lockupViewModel: {
      contentType: "LOCKUP_CONTENT_TYPE_VIDEO", contentId: "abcdefghijk", metadata: { lockupMetadataViewModel: { title: { content: "A channel upload" } } },
      contentImage: { thumbnailViewModel: { overlays: [{ thumbnailBottomOverlayViewModel: { badges: [{ thumbnailBadgeViewModel: { text: "5:44" } }] } }] } },
    } }] };
    expect(youtubeVideos(`var ytInitialData = ${JSON.stringify(initial)};`)[0]).toMatchObject({ title: "A channel upload", author: "Actual channel", duration: "5:44" });
  });
  it("canonicalizes public URLs and labels the default search", () => {
    expect(youtubeSource(new URL("https://youtube.com")).query).toBe("retro computing");
    expect(youtubeSource(new URL("https://youtu.be/abcdefghijk?t=1")).url.href).toBe("https://www.youtube.com/watch?v=abcdefghijk");
    expect(youtubeSource(new URL("https://youtube.com/@channel")).url.pathname).toBe("/@channel/videos");
    expect(() => youtubeSource(new URL("https://example.com"))).toThrow();
    expect(() => youtubeSource(new URL("https://youtube.com/watch?v=invalid"))).toThrow();
  });
  it("requests bounded service-only public data and renders real titles safely", async () => {
    const fetchPage: typeof fetchPublicPage = async (url, options) => {
      expect(options?.allowedHosts).toEqual(["www.youtube.com"]);
      expect(options?.policy?.maxBytes).toBe(5_000_000);
      return { body: Buffer.from(html), url, contentType: "text/html" };
    };
    const page = await publicYoutube(new URL("https://youtube.com"), undefined, fetchPage);
    expect(page.remake?.content).toBe("public");
    expect(page.remake?.videos).toHaveLength(2);
    const output = renderRetroPage(page, "win98");
    expect(output).toContain("REAL PUBLIC DATA");
    expect(output).toContain('img-src https://i.ytimg.com');
    expect(output).not.toContain("Building my first website");
    expect(output).toContain("data-video-url=");
  });
  it("returns a source error instead of sample videos when no public data is returned", async () => {
    const fetchPage: typeof fetchPublicPage = async url => ({ body: Buffer.from("<html>Browser check</html>"), url, contentType: "text/html" });
    await expect(publicYoutube(new URL("https://youtube.com"), undefined, fetchPage)).rejects.toMatchObject({ status: "unavailable" });
  });
});

describe("public GitHub repository adapter", () => {
  function fixture(fileMode = false): typeof fetchPublicPage {
    return async (url, options) => {
      expect(new URL(url).hostname).toBe("api.github.com");
      expect(options?.allowedHosts).toEqual(["api.github.com"]);
      const data = !url.includes("/contents") ? { full_name: "owner/repo", default_branch: "main", description: "Actual description" }
        : url.includes("/contents/README.md") ? { type: "file", name: "README.md", size: 16, encoding: "base64", content: Buffer.from("Actual README\n").toString("base64") }
        : fileMode ? { type: "file", name: "index.html", size: 12, encoding: "base64", content: Buffer.from("<h1>Real source</h1>").toString("base64") }
        : [{ name: "README.md", path: "README.md", type: "file" }, { name: "src", path: "src", type: "dir" }];
      return { url, body: Buffer.from(JSON.stringify(data)), contentType: "application/json" };
    };
  }
  it("loads real metadata/listing/README and constructs service-only navigation", async () => {
    const page = await publicGithub(new URL("https://github.com/owner/repo"), undefined, fixture());
    const repo = page.remake!.repository!;
    expect(repo.fullName).toBe("owner/repo");
    expect(repo.file?.text).toBe("Actual README\n");
    expect(repo.entries[1].url).toBe("https://github.com/owner/repo/tree/main/src");
    const output = renderRetroPage(page, "portal");
    expect(output).toContain("Actual README");
    expect(output).not.toContain("Sample issue tracker");
    expect(output).not.toContain("ILLUSTRATIVE SAMPLE FILES");
  });
  it("previews a selected file as text without executing HTML", async () => {
    const page = await publicGithub(new URL("https://github.com/owner/repo/blob/main/src/index.html"), undefined, fixture(true));
    expect(page.remake?.repository?.path).toBe("src/index.html");
    expect(page.remake?.repository?.upUrl).toBe("https://github.com/owner/repo/tree/main/src");
    expect(renderRetroPage(page, "web95")).toContain("&lt;h1&gt;Real source&lt;/h1&gt;");
  });
  it("rejects unsupported hosts and non-repository URLs", () => {
    expect(() => repositoryLocation(new URL("https://github.com.evil.com/owner/repo"))).toThrow();
    expect(() => repositoryLocation(new URL("https://github.com/owner"))).toThrow();
    expect(() => repositoryLocation(new URL("https://github.com/owner/repo/blob/main/%2e%2e%2fprivate"))).toThrow();
  });
});

describe("trusted preview action validation", () => {
  const source = "dead-internet-remake";
  it("encodes a public search rather than accepting a destination URL", () => {
    expect(publicActionTarget({ source, action: "youtube-search", query: "cats & dogs" }, "youtube")).toBe("https://www.youtube.com/results?search_query=cats%20%26%20dogs");
  });
  it.each(["javascript:alert(1)", "https://evil.com/owner/repo", "https://user:pass@github.com/owner/repo", "https://github.com:8443/owner/repo"])("rejects navigation outside the public adapter: %s", url => {
    expect(publicActionTarget({ source, action: "github-navigate", url }, "github")).toBeUndefined();
  });
  it("rejects wrong action sources, kinds and oversized queries", () => {
    expect(publicActionTarget({ source: "other", action: "youtube-search", query: "cats" }, "youtube")).toBeUndefined();
    expect(publicActionTarget({ source, action: "youtube-search", query: "cats" }, "github")).toBeUndefined();
    expect(publicActionTarget({ source, action: "youtube-search", query: "x".repeat(201) }, "youtube")).toBeUndefined();
  });
});

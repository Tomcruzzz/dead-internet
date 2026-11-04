import type { RemakeKind, RetroPage } from "./types";

export function detectRemake(url: URL): RemakeKind | undefined {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com")) return "youtube";
  if (host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.com") return "facebook";
  if (host === "github.com" || host.endsWith(".github.com")) return "github";
}

export function createRemake(url: URL, kind: RemakeKind): RetroPage {
  const brand = detectRemake(url) === kind ? { youtube: "YouTube", facebook: "Facebook", github: "GitHub" }[kind] : url.hostname.replace(/^www\./, "");
  return {
    sourceUrl: url.href,
    title: brand,
    description: "A familiar website, rebuilt for a different era of the Internet.",
    blocks: [], links: [{ label: "Open original website", url: url.href }],
    fetchedAt: new Date().toISOString(), truncated: false,
    remake: {
      kind, content: "sample",
      notice: "Interactive design remake with illustrative sample content. No live account, feed, videos, or repository data is connected. Local changes reset when you change style or reload.",
    },
  };
}

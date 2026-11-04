import { loadBuffer } from "cheerio";
import type { RetroBlock, RetroPage } from "./types";
import { RetroError } from "./errors";

const clean = (text: string) => text.replace(/\s+/g, " ").trim();

export function extractRetroPage(body: Buffer, sourceUrl: string, contentType = ""): RetroPage {
  const encoding = /charset\s*=\s*["']?([^;\s"']+)/i.exec(contentType)?.[1];
  const $ = loadBuffer(body, encoding ? { encoding: { transportLayerEncodingLabel: encoding } } : {});
  const title = clean($("title").first().text() || $("h1").first().text() || new URL(sourceUrl).hostname).slice(0, 180);
  const description = clean($("meta[name='description']").attr("content") ?? "").slice(0, 420);
  $("script,style,noscript,iframe,object,embed,svg,canvas,template,form,[hidden],[aria-hidden='true']").remove();
  $("[style]").filter((_index, element) => /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test($(element).attr("style") ?? "")).remove();

  const links: RetroPage["links"] = [];
  const seenLinks = new Set<string>();
  // Keep recognizable site navigation, then useful in-page links.
  $("nav a[href], [role='navigation'] a[href]").add($("main a[href], article a[href], body a[href]")).each((_index, element) => {
    if (links.length >= 24) return false;
    const label = clean($(element).text()).slice(0, 90);
    const href = $(element).attr("href");
    if (!label || !href || href.startsWith("#")) return;
    try {
      const url = new URL(href, sourceUrl);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || seenLinks.has(url.href)) return;
      seenLinks.add(url.href);
      links.push({ label, url: url.href });
    } catch { /* Ignore malformed source links. */ }
  });
  $("nav,[role='navigation'],footer").remove();
  const main = $("main,[role='main']").first();
  const article = $("article").first();
  const root = main.length ? main : article.length ? article : $("body");
  const blocks: RetroBlock[] = [];
  const selector = "h1,h2,h3,h4,p,li,blockquote,pre";
  let total = 0;
  let truncated = false;
  root.find(selector).each((_index, element) => {
    if ($(element).parentsUntil(root).filter(selector).length) return;
    const raw = element.tagName === "pre" ? $(element).text().trim() : clean($(element).text());
    if (!raw) return;
    if (blocks.length >= 100 || total >= 60_000) { truncated = true; return false; }
    const text = raw.slice(0, Math.min(2400, 60_000 - total));
    if (text.length < raw.length) truncated = true;
    total += text.length;
    const tag = element.tagName;
    blocks.push({
      kind: /^h[1-4]$/.test(tag) ? "heading" : tag === "li" ? "item" : tag === "blockquote" ? "quote" : tag === "pre" ? "code" : "paragraph",
      text,
      ...(/^h[1-4]$/.test(tag) ? { level: Number(tag[1]) } : {}),
    });
  });
  if (!blocks.length) {
    const text = clean(root.text());
    if (text) blocks.push({ kind: "paragraph", text: text.slice(0, 6000) });
    truncated = text.length > 6000;
  }
  const text = blocks.map(block => block.text).join(" ");
  if (text.length < 60 || (text.length < 600 && /enable javascript|checking your browser|verify (?:that )?you are human|just a moment/i.test(text + title))) {
    throw new RetroError("unsupported", "This page has little readable HTML or requires JavaScript, a login, or a browser check. Try a public article or homepage.");
  }
  return { sourceUrl, title, description, blocks, links, fetchedAt: new Date().toISOString(), truncated };
}

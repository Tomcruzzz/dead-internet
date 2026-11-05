import { loadBuffer } from "cheerio";

/** Read archived text as data; no source scripts/styles/resources are executed. */
export function archivedText(body: Buffer, contentType: string): { chunks: string[]; shortened: boolean } {
  const encoding = /charset\s*=\s*["']?([^;\s"']+)/i.exec(contentType)?.[1];
  const $ = loadBuffer(body, encoding ? { encoding: { transportLayerEncodingLabel: encoding } } : {});
  const title = $("title").first().text().replace(/\s+/g, " ").trim().slice(0, 300);
  $("script,style,noscript,iframe,object,embed,svg,canvas,template,form,[hidden],[aria-hidden='true'],#wm-ipp,#wm-ipp-base,#donato").remove();
  $("[style]").filter((_index, element) => /display\s*:\s*none|visibility\s*:\s*hidden/i.test($(element).attr("style") ?? "")).remove();
  $("br,hr").replaceWith(" ");
  $("h1,h2,h3,h4,p,div,li,td,section,article").append(" ");
  const text = $("body").text().replace(/\s+/g, " ").trim();
  if (text.length < 40 || (/wayback machine|internet archive/i.test(title) && /has not archived|not available|cannot be displayed|not found|rate limit|error/i.test(text))) {
    throw new Error("No usable captured page text");
  }
  const chunks = title ? [`Page title: ${title}`] : [];
  const budget = 10_000 - chunks.join("").length;
  let remaining = text.slice(0, budget);
  while (remaining && chunks.length < 16) {
    const split = remaining.length > 1000 ? remaining.lastIndexOf(" ", 1000) : remaining.length;
    const length = split > 300 ? split : Math.min(1000, remaining.length);
    chunks.push(remaining.slice(0, length)); remaining = remaining.slice(length).trim();
  }
  return { chunks, shortened: text.length > budget || remaining.length > 0 };
}

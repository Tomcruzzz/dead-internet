import { fetchPublicPage } from "./fetch";
import { RetroError } from "./errors";
import { createRemake, detectRemake } from "./remake";
import type { PublicVideo, RetroPage } from "./types";

/** Extract a JSON object from an assignment, without evaluating source JavaScript. */
export function initialJson(html: string, variable: string): unknown {
  const pattern = new RegExp(`(?:var\\s+)?${variable}\\s*=\\s*|window\\["${variable}"\\]\\s*=\\s*`, "g");
  for (const match of html.matchAll(pattern)) {
    const start = match.index! + match[0].length;
    if (html[start] !== "{") continue;
    let depth = 0, quoted = false, escaped = false;
    for (let index = start; index < html.length; index++) {
      const character = html[index];
      if (quoted) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') quoted = false;
      } else if (character === '"') quoted = true;
      else if (character === "{") depth++;
      else if (character === "}" && --depth === 0) {
        try { return JSON.parse(html.slice(start, index + 1)); } catch { break; }
      }
    }
  }
  return undefined;
}

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value && typeof value === "object" ? value as RecordValue : {};
function text(value: unknown): string {
  if (typeof value === "string") return value.slice(0, 300);
  const item = record(value);
  if (typeof item.content === "string") return item.content.slice(0, 300);
  if (typeof item.simpleText === "string") return item.simpleText.slice(0, 300);
  return Array.isArray(item.runs) ? item.runs.map(run => typeof record(run).text === "string" ? record(run).text : "").join("").slice(0, 300) : "";
}

export function youtubeVideos(html: string): PublicVideo[] {
  const videos: PublicVideo[] = [];
  const seen = new Set<string>();
  function add(id: unknown, title: string, author: string, duration: string) {
    if (typeof id !== "string" || !/^[\w-]{11}$/.test(id) || !title || seen.has(id)) return;
    seen.add(id);
    videos.push({ id, title, author: author || "Channel not supplied", duration: duration || "Watch",
      url: `https://www.youtube.com/watch?v=${id}`, thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` });
  }
  const player = record(initialJson(html, "ytInitialPlayerResponse"));
  const details = record(player.videoDetails);
  const seconds = Number(details.lengthSeconds);
  add(details.videoId, text(details.title), text(details.author), Number.isFinite(seconds) && seconds > 0 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "");
  const initial = initialJson(html, "ytInitialData");
  const channelTitle = text(record(record(record(initial).metadata).channelMetadataRenderer).title);
  const stack: unknown[] = [initial];
  let visited = 0;
  while (stack.length && videos.length < 18 && visited++ < 150_000) {
    const item = stack.pop();
    if (!item || typeof item !== "object") continue;
    const object = record(item);
    for (const key of ["videoRenderer", "compactVideoRenderer", "gridVideoRenderer"]) {
      const video = record(object[key]);
      add(video.videoId, text(video.title), text(video.ownerText) || text(video.longBylineText) || text(video.shortBylineText), text(video.lengthText));
    }
    const lockup = record(object.lockupViewModel);
    if (lockup.contentType === "LOCKUP_CONTENT_TYPE_VIDEO") {
      const metadata = record(record(lockup.metadata).lockupMetadataViewModel);
      const thumbnail = record(record(lockup.contentImage).thumbnailViewModel);
      let duration = "";
      if (Array.isArray(thumbnail.overlays)) {
        for (const overlay of thumbnail.overlays) {
          const badges = record(record(overlay).thumbnailBottomOverlayViewModel).badges;
          if (Array.isArray(badges)) {
            for (const badge of badges) duration ||= text(record(record(badge).thumbnailBadgeViewModel).text);
          }
        }
      }
      add(lockup.contentId, text(metadata.title), channelTitle, duration);
    }
    const values = Object.entries(object).filter(([key]) => !/adSlot|adPlacement|promoted/i.test(key)).map(([, value]) => value);
    for (let index = values.length - 1; index >= 0; index--) stack.push(values[index]);
  }
  return videos;
}

export function youtubeSource(input: URL): { url: URL; query: string } {
  if (detectRemake(input) !== "youtube") throw new RetroError("unsupported", "Public video data requires a YouTube URL. Choose Sample design for other video-site remakes.");
  const target = new URL("https://www.youtube.com");
  let query = "";
  const shortId = input.hostname === "youtu.be" ? input.pathname.slice(1) : input.pathname.startsWith("/shorts/") ? input.pathname.split("/")[2] : input.searchParams.get("v");
  if (shortId) {
    if (!/^[\w-]{11}$/.test(shortId)) throw new RetroError("invalid_input", "Enter a valid YouTube video URL.");
    target.pathname = "/watch"; target.searchParams.set("v", shortId);
  } else if (input.pathname === "/" || input.pathname === "/results") {
    query = input.searchParams.get("search_query")?.trim().slice(0, 200) || "retro computing";
    target.pathname = "/results"; target.searchParams.set("search_query", query);
  } else if (/^\/(?:@|channel\/|user\/|c\/)/.test(input.pathname)) {
    target.pathname = input.pathname.replace(/\/$/, "");
    if (!/\/(videos|streams|shorts|playlists)$/.test(target.pathname)) target.pathname += "/videos";
  } else throw new RetroError("unsupported", "Use a YouTube search, video, or public channel URL.");
  return { url: target, query };
}

export async function publicYoutube(input: URL, signal?: AbortSignal, fetchPage = fetchPublicPage): Promise<RetroPage> {
  const source = youtubeSource(input);
  const result = await fetchPage(source.url.href, { signal, allowedHosts: ["www.youtube.com"], policy: { maxBytes: 5_000_000 } });
  const videos = youtubeVideos(result.body.toString("utf8"));
  if (!videos.length) throw new RetroError("unavailable", "YouTube returned no readable public videos. It may require a browser check or its page format may have changed. Try a search/video URL, or explicitly choose Sample design.");
  const page = createRemake(source.url, "youtube");
  page.remake = { kind: "youtube", content: "public", videos, query: source.query,
    notice: `Public YouTube ${source.query ? `search results for “${source.query}”` : "page data"}, retrieved without an account. The layout is simulated; titles and video links are from the source. Playback opens YouTube. Search reloads public results; saved cards stay local to this preview.` };
  return page;
}

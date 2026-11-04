import type { RemakeKind } from "./types";

/** Validate the only two remote-read actions accepted from the trusted preview. */
export function publicActionTarget(value: unknown, kind: RemakeKind): string | undefined {
  if (!value || typeof value !== "object") return;
  const data = value as Record<string, unknown>;
  if (data.source !== "dead-internet-remake") return;
  if (data.action === "youtube-search" && kind === "youtube" && typeof data.query === "string" && data.query.trim().length > 0 && data.query.length <= 200) {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(data.query.trim())}`;
  }
  if (data.action === "github-navigate" && kind === "github" && typeof data.url === "string" && data.url.length <= 4096) {
    try {
      const destination = new URL(data.url);
      if (destination.protocol === "https:" && destination.hostname === "github.com" && !destination.username && !destination.password && !destination.port) return destination.href;
    } catch { return; }
  }
}

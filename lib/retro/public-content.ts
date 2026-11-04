import { TtlCache } from "../cdx-cache";
import { RetroError } from "./errors";
import { publicYoutube } from "./public-youtube";
import { publicGithub } from "./public-github";
import type { RemakeKind, RetroPage } from "./types";

export const publicContentCache = new TtlCache<RetroPage>(2 * 60_000, 40);

export async function publicRemake(url: URL, kind: RemakeKind, signal?: AbortSignal): Promise<RetroPage> {
  if (kind === "facebook") throw new RetroError("unsupported", "Public Facebook feed integration is not available. Choose Sample design to explore the layout; no logged-in account is accessed.");
  const key = `${kind}|${url.href}`;
  const cached = publicContentCache.get(key);
  if (cached) return cached;
  const page = kind === "youtube" ? await publicYoutube(url, signal) : await publicGithub(url, signal);
  publicContentCache.set(key, page);
  return page;
}

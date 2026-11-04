import { normalizeUrl, parseRequestedDate, formatDateForDisplay } from "./validation";
export { normalizeUrl, parseRequestedDate, formatDateForDisplay } from "./validation";
export type { ParsedRequestedDate } from "./validation";
import type { PlaybackUrls, ResurrectRequest, SnapshotMeta } from "./types";
import {
  archiveUnavailable,
  noHtmlSnapshot,
  noSnapshot,
} from "./errors";
import { TtlCache } from "./cdx-cache";
import { setTimeout as sleep } from "node:timers/promises";

const CDX_BASE = "https://web.archive.org/cdx/search/cdx";
const PLAYBACK_BASE = "https://web.archive.org/web";
// Two bounded CDX queries preserve exact capture times even for dense archives.
const WINDOW_MONTHS = 6;
const CDX_TIMEOUT_MS = 15_000;
const CDX_LIMIT = 500;

export interface CdxRow {
  urlkey: string;
  timestamp: string; // 14-digit UTC YYYYMMDDhhmmss
  original: string;
  mimetype: string;
  statuscode: string;
  digest: string;
  length: string;
}

// Module-level cache: snapshots are immutable, so this is safe.
export const cdxCache = new TtlCache<CdxRow[]>(15 * 60 * 1000);

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Parse a CDX timestamp (14-digit UTC, possibly shorter) into a Date. */
export function parseCdxTimestamp(ts: string): Date {
  const pad = ts.padEnd(14, "0");
  return new Date(
    Date.UTC(
      Number(pad.slice(0, 4)),
      Number(pad.slice(4, 6)) - 1,
      Number(pad.slice(6, 8)),
      Number(pad.slice(8, 10)),
      Number(pad.slice(10, 12)),
      Number(pad.slice(12, 14)),
    ),
  );
}

function formatCdxDate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}`;
}

function formatCdxTimestamp(date: Date): string {
  return date.toISOString().slice(0, 19).replace(/\D/g, "");
}

function addMonthsUTC(date: Date, months: number): Date {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return result;
}

/** Candidate URL variants to try when an exact CDX match returns nothing. */
export function urlVariants(normalized: string): string[] {
  const variants = new Set<string>([normalized]);
  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname;
    const alt = new URL(normalized);
    if (host.startsWith("www.")) {
      alt.hostname = host.slice(4);
    } else {
      alt.hostname = "www." + host;
    }
    variants.add(alt.toString());
  } catch {
    // ignore; the normalized URL is still used as-is
  }
  return [...variants];
}

/** Build the iframe (`if_`) and canonical playback URLs for a snapshot. */
export function buildPlaybackUrls(timestamp: string, originalUrl: string): PlaybackUrls {
  return {
    iframeUrl: `${PLAYBACK_BASE}/${timestamp}if_/${originalUrl}`,
    canonicalUrl: `${PLAYBACK_BASE}/${timestamp}/${originalUrl}`,
  };
}

// ---------------------------------------------------------------------------
// CDX parsing & querying
// ---------------------------------------------------------------------------

/** Parse the CDX JSON response (array of arrays; first row is the header). */
export function parseCdxResponse(json: unknown): CdxRow[] {
  if (!Array.isArray(json)) {
    throw archiveUnavailable("Malformed CDX response: not an array.");
  }
  if (json.length === 0) return [];
  const header = json[0];
  if (!Array.isArray(header)) {
    throw archiveUnavailable("Malformed CDX response: missing header row.");
  }
  const cols = header as string[];
  const idx = (n: string) => cols.indexOf(n);
  const pos = {
    urlkey: idx("urlkey"),
    timestamp: idx("timestamp"),
    original: idx("original"),
    mimetype: idx("mimetype"),
    statuscode: idx("statuscode"),
    digest: idx("digest"),
    length: idx("length"),
  };
  const rows: CdxRow[] = [];
  for (let r = 1; r < json.length; r++) {
    const row = json[r];
    if (!Array.isArray(row)) continue;
    const g = (k: keyof typeof pos) => String(row[pos[k]] ?? "");
    rows.push({
      urlkey: g("urlkey"),
      timestamp: g("timestamp"),
      original: g("original"),
      mimetype: g("mimetype"),
      statuscode: g("statuscode"),
      digest: g("digest"),
      length: g("length"),
    });
  }
  return rows;
}

export interface QueryCdxOptions {
  fetchImpl?: typeof fetch;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}

// Fetch the CDX URL, retrying once on rate-limiting (429) or temporary
// unavailability (503), honoring Retry-After when present.
async function fetchCdx(requestUrl: string, fetchImpl: typeof fetch, signal?: AbortSignal): Promise<Response> {
  const doFetch = () =>
    fetchImpl(requestUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.any([AbortSignal.timeout(CDX_TIMEOUT_MS), ...(signal ? [signal] : [])]),
    });
  let resp: Response;
  try {
    resp = await doFetch();
  } catch (e) {
    throw archiveUnavailable(
      `Archive lookup failed: ${e instanceof Error ? e.message : "network error"}`,
    );
  }
  if (resp.status === 429 || resp.status === 503) {
    const retryAfter = Number(resp.headers.get("retry-after"));
    const delayMs =
      Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 10) * 1000 : 2000;
    try {
      await sleep(delayMs, undefined, { signal });
      resp = await doFetch();
    } catch (e) {
      throw archiveUnavailable(
        `Archive lookup failed after retry: ${e instanceof Error ? e.message : "network error"}`,
      );
    }
  }
  return resp;
}

/**
 * Query the Wayback CDX index for HTML/200 captures of `url` in [fromDate, toDate].
 * Keep full timestamp precision and do not collapse captures: even captures on
 * the same day can differ in their distance from the requested instant.
 */
export async function queryWaybackCdx(
  url: string,
  fromDate: Date,
  toDate: Date,
  options: QueryCdxOptions = {},
): Promise<CdxRow[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const params = new URLSearchParams();
  params.set("url", url);
  params.set("from", formatCdxTimestamp(fromDate));
  params.set("to", formatCdxTimestamp(toDate));
  params.set("output", "json");
  params.append("filter", "statuscode:200"); // append (not set): CDX takes multiple filters
  params.append("filter", "mimetype:text/html");
  params.set("limit", String(options.limit ?? CDX_LIMIT));
  if (options.offset) params.set("offset", String(options.offset));
  const requestUrl = `${CDX_BASE}?${params.toString()}`;

  const resp = await fetchCdx(requestUrl, fetchImpl, options.signal);
  if (!resp.ok) throw archiveUnavailable(`Archive returned HTTP ${resp.status}.`);
  let json: unknown;
  try {
    json = await resp.json();
  } catch {
    throw archiveUnavailable("Archive returned a malformed response.");
  }
  return parseCdxResponse(json);
}

// ---------------------------------------------------------------------------
// Closest-snapshot selection
// ---------------------------------------------------------------------------

/** Select the HTML/200 capture closest to `target`. Ties break to the earliest capture. */
export function selectClosestSnapshot(
  rows: CdxRow[],
  target: Date,
): { row: CdxRow; distanceDays: number } | undefined {
  const usable = rows.filter(
    (r) => r.mimetype === "text/html" && r.statuscode === "200" && r.timestamp.length >= 8,
  );
  if (usable.length === 0) return undefined;
  let bestRow: CdxRow | undefined;
  let bestDist = Infinity;
  let bestTime = Infinity;
  for (const row of usable) {
    const d = parseCdxTimestamp(row.timestamp);
    const dist = Math.abs(d.getTime() - target.getTime());
    if (dist < bestDist || (dist === bestDist && d.getTime() < bestTime)) {
      bestRow = row;
      bestDist = dist;
      bestTime = d.getTime();
    }
  }
  if (!bestRow) return undefined;
  return { row: bestRow, distanceDays: Math.round(bestDist / 86_400_000) };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export interface ResurrectResult {
  snapshot: SnapshotMeta;
  playback: PlaybackUrls;
  requestedDate: string;
  searchWindow: { from: string; to: string };
}

export interface ResurrectOptions {
  /** Injectable for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

/**
 * Turn a URL + date into the closest Wayback snapshot + playback URLs.
 * Modular so the timeline browser (Milestone 2) can reuse queryWaybackCdx /
 * selectClosestSnapshot independently.
 */
export async function resurrect(
  request: ResurrectRequest,
  options: ResurrectOptions = {},
): Promise<ResurrectResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const normalized = normalizeUrl(request.url);
  const { date: target, display: requestedDate } = parseRequestedDate(request.date);

  const fromDate = addMonthsUTC(target, -WINDOW_MONTHS);
  const toDate = addMonthsUTC(target, WINDOW_MONTHS);
  toDate.setUTCHours(23, 59, 59, 0);
  const searchWindow = { from: formatCdxDate(fromDate), to: formatCdxDate(toDate) };
  const rangeLabel = `${formatDateForDisplay(fromDate)} to ${formatDateForDisplay(toDate)}`;
  const signal = AbortSignal.any([
    AbortSignal.timeout(45_000),
    ...(options.signal ? [options.signal] : []),
  ]);

  // Try the normalized URL first, then fall back to a www variant if needed.
  const variants = urlVariants(normalized);
  let allRows: CdxRow[] = [];
  for (const variant of variants) {
    const cacheKey = `nearest-v2|${variant}|${formatCdxTimestamp(target)}|${searchWindow.from}|${searchWindow.to}`;
    let rows = cdxCache.get(cacheKey);
    if (!rows) {
      // The closest capture must be either the last at/before the target or
      // the first at/after it. Negative CDX limits select the latest captures.
      // Both halves must succeed before selecting or caching a result.
      const [before, after] = await Promise.all([
        queryWaybackCdx(variant, fromDate, target, { fetchImpl, limit: -1, signal }),
        queryWaybackCdx(variant, target, toDate, { fetchImpl, limit: 1, signal }),
      ]);
      rows = [...before, ...after];
      cdxCache.set(cacheKey, rows);
    }
    allRows = allRows.concat(rows);
    if (allRows.length > 0) break;
  }

  if (allRows.length === 0) {
    throw noSnapshot(`No HTML snapshots found from ${rangeLabel}. Tried with and without www.`);
  }

  const closest = selectClosestSnapshot(allRows, target);
  if (!closest) {
    throw noHtmlSnapshot("Snapshots exist, but none are usable HTML/200 captures.");
  }

  const snapshotDate = parseCdxTimestamp(closest.row.timestamp);
  const snapshot: SnapshotMeta = {
    timestamp: closest.row.timestamp,
    displayDate: formatDateForDisplay(snapshotDate),
    originalUrl: closest.row.original,
    httpStatus: closest.row.statuscode,
    mimetype: closest.row.mimetype,
    digest: closest.row.digest,
    distanceDays: closest.distanceDays,
  };
  const playback = buildPlaybackUrls(closest.row.timestamp, closest.row.original);
  return { snapshot, playback, requestedDate, searchWindow };
}

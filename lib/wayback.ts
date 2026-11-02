import type { PlaybackUrls, ResurrectRequest, SnapshotMeta } from "./types";
import {
  archiveUnavailable,
  invalidInput,
  noHtmlSnapshot,
  noSnapshot,
} from "./errors";
import { TtlCache } from "./cdx-cache";

const CDX_BASE = "https://web.archive.org/cdx/search/cdx";
const PLAYBACK_BASE = "https://web.archive.org/web";
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

export function formatDateForDisplay(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatCdxDate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}`;
}

function addMonthsUTC(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
}

export interface ParsedRequestedDate {
  date: Date;
  display: string;
}

/** Parse a user date (YYYY | YYYY-MM | YYYY-MM-DD) into a target Date + display string. */
export function parseRequestedDate(input: string): ParsedRequestedDate {
  const trimmed = input.trim();
  if (!trimmed) throw invalidInput("Date is required.");
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(trimmed);
  if (!m) throw invalidInput("Invalid date. Use YYYY, YYYY-MM, or YYYY-MM-DD.");
  const year = Number(m[1]);
  const month = m[2] ? Number(m[2]) : 1;
  const day = m[3] ? Number(m[3]) : 1;
  if (month < 1 || month > 12) throw invalidInput("Invalid month.");
  if (day < 1 || day > 31) throw invalidInput("Invalid day.");
  if (year < 1900) throw invalidInput("Invalid year.");
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) throw invalidInput("Invalid date.");
  return { date, display: formatDateForDisplay(date) };
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/** Normalize a user-entered URL: default scheme, require a dotted domain. */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw invalidInput("URL is required.");
  let withScheme = trimmed;
  if (!/^https?:\/\//i.test(withScheme)) withScheme = "http://" + withScheme;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw invalidInput("Invalid URL: could not be parsed.");
  }
  if (!parsed.hostname || !parsed.hostname.includes(".")) {
    throw invalidInput("Invalid URL: must include a domain name.");
  }
  return parsed.toString();
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
}

/** Query the Wayback CDX index for HTML/200 captures of `url` in [fromDate, toDate]. */
export async function queryWaybackCdx(
  url: string,
  fromDate: Date,
  toDate: Date,
  options: QueryCdxOptions = {},
): Promise<CdxRow[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const params = new URLSearchParams();
  params.set("url", url);
  params.set("from", formatCdxDate(fromDate));
  params.set("to", formatCdxDate(toDate));
  params.set("output", "json");
  params.append("filter", "statuscode:200"); // append (not set): CDX takes multiple filters
  params.append("filter", "mimetype:text/html");
  params.set("limit", String(options.limit ?? CDX_LIMIT));
  if (options.offset) params.set("offset", String(options.offset));
  const requestUrl = `${CDX_BASE}?${params.toString()}`;

  let resp: Response;
  try {
    resp = await fetchImpl(requestUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(CDX_TIMEOUT_MS),
    });
  } catch (e) {
    throw archiveUnavailable(
      `Archive lookup failed: ${e instanceof Error ? e.message : "network error"}`,
    );
  }
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
}

export interface ResurrectOptions {
  /** Injectable for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
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

  // Try the normalized URL first, then fall back to a www variant if needed.
  const variants = urlVariants(normalized);
  let allRows: CdxRow[] = [];
  for (const variant of variants) {
    const cacheKey = `${variant}|${formatCdxDate(fromDate)}|${formatCdxDate(toDate)}`;
    let rows = cdxCache.get(cacheKey);
    if (!rows) {
      rows = [];
      // CDX is chronological: search every page before choosing or caching a result.
      for (let page = 0; ; page++) {
        if (page === 100) {
          throw archiveUnavailable("Too many captures to search. Try a more specific page URL.");
        }
        const batch = await queryWaybackCdx(variant, fromDate, toDate, {
          fetchImpl,
          offset: page * CDX_LIMIT,
        });
        rows.push(...batch);
        if (batch.length < CDX_LIMIT) break;
      }
      cdxCache.set(cacheKey, rows);
    }
    allRows = allRows.concat(rows);
    if (allRows.length > 0) break;
  }

  if (allRows.length === 0) {
    throw noSnapshot("No snapshots found for this URL near the requested date.");
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
  return { snapshot, playback, requestedDate };
}

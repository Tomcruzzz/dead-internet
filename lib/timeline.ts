import { TtlCache } from "./cdx-cache";
import { ResurrectError } from "./errors";
import { normalizeUrl, parseRequestedDate, formatDateForDisplay } from "./validation";
import { buildPlaybackUrls, parseCdxTimestamp, queryWaybackCdx, type CdxRow } from "./wayback";
import type { ResurrectRequest, TimelineFoundResponse } from "./types";

const MAX_CAPTURES = 12;
export const timelineCache = new TtlCache<CdxRow[]>();

export async function captureTimeline(
  request: ResurrectRequest & { year: number },
  options: { fetchImpl?: typeof fetch; signal?: AbortSignal } = {},
): Promise<TimelineFoundResponse> {
  const url = normalizeUrl(request.url);
  const { date: target } = parseRequestedDate(request.date);
  const currentYear = new Date().getUTCFullYear();
  if (!Number.isInteger(request.year) || request.year < 1996 || request.year > currentYear) {
    throw new ResurrectError("invalid_input", `Choose a timeline year from 1996 to ${currentYear}.`);
  }
  const from = new Date(Date.UTC(request.year, 0, 1));
  const to = new Date();
  if (request.year < currentYear) to.setTime(Date.UTC(request.year, 11, 31, 23, 59, 59));
  else to.setUTCHours(23, 59, 59, 0);
  const end = to.toISOString().slice(0, 10).replaceAll("-", "");
  const start = `${request.year}0101`;
  const cacheKey = `${url}|${start}|${end}`;
  let rows = timelineCache.get(cacheKey);
  if (!rows) {
    rows = await queryWaybackCdx(url, from, to, {
      ...options,
      limit: MAX_CAPTURES + 1,
      collapse: "timestamp:6",
      signal: AbortSignal.any([AbortSignal.timeout(45_000), ...(options.signal ? [options.signal] : [])]),
    });
    timelineCache.set(cacheKey, rows);
  }
  const months = new Set<string>();
  const captures = rows.filter((row) => {
    if (row.mimetype !== "text/html" || row.statuscode !== "200" || !/^\d{14}$/.test(row.timestamp)) return false;
    const date = parseCdxTimestamp(row.timestamp);
    if (!Number.isFinite(date.getTime()) || date < from || date > to ||
      date.toISOString().slice(0, 19).replace(/\D/g, "") !== row.timestamp) return false;
    if (!/^https?:\/\//i.test(row.original)) return false;
    try { normalizeUrl(row.original); } catch { return false; }
    return true;
  }).sort((a, b) => a.timestamp.localeCompare(b.timestamp)).filter((row) => {
    const month = row.timestamp.slice(0, 6);
    if (months.has(month)) return false;
    months.add(month);
    return true;
  }).slice(0, MAX_CAPTURES).map((row) => ({
    snapshot: {
      timestamp: row.timestamp,
      displayDate: formatDateForDisplay(parseCdxTimestamp(row.timestamp)),
      originalUrl: row.original,
      httpStatus: row.statuscode,
      mimetype: row.mimetype,
      digest: row.digest,
      distanceDays: Math.round(Math.abs(parseCdxTimestamp(row.timestamp).getTime() - target.getTime()) / 86_400_000),
    },
    playback: buildPlaybackUrls(row.timestamp, row.original),
  }));
  return { status: "found", captures, searchWindow: { from: start, to: end }, truncated: rows.length > MAX_CAPTURES };
}

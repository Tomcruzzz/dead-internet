// Shared request/response types for the RESURRECT flow.
// Kept free of runtime dependencies so it can be imported on both server and client.

export interface ResurrectRequest {
  url: string;
  date: string; // YYYY | YYYY-MM | YYYY-MM-DD
}

export type ResurrectStatus =
  | "found"
  | "no_snapshot"
  | "archive_unavailable"
  | "invalid_input"
  | "no_html_snapshot";

export interface SnapshotMeta {
  /** 14-digit UTC capture timestamp from the CDX index (YYYYMMDDhhmmss). */
  timestamp: string;
  /** Human-readable capture date, e.g. "June 15, 2007". */
  displayDate: string;
  /** The original URL that was archived (includes scheme). */
  originalUrl: string;
  /** HTTP status code of the capture, e.g. "200". */
  httpStatus: string;
  /** MIME type of the capture, e.g. "text/html". */
  mimetype: string;
  /** Content digest from the CDX index (SHA1-ish hash; provenance/dedup). */
  digest: string;
  /** |requested date - actual capture date| in whole days. */
  distanceDays: number;
}

export interface PlaybackUrls {
  /** Wayback playback URL in `if_` form: archived page WITHOUT the toolbar, for iframe embedding. */
  iframeUrl: string;
  /** Canonical Wayback playback URL (with toolbar) for the provenance link. */
  canonicalUrl: string;
}

export interface ResurrectFoundResponse {
  status: "found";
  requestedDate: string;
  /** Inclusive searched dates in YYYYMMDD format. */
  searchWindow: { from: string; to: string };
  snapshot: SnapshotMeta;
  playback: PlaybackUrls;
  /** Human-readable provenance source label. */
  source: string;
}

export interface ResurrectErrorResponse {
  status: Exclude<ResurrectStatus, "found">;
  message: string;
  requestedDate?: string;
}

export type ResurrectResponse = ResurrectFoundResponse | ResurrectErrorResponse;

export interface TimelineCapture {
  snapshot: SnapshotMeta;
  playback: PlaybackUrls;
}

export interface TimelineFoundResponse {
  status: "found";
  captures: TimelineCapture[];
  searchWindow: { from: string; to: string };
  truncated: boolean;
}

export type TimelineResponse = TimelineFoundResponse | ResurrectErrorResponse;

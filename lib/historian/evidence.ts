import "server-only";
import { TtlCache } from "../cdx-cache";
import { buildPlaybackUrls, formatDateForDisplay, parseCdxTimestamp, queryWaybackCdx, type CdxRow } from "../wayback";
import { normalizeUrl, parseRequestedDate } from "../validation";
import { fetchPublicPage } from "../retro/fetch";
import { archivedText } from "./archive-text";
import { HistorianError } from "./errors";
import { historianContext } from "./validation";
import type { EvidencePack } from "./types";

interface CaptureMaterial { row: CdxRow; chunks: string[]; limitations: string[]; retrievedAt: string }
export const historianEvidenceCache = new TtlCache<CaptureMaterial>(10 * 60_000, 40);

export async function loadHistorianEvidence(input: unknown, options: {
  signal?: AbortSignal; query?: typeof queryWaybackCdx; fetchPage?: typeof fetchPublicPage;
} = {}): Promise<EvidencePack> {
  const context = historianContext(input);
  const key = `${context.url}|${context.timestamp}`;
  let material = historianEvidenceCache.get(key);
  if (!material) {
    const instant = parseCdxTimestamp(context.timestamp);
    let rows: CdxRow[];
    try { rows = await (options.query ?? queryWaybackCdx)(context.url, instant, instant, { limit: 1, signal: options.signal }); }
    catch { throw new HistorianError("archive_unavailable", "404 could not verify the capture with the archive. Try again; playback remains available."); }
    const row = rows.find(row => row.timestamp === context.timestamp && row.statuscode === "200" && row.mimetype === "text/html");
    if (!row) throw new HistorianError("unverified_capture", "This exact HTML capture could not be verified. Select a capture from RESURRECT or the timeline.");
    try {
      if (!/^https?:\/\//i.test(row.original)) throw new Error("Unsupported URL");
      normalizeUrl(row.original);
    } catch { throw new HistorianError("unverified_capture", "The archive returned invalid source metadata."); }
    const chunks: string[] = [];
    const limitations: string[] = [];
    try {
      const source = await (options.fetchPage ?? fetchPublicPage)(`https://web.archive.org/web/${row.timestamp}id_/${row.original}`, {
        signal: options.signal, allowedHosts: ["web.archive.org"], policy: { maxBytes: 1_000_000 },
      });
      const finalUrl = new URL(source.url);
      const finalCapture = /^\/web\/(\d{14})id_\//.exec(finalUrl.pathname)?.[1];
      if (finalUrl.hostname !== "web.archive.org" || finalCapture !== row.timestamp || (source.mementoDatetime && new Date(source.mementoDatetime).getTime() !== instant.getTime())) {
        limitations.push("Playback returned a different or unconfirmed capture date. Its page text was excluded.");
      } else {
        const page = archivedText(source.body, source.contentType);
        chunks.push(...page.chunks);
        if (page.shortened) limitations.push("Page text was shortened; these excerpts are not the complete document.");
      }
    } catch {
      if (options.signal?.aborted) throw new HistorianError("archive_unavailable", "The archive evidence request was cancelled or timed out.");
      limitations.push("Archive page text could not be retrieved or parsed. Only verified capture metadata is available.");
    }
    material = { row, chunks, limitations, retrievedAt: new Date().toISOString() };
    historianEvidenceCache.set(key, material);
  }
  const { row } = material;
  const sourceUrl = buildPlaybackUrls(row.timestamp, row.original).canonicalUrl;
  const captureDate = formatDateForDisplay(parseCdxTimestamp(row.timestamp));
  return {
    context: { ...context, url: row.original, captureDate, requestedDisplayDate: parseRequestedDate(context.requestedDate).display },
    sources: [{ id: "E1", kind: "archive_metadata", label: "Verified archive capture metadata", url: sourceUrl,
      excerpt: `Original URL: ${row.original}\nCapture date (UTC): ${captureDate}\nCapture timestamp: ${row.timestamp}\nHTTP status: ${row.statuscode}\nMIME type: ${row.mimetype}\nCDX digest: ${row.digest}`,
    }, ...material.chunks.map((excerpt, index) => ({ id: `E${index + 2}`, kind: "archive_text" as const, label: `Archived page excerpt ${index + 1}`, excerpt, url: sourceUrl }))],
    coverage: material.chunks.length ? "archive_text" : "metadata_only",
    limitations: [...material.limitations,
      "Only one capture is supplied; it cannot establish the website's evolution or general internet culture by itself.",
      "No screenshot, source styles, or asset integrity measurements are supplied. Missing resources and visual/design intent remain unknown.",
    ],
    retrievedAt: material.retrievedAt,
  };
}

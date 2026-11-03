import type { ResurrectFoundResponse } from "@/lib/types";

export function SnapshotMeta({
  data,
  requestedDate,
}: {
  data: ResurrectFoundResponse;
  requestedDate: string;
}) {
  const { snapshot, playback, source } = data;
  return (
    <div className="rounded border border-neutral-800 bg-neutral-900/50 p-5 font-mono text-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="uppercase tracking-wide text-neutral-400">Snapshot</span>
        <span className="text-neutral-500">{source}</span>
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
        <Row label="Requested" value={requestedDate} />
        <Row label="Captured" value={snapshot.displayDate} />
        <Row label="Searched range (UTC)" value={`${displayRangeDate(data.searchWindow.from)} to ${displayRangeDate(data.searchWindow.to)}`} full />
        <Row label="Distance" value={`${snapshot.distanceDays} day${snapshot.distanceDays === 1 ? "" : "s"}`} />
        <Row label="Status" value={`HTTP ${snapshot.httpStatus}`} />
        <Row label="Type" value={snapshot.mimetype} />
        <Row label="Timestamp" value={snapshot.timestamp} />
        <Row label="Original URL" value={snapshot.originalUrl} full />
      </dl>
      <div className="mt-4">
        <a
          href={playback.canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-300 underline underline-offset-2 hover:text-neutral-100"
        >
          View on Wayback Machine ↗
        </a>
      </div>
    </div>
  );
}

function displayRangeDate(date: string): string {
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
}

function Row({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt className="text-neutral-500">{label}</dt>
      <dd className="break-all text-neutral-100">{value}</dd>
    </div>
  );
}

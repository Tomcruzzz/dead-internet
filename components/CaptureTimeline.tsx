"use client";

import { useEffect, useRef, useState } from "react";
import type { TimelineCapture, TimelineFoundResponse, TimelineResponse } from "@/lib/types";

export function CaptureTimeline({ url, date, timestamp, onSelect }: {
  url: string;
  date: string;
  timestamp: string;
  onSelect: (capture: TimelineCapture, window: TimelineFoundResponse["searchWindow"]) => void;
}) {
  const [data, setData] = useState<TimelineFoundResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(timestamp.slice(0, 4));
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function load(selectedYear = year) {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/timeline", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, date, year: Number(selectedYear) }),
        signal: AbortSignal.any([active.signal, AbortSignal.timeout(60_000)]),
      });
      const result = await response.json() as TimelineResponse;
      if (result.status !== "found") throw new Error(result.message);
      if (!response.ok) throw new Error("Could not load the capture timeline.");
      if (active.signal.aborted) return;
      setData(result);
      setYear(selectedYear);
    } catch (error) {
      if (!active.signal.aborted) setError(error instanceof Error ? error.message : "Could not load the timeline.");
    } finally {
      if (!active.signal.aborted) setLoading(false);
    }
  }

  const currentYear = new Date().getUTCFullYear();
  const previous = data?.captures.findLast(capture => capture.snapshot.timestamp < timestamp);
  const next = data?.captures.find(capture => capture.snapshot.timestamp > timestamp);
  function select(capture: TimelineCapture) {
    onSelect(capture, data!.searchWindow);
  }
  const button = "rounded border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800 disabled:opacity-40";
  return (
    <section aria-label="Capture timeline" className="rounded border border-neutral-800 bg-neutral-900/40 p-5">
      <h2 className="mb-2 font-mono text-sm uppercase tracking-wide">Capture timeline</h2>
      <p className="mb-4 text-sm text-neutral-400">Browse one year at a time, with one archived HTML capture per month for {url}. Asset completeness is unknown.</p>
      <form className="mb-3 flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); void load(); }}>
        <label className="flex flex-col gap-1 text-sm text-neutral-400">
          Timeline year
          <input type="number" min={1996} max={currentYear} required value={year}
            onChange={event => setYear(event.target.value)} disabled={loading}
            className="w-28 rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100" />
        </label>
        <button type="submit" disabled={loading} className={button}>
          {loading ? "Loading timeline…" : error ? "Retry timeline" : data ? "Load year" : "Explore capture timeline"}
        </button>
        <button type="button" disabled={loading || Number(year) <= 1996 || !year}
          onClick={() => { const value = String(Number(year) - 1); setYear(value); void load(value); }} className={button}>Previous year</button>
        <button type="button" disabled={loading || Number(year) >= currentYear || !year}
          onClick={() => { const value = String(Number(year) + 1); setYear(value); void load(value); }} className={button}>Next year</button>
      </form>
      {loading && <p role="status" className="mt-2 text-sm text-neutral-400">Searching monthly captures…</p>}
      {error && <p role="alert" className="mt-3 text-sm text-amber-300">{error} Your current snapshot is still available below.</p>}
      {data && data.captures.length === 0 && <p role="status" className="text-sm text-neutral-400">No monthly samples were returned for {data.searchWindow.from.slice(0, 4)}. Your current snapshot is still available below.</p>}
      {data && data.captures.length > 0 && <>
        <p className="mb-3 text-xs text-neutral-400">Monthly samples for {data.searchWindow.from.slice(0, 4)}. These are not all captures.</p>
        {data.truncated && <p role="status" className="mb-3 text-sm text-amber-300">The archive returned more than 12 rows. Some samples may be omitted.</p>}
        <div aria-label={`Captures in ${data.searchWindow.from.slice(0, 4)}`} className="flex flex-wrap gap-2">
          {data.captures.map(capture =>
            <button type="button" key={capture.snapshot.timestamp} aria-pressed={capture.snapshot.timestamp === timestamp}
              onClick={() => select(capture)} className={`${button} ${capture.snapshot.timestamp === timestamp ? "border-neutral-100 bg-neutral-800" : ""}`}>
              {capture.snapshot.displayDate}
            </button>)}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={!previous} onClick={() => previous && select(previous)} className={button}>Previous sample</button>
          <button type="button" disabled={!next} onClick={() => next && select(next)} className={button}>Next sample</button>
        </div>
      </>}
    </section>
  );
}

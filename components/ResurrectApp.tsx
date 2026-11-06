"use client";

import { useState } from "react";
import { ResurrectForm } from "./ResurrectForm";
import { LoadingSequence } from "./LoadingSequence";
import { SnapshotMeta as SnapshotMetaPanel } from "./SnapshotMeta";
import { SnapshotFrame } from "./SnapshotFrame";
import { CaptureTimeline } from "./CaptureTimeline";
import { HistorianPanel } from "./HistorianPanel";
import { TimeCapsules } from "./TimeCapsules";
import type { ResurrectResponse } from "@/lib/types";

type Phase = "idle" | "loading" | "done";

export function ResurrectApp() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [response, setResponse] = useState<ResurrectResponse | null>(null);
  const [request, setRequest] = useState({ url: "", date: "" });

  async function handleResurrect(url: string, date: string) {
    setPhase("loading");
    setRequest({ url, date });
    setResponse(null);
    try {
      const res = await fetch("/api/resurrect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, date }),
        signal: AbortSignal.timeout(60_000),
      });
      const data = (await res.json()) as ResurrectResponse;
      setResponse(data);
    } catch {
      setResponse({
        status: "archive_unavailable",
        message: "Could not reach the Dead Internet server.",
      });
    } finally {
      setPhase("done");
    }
  }

  function handleReset() {
    setPhase("idle");
    setResponse(null);
  }

  return (
    <div className="archive-workspace mx-auto max-w-5xl px-6 py-10">
      <header className="archive-hero mb-8">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-lime-300">RESURRECT / The living archive</p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">The internet had<br />a different <span className="text-lime-300">life.</span></h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-400">Go back to a website you remember. Explore a real archived capture, then ask 404 what the evidence reveals.</p>
      </header>

      <ResurrectForm onSubmit={handleResurrect} disabled={phase === "loading"} />

      {phase === "idle" && <section aria-label="Archive expeditions" className="mt-9">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-mono text-xs uppercase tracking-widest text-neutral-400">Choose a starting point</h2><span className="text-xs text-neutral-500">Live archive lookup · availability may vary</span></div>
        <div className="grid gap-3 sm:grid-cols-3">{[
          { site: "YouTube", url: "youtube.com", date: "2007-06-15", title: "Before the algorithm", detail: "Explore the early video-sharing homepage.", year: "2007" },
          { site: "Wikipedia", url: "wikipedia.org", date: "2004-06-15", title: "Knowledge, under construction", detail: "Visit an earlier chapter of the free encyclopedia.", year: "2004" },
          { site: "GitHub", url: "github.com", date: "2010-06-15", title: "Where code came together", detail: "See a younger home for open source.", year: "2010" },
        ].map(trip => <button key={trip.site} type="button" className="expedition-card text-left" onClick={() => void handleResurrect(trip.url, trip.date)}><span className="flex justify-between font-mono text-xs text-lime-300"><span>{trip.year} / {trip.site}</span><span aria-hidden="true">↗</span></span><strong className="mt-5 block text-base font-medium">{trip.title}</strong><span className="mt-2 block text-sm leading-relaxed text-neutral-500">{trip.detail}</span></button>)}</div>
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-violet-400/20 bg-violet-400/5 p-4"><span className="rounded-md bg-violet-300/10 px-2 py-1 font-mono text-sm text-violet-200">404</span><p className="text-sm leading-relaxed text-neutral-400"><strong className="font-medium text-violet-200">Meet your AI Historian.</strong> Open a snapshot to ask about its purpose, design, and context. Answers separate evidence from inference and show their sources.</p></div>
      </section>}
      {phase === "idle" && <TimeCapsules onOpen={handleResurrect} />}

      {phase === "loading" && <LoadingSequence />}

      {phase === "done" && response && (
        <div className="mt-8 space-y-6">
          {response.status === "found" ? (
            <>
              <div className="result-toolbar flex flex-wrap items-center justify-between gap-3 rounded-xl border border-lime-300/20 bg-lime-300/5 p-4"><p role="status" className="font-mono text-sm text-lime-300">● SNAPSHOT FOUND</p><div className="flex gap-2"><a href="#archive-viewer" className="workspace-link">View archive ↓</a><a href="#historian" className="workspace-link ai-link">✦ Ask 404 ↓</a></div></div>
              <SnapshotMetaPanel data={response} requestedDate={response.requestedDate} />
              <TimeCapsules current={{ url: response.snapshot.originalUrl, date: request.date, timestamp: response.snapshot.timestamp }} onOpen={handleResurrect} />
              <CaptureTimeline url={response.snapshot.originalUrl} date={request.date}
                timestamp={response.snapshot.timestamp}
                onSelect={(capture, searchWindow) => setResponse({ ...response, ...capture, searchWindow })} />
              <div id="archive-viewer" className="scroll-mt-6"><SnapshotFrame playback={response.playback} /></div>
              <HistorianPanel key={`${response.snapshot.originalUrl}|${request.date}|${response.snapshot.timestamp}`}
                context={{ url: response.snapshot.originalUrl, requestedDate: request.date, timestamp: response.snapshot.timestamp }} />
              <div>
                <button
                  onClick={handleReset}
                  className="rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-900"
                >
                  New resurrection
                </button>
              </div>
            </>
          ) : (
            <div className="rounded border border-neutral-800 bg-neutral-900/50 p-6">
              <p className="mb-1 font-mono text-sm uppercase tracking-wide text-neutral-400">
                {labelFor(response.status)}
              </p>
              <p className="text-neutral-200">{response.message}</p>
              {response.requestedDate && (
                <p className="mt-2 text-sm text-neutral-500">Requested: {response.requestedDate}</p>
              )}
              <button
                onClick={handleReset}
                className="mt-4 rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-900"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function labelFor(status: ResurrectResponse["status"]): string {
  switch (status) {
    case "no_snapshot":
      return "NO SNAPSHOT FOUND";
    case "no_html_snapshot":
      return "NO USABLE SNAPSHOT";
    case "archive_unavailable":
      return "ARCHIVE UNAVAILABLE";
    case "invalid_input":
      return "INVALID INPUT";
    default:
      return status.toUpperCase();
  }
}

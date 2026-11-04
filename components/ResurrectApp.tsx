"use client";

import { useState } from "react";
import { ResurrectForm } from "./ResurrectForm";
import { LoadingSequence } from "./LoadingSequence";
import { SnapshotMeta as SnapshotMetaPanel } from "./SnapshotMeta";
import { SnapshotFrame } from "./SnapshotFrame";
import { CaptureTimeline } from "./CaptureTimeline";
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
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">DEAD INTERNET</h1>
        <p className="text-neutral-400">The web forgets. We don&apos;t.</p>
      </header>

      <ResurrectForm onSubmit={handleResurrect} disabled={phase === "loading"} />

      {phase === "loading" && <LoadingSequence />}

      {phase === "done" && response && (
        <div className="mt-8 space-y-6">
          {response.status === "found" ? (
            <>
              <p role="status" className="font-mono text-sm text-neutral-300">SNAPSHOT FOUND</p>
              <SnapshotMetaPanel data={response} requestedDate={response.requestedDate} />
              <CaptureTimeline url={response.snapshot.originalUrl} date={request.date}
                timestamp={response.snapshot.timestamp}
                onSelect={(capture, searchWindow) => setResponse({ ...response, ...capture, searchWindow })} />
              <SnapshotFrame playback={response.playback} />
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

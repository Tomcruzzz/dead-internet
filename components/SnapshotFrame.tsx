"use client";

import { useEffect, useState } from "react";
import type { PlaybackUrls } from "@/lib/types";

export function SnapshotFrame({ playback }: { playback: PlaybackUrls }) {
  const [staticMode, setStaticMode] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return (
    <section aria-label="Archived page viewer">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-wide text-neutral-400">
          ARCHIVED · {staticMode ? "Static safe mode" : "Interactive mode"}
        </span>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button type="button" onClick={() => setAttempt((value) => value + 1)}
            className="rounded border border-neutral-700 px-3 py-1 hover:bg-neutral-900">
            Retry snapshot
          </button>
          <button type="button" aria-pressed={staticMode} onClick={() => setStaticMode((value) => !value)}
            className="rounded border border-neutral-700 px-3 py-1 hover:bg-neutral-900">
            {staticMode ? "Use interactive mode" : "Use static safe mode"}
          </button>
          <a href={playback.canonicalUrl} target="_blank" rel="noopener noreferrer"
            className="text-neutral-300 underline underline-offset-2">Open on Wayback ↗</a>
        </div>
      </div>
      <p className="mb-3 text-sm text-neutral-400">
        {staticMode
          ? "Archived scripts are disabled. Some content and interactions may be missing."
          : "Archived scripts can run inside the isolated viewer. Switch to static safe mode if the page misbehaves."}
      </p>
      <PlaybackAttempt key={`${playback.iframeUrl}|${staticMode}|${attempt}`}
        url={playback.iframeUrl} staticMode={staticMode} />
      <p className="mt-2 text-sm text-neutral-400">
        Blank or broken page? Retry, switch modes, or open the snapshot on Wayback.
        Archived resources may be missing.
      </p>
    </section>
  );
}

// Each remount gives a new URL, mode, or retry an independent load timer.
// A cross-origin load event cannot prove that archived content rendered correctly.
function PlaybackAttempt({ url, staticMode }: { url: string; staticMode: boolean }) {
  const [status, setStatus] = useState<"loading" | "slow" | "loaded" | "error">("loading");
  useEffect(() => {
    if (status !== "loading") return;
    const timer = setTimeout(() => setStatus("slow"), 20_000);
    return () => clearTimeout(timer);
  }, [status]);
  return (
    <>
      <p role="status" className="mb-2 text-sm text-neutral-400">
        {status === "loading" && "Loading archived page…"}
        {status === "slow" && "The archive is taking longer than expected. The snapshot may be unavailable."}
        {status === "loaded" && "The viewer finished loading. We cannot verify the archived page or its resources."}
        {status === "error" && "The snapshot could not be loaded. Try the recovery controls above."}
      </p>
      <iframe src={url} title="Archived webpage"
        sandbox={staticMode ? "" : "allow-scripts"} referrerPolicy="no-referrer"
        onLoad={() => setStatus("loaded")} onError={() => setStatus("error")}
        className="h-[75vh] w-full rounded border border-neutral-800 bg-white" />
    </>
  );
}

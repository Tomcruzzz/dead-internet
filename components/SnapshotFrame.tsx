"use client";

import { useEffect, useState } from "react";
import type { PlaybackUrls } from "@/lib/types";

// Cross-origin iframe load failures can't be detected reliably (same-origin
// policy blocks reading the framed document), so we show a slow-load notice
// instead and always offer the canonical Wayback link as a fallback.
const SLOW_MS = 20_000;

export function SnapshotFrame({ playback }: { playback: PlaybackUrls }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    // setSlow(true) runs in the timer callback (not synchronously in the effect body),
    // so this doesn't trigger cascading renders. `slow` resets to false via the parent's
    // `key` prop, which remounts this component when the snapshot URL changes.
    const id = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(id);
  }, [playback.iframeUrl]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-neutral-500">
          Archived page · sandboxed
        </span>
        <a
          href={playback.canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-neutral-400 underline underline-offset-2"
        >
          open on Wayback ↗
        </a>
      </div>
      {/*
        sandbox="allow-scripts" only: lets archived interactivity run while
        blocking top-navigation, popups, forms, and same-origin access. We never
        combine allow-scripts + allow-same-origin for untrusted archived content.
      */}
      <iframe
        src={playback.iframeUrl}
        title="Archived webpage"
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        className="h-[75vh] w-full rounded border border-neutral-800 bg-white"
      />
      {slow && (
        <p className="mt-2 text-sm text-amber-400">
          The snapshot is taking a long time to load — it may be unavailable.{" "}
          <a
            href={playback.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Open it on the Wayback Machine
          </a>
          .
        </p>
      )}
    </div>
  );
}

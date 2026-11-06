"use client";

import { useState } from "react";
import Link from "next/link";
import { ResurrectApp } from "./ResurrectApp";
import { RetroApp } from "./RetroApp";

export function WebsiteApp() {
  const [mode, setMode] = useState<"archive" | "retro">("archive");
  return (
    <>
      <div className="site-masthead mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-6 py-5">
        <Link href="/" className="brand-mark"><span aria-hidden="true">↶</span> DEAD INTERNET<span className="brand-version">ARCHIVE EXPLORER / 01</span></Link>
        <span className="hidden font-mono text-xs text-neutral-500 sm:block">THE PAST IS STILL ONLINE.</span>
      </div>
      <nav aria-label="Browse mode" className="mode-switch mx-auto flex w-full max-w-5xl flex-wrap gap-2 px-6 pt-6">
        {([{ id: "archive", label: "Browse archives" }, { id: "retro", label: "Retro view" }] as const).map(option =>
          <button type="button" key={option.id} aria-pressed={mode === option.id} onClick={() => setMode(option.id)}
            className={`rounded-lg border px-5 py-3 text-sm ${mode === option.id ? "border-lime-300 bg-lime-300 text-neutral-950" : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-neutral-100"}`}>{option.id === "archive" ? "01 / " : "02 / "}{option.label}</button>)}
      </nav>
      <div hidden={mode !== "archive"}><ResurrectApp /></div>
      <div hidden={mode !== "retro"}><RetroApp /></div>
      <footer className="mx-auto flex max-w-5xl flex-wrap justify-between gap-3 border-t border-neutral-800 px-6 py-6 text-xs text-neutral-500"><span>Built for the curious. Preserved by the Internet Archive.</span><span>Real archives. Clearly labeled simulations.</span></footer>
    </>
  );
}

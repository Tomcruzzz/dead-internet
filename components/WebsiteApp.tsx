"use client";

import { useState } from "react";
import { ResurrectApp } from "./ResurrectApp";
import { RetroApp } from "./RetroApp";

export function WebsiteApp() {
  const [mode, setMode] = useState<"archive" | "retro">("archive");
  return (
    <>
      <nav aria-label="Browse mode" className="mx-auto flex w-full max-w-5xl flex-wrap gap-2 px-6 pt-8">
        {([{ id: "archive", label: "Browse archives" }, { id: "retro", label: "Retro view" }] as const).map(option =>
          <button type="button" key={option.id} aria-pressed={mode === option.id} onClick={() => setMode(option.id)}
            className={`rounded border px-4 py-2 text-sm ${mode === option.id ? "border-neutral-100 bg-neutral-100 text-neutral-950" : "border-neutral-700 text-neutral-400 hover:text-neutral-100"}`}>{option.label}</button>)}
      </nav>
      <div hidden={mode !== "archive"}><ResurrectApp /></div>
      <div hidden={mode !== "retro"}><RetroApp /></div>
    </>
  );
}

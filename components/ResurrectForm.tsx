"use client";

import { useState } from "react";
import { normalizeUrl, parseRequestedDate } from "@/lib/validation";

export function ResurrectForm({
  onSubmit,
  disabled,
}: {
  onSubmit: (url: string, date: string) => void;
  disabled?: boolean;
}) {
  const [url, setUrl] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    const u = url.trim();
    const d = date.trim();
    if (!u) {
      setError("Enter a URL or domain.");
      return;
    }
    try {
      normalizeUrl(u);
      parseRequestedDate(d);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Check the website and date.");
      return;
    }
    setError(null);
    onSubmit(u, d);
  }

  return (
    <form onSubmit={submit} className="archive-search grid gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 sm:grid-cols-[1fr_180px_auto] sm:items-end sm:p-6">
      <div className="flex flex-col gap-1">
        <label htmlFor="url" className="text-sm text-neutral-400">
          Website
        </label>
        <input
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="youtube.com"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-3 outline-none focus:border-lime-300"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="date" className="text-sm text-neutral-400">
          Date
        </label>
        <input
          id="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          placeholder="2007-06-15"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-3 outline-none focus:border-lime-300"
        />
      </div>
      {error && <p role="alert" className="text-sm text-red-400 sm:col-span-3">{error}</p>}
      <button
        type="submit"
        disabled={disabled}
        className="rounded-lg bg-lime-300 px-5 py-3 font-medium text-neutral-950 transition-colors hover:bg-lime-200 disabled:opacity-50"
      >
        {disabled ? "RESURRECTING…" : "FIND SNAPSHOT"}
      </button>
    </form>
  );
}

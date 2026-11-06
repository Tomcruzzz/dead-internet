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
          type="date"
          required
          disabled={disabled}
          aria-describedby="date-presets-help"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          placeholder="2007-06-15"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-3 outline-none focus:border-lime-300"
        />
      </div>
      <button
        type="submit"
        disabled={disabled}
        className="rounded-lg bg-lime-300 px-5 py-3 font-medium text-neutral-950 transition-colors hover:bg-lime-200 disabled:opacity-50"
      >
        {disabled ? "RESURRECTING…" : "FIND SNAPSHOT"}
      </button>
      <fieldset disabled={disabled} className="min-w-0 border-t border-neutral-800 pt-4 sm:col-span-3">
        <legend className="sr-only">Popular website selector</legend>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 font-mono text-xs uppercase tracking-wider text-neutral-500">Popular websites</span>
          {[
            { name: "YouTube", domain: "youtube.com" },
            { name: "Google", domain: "google.com" },
            { name: "Facebook", domain: "facebook.com" },
            { name: "Wikipedia", domain: "wikipedia.org" },
            { name: "GitHub", domain: "github.com" },
            { name: "Yahoo!", domain: "yahoo.com" },
            { name: "Reddit", domain: "reddit.com" },
            { name: "Amazon", domain: "amazon.com" },
          ].map(site => {
            const selected = url.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "") === site.domain;
            return <button key={site.domain} type="button" aria-pressed={selected}
              aria-label={`Select ${site.name} (${site.domain})`}
              onClick={() => { setUrl(site.domain); setError(null); }}
              className={`rounded-lg border px-3 py-2 text-xs transition-colors disabled:opacity-40 ${selected ? "border-lime-300 bg-lime-300/10 text-lime-300" : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-100"}`}>{site.name}</button>;
          })}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-neutral-500">Pick a website and a date, then find a snapshot. Availability depends on when the site existed and what was archived.</p>
      </fieldset>
      <fieldset disabled={disabled} className="min-w-0 border-t border-neutral-800 pt-4 sm:col-span-3">
        <legend className="sr-only">Quick date selector</legend>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 font-mono text-xs uppercase tracking-wider text-neutral-500">Jump to a year</span>
          {[1996, 2000, 2005, 2007, 2010, 2015, 2020].map(year => {
            const preset = `${year}-01-01`;
            return <button key={year} type="button" aria-pressed={date === preset}
              aria-label={`Set date to January 1, ${year}`}
              onClick={() => { setDate(preset); setError(null); }}
              className={`rounded-lg border px-3 py-2 font-mono text-xs transition-colors disabled:opacity-40 ${date === preset ? "border-lime-300 bg-lime-300/10 text-lime-300" : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-100"}`}>{year}</button>;
          })}
        </div>
        <p id="date-presets-help" className="mt-3 text-xs leading-relaxed text-neutral-500">Presets select January 1. Use the calendar for any exact date, then find a snapshot. The nearest available capture may differ.</p>
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-400 sm:col-span-3">{error}</p>}
    </form>
  );
}

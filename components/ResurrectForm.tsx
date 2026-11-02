"use client";

import { useState } from "react";

const DATE_RE = /^\d{4}(-\d{2}(-\d{2})?)?$/;

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
    const u = url.trim();
    const d = date.trim();
    if (!u) {
      setError("Enter a URL or domain.");
      return;
    }
    if (!DATE_RE.test(d)) {
      setError("Date format: YYYY, YYYY-MM, or YYYY-MM-DD.");
      return;
    }
    setError(null);
    onSubmit(u, d);
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4">
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
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-neutral-500"
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
          className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-neutral-500"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={disabled}
        className="rounded bg-neutral-100 px-4 py-2 font-medium text-neutral-950 disabled:opacity-50"
      >
        {disabled ? "RESURRECTING…" : "FIND SNAPSHOT"}
      </button>
    </form>
  );
}

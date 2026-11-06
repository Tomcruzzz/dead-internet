"use client";

import { useState, useSyncExternalStore } from "react";

type Capsule = { url: string; date: string; timestamp: string };
const KEY = "dead-internet-capsules-v1";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("capsules-changed", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("capsules-changed", callback); };
}
function snapshot() { try { return localStorage.getItem(KEY) || "[]"; } catch { return "[]"; } }
function decode(raw: string): Capsule[] {
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter((item): item is Capsule => Boolean(item && typeof item.url === "string" && item.url.length <= 4096 && /^https?:\/\//.test(item.url) && typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && typeof item.timestamp === "string" && /^\d{14}$/.test(item.timestamp))).slice(0, 20);
  } catch { return []; }
}

export function TimeCapsules({ current, onOpen }: { current?: Capsule; onOpen: (url: string, date: string) => void }) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const capsules = decode(raw);
  const [message, setMessage] = useState("");
  const saved = current && capsules.some(item => item.url === current.url && item.timestamp === current.timestamp);
  function write(next: Capsule[]) {
    try { localStorage.setItem(KEY, JSON.stringify(next)); window.dispatchEvent(new Event("capsules-changed")); setMessage(""); }
    catch { setMessage("This browser could not save the capsule. Storage may be disabled or full."); }
  }
  return <section aria-label="Saved time capsules" className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/30 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-medium text-neutral-200">Your time capsules <span className="ml-2 font-mono text-xs text-lime-300">{capsules.length}/20</span></h2><p className="mt-1 text-xs text-neutral-500">Saved in this browser. Reopening looks up the nearest capture to the saved capture date.</p></div>
      {current && <button type="button" disabled={Boolean(saved)} className="workspace-link disabled:opacity-50" onClick={() => { write([current, ...capsules].slice(0, 20)); }}> {saved ? "✓ Capsule saved" : "+ Save time capsule"}</button>}</div>
    {capsules.length > 0 ? <ul className="mt-4 grid gap-2 sm:grid-cols-2">{capsules.map(item => <li key={`${item.url}|${item.timestamp}`} className="flex min-w-0 items-center gap-2 rounded-lg border border-neutral-800 p-3"><button type="button" onClick={() => onOpen(item.url, `${item.timestamp.slice(0,4)}-${item.timestamp.slice(4,6)}-${item.timestamp.slice(6,8)}`)} className="min-w-0 flex-1 text-left"><span className="block truncate text-sm text-neutral-300">{item.url}</span><span className="font-mono text-xs text-neutral-500">{item.timestamp.slice(0,4)} / {item.timestamp.slice(4,6)} / {item.timestamp.slice(6,8)} ↗</span></button><button type="button" aria-label={`Remove capsule for ${item.url}`} className="rounded px-2 py-2 text-neutral-500 hover:text-red-300" onClick={() => write(capsules.filter(saved => saved !== item))}>×</button></li>)}</ul> : <p className="mt-4 text-sm text-neutral-500">Find a snapshot and save your first piece of the old web.</p>}
    {message && <p role="alert" className="mt-3 text-sm text-amber-200">{message}</p>}
  </section>;
}

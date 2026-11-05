"use client";

import { useEffect, useRef, useState } from "react";
import type { EvidencePack, EvidenceResponse, HistorianAvailability, HistorianContext, HistorianObservation, HistorianResponse, HistorianResult } from "@/lib/historian/types";

export function HistorianPanel({ context }: { context: HistorianContext }) {
  const [availability, setAvailability] = useState<HistorianAvailability | null>(null);
  const [question, setQuestion] = useState("");
  const [evidence, setEvidence] = useState<EvidencePack | null>(null);
  const [result, setResult] = useState<HistorianResult | null>(null);
  const [busy, setBusy] = useState<"evidence" | "answer" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/historian", { signal: controller.signal }).then(response => response.json()).then(setAvailability).catch(() => {
      if (!controller.signal.aborted) setError("404's configuration could not be read. You can still review archive evidence.");
    });
    return () => { controller.abort(); active.current?.abort(); };
  }, []);

  async function run(kind: "evidence" | "answer") {
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    setBusy(kind); setError(null);
    if (kind === "answer") setResult(null);
    try {
      const response = await fetch(kind === "evidence" ? "/api/historian/evidence" : "/api/historian", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...context, ...(kind === "answer" ? { question } : {}) }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(65_000)]),
      });
      const data = await response.json() as HistorianResponse | EvidenceResponse;
      if (controller.signal.aborted) return;
      if (data.status === "answered") { setResult(data); setEvidence(data.evidence); }
      else if (data.status === "ready") setEvidence(data.evidence);
      else setError(data.message);
    } catch {
      if (!controller.signal.aborted) setError("404 could not complete the request. Try again; the original archive view is unaffected.");
    } finally { if (!controller.signal.aborted) setBusy(null); }
  }
  const button = "rounded border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800 disabled:opacity-40";
  const examples = [
    `What was this website used for in ${context.requestedDate.slice(0, 4)}?`,
    "Why did this design look like this?", "How did this website evolve?", "What was internet culture like during this period?",
  ];
  return (
    <section aria-label="404 AI Historian" className="rounded border border-violet-900 bg-violet-950/10 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-mono text-lg text-violet-200">404 · AI Historian</h2>
          <p className="mt-1 text-sm text-neutral-400">Ask about this capture, with archive evidence beside the answer.</p></div>
        <span className="font-mono text-xs text-violet-300">AI ANALYSIS · original archive preserved</span>
      </div>
      <p className="mb-3 break-all text-xs text-neutral-500">{context.url} · Requested {context.requestedDate} · Actual capture {context.timestamp} (UTC)</p>
      <p className="mb-4 text-sm text-neutral-400">404 can inspect retrieved archive text and metadata. It cannot see the iframe or establish a site&apos;s whole history from one capture.</p>
      {availability && (!availability.enabled || !availability.configured) && <p role="status" className="mb-4 rounded border border-neutral-800 p-3 text-sm text-neutral-400">
        {!availability.enabled ? "404 is disabled on this server." : "404 needs a server-side Gemini key. Configure GEMINI_API_KEY in .env.local and restart the server. Keep the key out of this page."} Archive evidence review still works.
      </p>}
      <div className="mb-4 flex flex-wrap gap-2" aria-label="Historical question examples">
        {examples.map(example => <button type="button" key={example} disabled={Boolean(busy)} onClick={() => setQuestion(example)} className={button}>{example}</button>)}
      </div>
      <form onSubmit={event => { event.preventDefault(); void run("answer"); }}>
        <label className="flex flex-col gap-2 text-sm text-neutral-300">Question for 404
          <textarea required maxLength={1000} rows={3} value={question} onChange={event => setQuestion(event.target.value)}
            placeholder="What can this archived page tell us about the website at the time?"
            className="rounded border border-neutral-700 bg-neutral-950 p-3 outline-none focus:border-violet-400" />
        </label>
        <p className="my-2 text-xs text-neutral-500">Asking sends your question and bounded archive excerpts to Google Gemini. Avoid personal secrets. No conversation history is stored.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="submit" disabled={Boolean(busy) || !availability?.configured || !availability.enabled}
            className="rounded bg-violet-200 px-4 py-2 text-sm font-medium text-violet-950 disabled:opacity-40">{busy === "answer" ? "404 is checking the evidence…" : "Ask 404"}</button>
          <button type="button" disabled={Boolean(busy)} onClick={() => void run("evidence")} className={button}>{busy === "evidence" ? "Verifying archive evidence…" : "Review archive evidence"}</button>
          {busy && <button type="button" onClick={() => { active.current?.abort(); setBusy(null); }} className={button}>Cancel</button>}
        </div>
      </form>
      {busy && <p role="status" className="mt-3 text-sm text-violet-200">{busy === "answer" ? "Verifying this capture and preparing a source-linked response…" : "Verifying the capture and retrieving archived text…"}</p>}
      {error && <p role="alert" className="mt-4 rounded border border-amber-900 p-3 text-sm text-amber-200">{error}</p>}
      {result && <div className="mt-6 space-y-5" aria-label="404 analysis">
        <p role="status" className="text-xs text-neutral-400">AI analysis · {result.model} · {result.cached ? "Cached answer" : "Generated"} {new Date(result.generatedAt).toLocaleString()}<br />Quotes are checked against source excerpts. AI interpretation can still be wrong; review the evidence.</p>
        {result.answer.observations.length > 0 && <section><h3 className="mb-3 text-sm font-medium text-violet-200">Evidence-backed observations</h3>
          <ul className="space-y-3">{result.answer.observations.map((item, index) => <AnalysisItem key={index} item={item} evidence={result.evidence} />)}</ul></section>}
        {result.answer.inferences.length > 0 && <section><h3 className="mb-3 text-sm font-medium text-amber-200">Inference · not documented fact</h3>
          <ul className="space-y-3">{result.answer.inferences.map((item, index) => <AnalysisItem key={index} item={item} rationale={item.rationale} evidence={result.evidence} />)}</ul></section>}
        {result.answer.gaps.length > 0 && <section><h3 className="mb-2 text-sm font-medium text-neutral-300">Not established by this evidence</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-400">{result.answer.gaps.map((gap, index) => <li key={index}>{gap}</li>)}</ul></section>}
        <p className="text-xs text-neutral-500">Reported input: {result.usage.inputTokens} tokens · Output: {result.usage.outputTokens} · Thinking: {result.usage.thinkingTokens}</p>
      </div>}
      {evidence && <details className="mt-5 rounded border border-neutral-800 p-3">
        <summary className="cursor-pointer text-sm text-violet-200">Evidence pack · {evidence.coverage === "archive_text" ? "archive text + metadata" : "metadata only"} · {evidence.sources.length} sources/excerpts</summary>
        <p className="mt-3 text-xs text-neutral-500">Retrieved {new Date(evidence.retrievedAt).toLocaleString()} · Captured {evidence.context.captureDate} · Requested {evidence.context.requestedDisplayDate}</p>
        <ul className="my-3 list-disc space-y-1 pl-5 text-xs text-neutral-400">{evidence.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul>
        <div className="space-y-3">{evidence.sources.map(source => <div key={source.id} className="border-t border-neutral-800 pt-3">
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-200 underline underline-offset-2">{source.id} · {source.label} ↗</a>
          <p className="mt-2 whitespace-pre-wrap break-words text-xs text-neutral-400">{source.excerpt}</p>
        </div>)}</div>
      </details>}
    </section>
  );
}

function AnalysisItem({ item, evidence, rationale }: { item: HistorianObservation; evidence: EvidencePack; rationale?: string }) {
  const source = evidence.sources.find(source => source.id === item.evidenceId);
  return <li className="rounded border border-neutral-800 p-3 text-sm text-neutral-200">
    <p>{item.claim}</p>{rationale && <p className="mt-2 text-xs text-amber-200">Reasoning: {rationale}</p>}
    <blockquote className="mt-2 border-l border-violet-800 pl-3 text-xs text-neutral-400">“{item.quote}”</blockquote>
    {source && <a href={source.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-violet-200 underline underline-offset-2">{source.id} · {source.label} ↗</a>}
  </li>;
}

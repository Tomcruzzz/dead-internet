"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RETRO_STYLES, type ContentMode, type RemakeLayout, type RetroPage, type RetroResponse, type RetroStyle } from "@/lib/retro/types";
import { renderRetroPage } from "@/lib/retro/render";
import { publicActionTarget } from "@/lib/retro/actions";

export function RetroApp() {
  const [url, setUrl] = useState("");
  const [style, setStyle] = useState<RetroStyle>("web95");
  const [layout, setLayout] = useState<RemakeLayout>("auto");
  const [content, setContent] = useState<ContentMode>("public");
  const [page, setPage] = useState<RetroPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const iframe = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const preview = useMemo(() => page ? renderRetroPage(page, style) : "", [page, style]);

  const convert = useCallback(async (input = url, requestedLayout = layout, requestedContent = content) => {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/retro", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: input.trim(), layout: requestedLayout, content: requestedContent }),
        signal: AbortSignal.any([active.signal, AbortSignal.timeout(35_000)]),
      });
      const result = await response.json() as RetroResponse;
      if (result.status !== "ready") throw new Error(result.message);
      if (!response.ok) throw new Error("The website could not be converted.");
      if (!active.signal.aborted) setPage(result.page);
    } catch (error) {
      if (!active.signal.aborted) setError(error instanceof Error ? error.message : "Could not reach the converter. Try again.");
    } finally {
      if (!active.signal.aborted) setLoading(false);
    }
  }, [url, layout, content]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Sandboxed srcDoc has an opaque origin. Verify the exact frame window,
      // then validate the small action payload; never accept arbitrary requests.
      if (!iframe.current || event.source !== iframe.current.contentWindow || page?.remake?.content !== "public") return;
      const target = publicActionTarget(event.data, page.remake.kind);
      if (target) { setUrl(target); setLayout("auto"); setContent("public"); void convert(target, "auto", "public"); }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [convert, page]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-amber-300">MUTATE / Retro view</p>
        <h1 className="text-3xl font-bold tracking-tight">The same web. A different decade.</h1>
        <p className="mt-3 max-w-2xl text-neutral-400">What if your favorite website was built in the 90s? Remake its interface with retro layouts, navigation, and playful local interactions.</p>
      </header>

      <fieldset className="mb-6">
        <legend className="mb-3 text-sm text-neutral-300">Choose your era</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {RETRO_STYLES.map(option => <label key={option.id}
            className={`cursor-pointer rounded border p-4 ${style === option.id ? "border-amber-300 bg-amber-300/5" : "border-neutral-700 bg-neutral-900/50 hover:border-neutral-500"}`}>
            <div aria-hidden="true" className={`mb-4 h-14 overflow-hidden border-2 p-2 ${option.id === "web95" ? "border-neutral-400 bg-[#c0c0c0]" : option.id === "portal" ? "border-blue-400 bg-[#061839]" : "border-neutral-300 bg-[#008080]"}`}>
              <div className={`h-2 w-3/4 ${option.id === "web95" ? "bg-neutral-600" : option.id === "portal" ? "bg-yellow-300" : "bg-[#000080]"}`} />
              <div className="mt-2 flex gap-1"><span className="h-5 w-1/4 bg-white/50" /><span className="h-5 w-3/4 bg-white/80" /></div>
            </div>
            <span className="flex items-center gap-2 font-medium"><input type="radio" name="retro-style" value={option.id}
              checked={style === option.id} onChange={() => setStyle(option.id)} className="accent-amber-300" />{option.name}</span>
            <span className="mt-2 block text-sm text-neutral-400">{option.description}</span>
          </label>)}
        </div>
      </fieldset>

      <form onSubmit={event => { event.preventDefault(); void convert(); }} className="mb-3 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-1 flex-col gap-2 text-sm text-neutral-300">
          Website to convert
          <input value={url} onChange={event => setUrl(event.target.value)} required maxLength={4096}
            placeholder="youtube.com, facebook.com, github.com, or another website" spellCheck={false} autoComplete="url"
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-3 text-base text-neutral-100 outline-none focus:border-amber-300" />
        </label>
        <label className="flex flex-col gap-2 text-sm text-neutral-300">Content source
          <select aria-label="Content source" value={content} onChange={event => setContent(event.target.value as ContentMode)}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-3 text-base text-neutral-100">
            <option value="public">Public data</option><option value="sample">Sample design</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-neutral-300">Remake layout
          <select aria-label="Remake layout" value={layout} onChange={event => setLayout(event.target.value as RemakeLayout)}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-3 text-base text-neutral-100">
            <option value="auto">Auto-detect website</option>
            <option value="youtube">Video site</option><option value="facebook">Social network</option>
            <option value="github">Code hosting</option><option value="website">Website · public content</option>
          </select>
        </label>
        <button type="submit" disabled={loading} className="rounded bg-amber-300 px-5 py-3 font-medium text-neutral-950 hover:bg-amber-200 disabled:opacity-50">
          {loading ? "REMAKING…" : "REMAKE WEBSITE"}
        </button>
      </form>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-neutral-400">
        <span>Try a remake:</span>
        {[{ label: "YouTube", url: "https://youtube.com", content: "public" }, { label: "Facebook demo", url: "https://facebook.com", content: "sample" }, { label: "GitHub", url: "https://github.com/octocat/Hello-World", content: "public" }].map(example =>
          <button type="button" key={example.url} disabled={loading} className="underline underline-offset-4 hover:text-neutral-100 disabled:opacity-50"
            onClick={() => { setUrl(example.url); setLayout("auto"); setContent(example.content as ContentMode); void convert(example.url, "auto", example.content as ContentMode); }}>{example.label}</button>)}
      </div>
      <p className="max-w-3xl text-sm text-neutral-500">Public data loads actual YouTube videos and GitHub repository files. A plain YouTube URL starts a public “retro computing” search. Facebook and other layout experiments use Sample design. No account is connected.</p>

      {loading && <p role="status" className="mt-6 font-mono text-sm text-amber-200">Rebuilding the website for another era…{page ? " Your previous preview remains below." : ""}</p>}
      {error && <div role="alert" className="mt-6 rounded border border-amber-800 bg-amber-950/20 p-4 text-sm text-amber-200">
        {error}{page ? " Your previous preview remains below." : ""}<button type="button" onClick={() => void convert()} className="ml-3 underline underline-offset-4">Try again</button>
      </div>}
      {page && <section aria-label="Retro preview" className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div><p role="status" className="font-mono text-sm text-amber-300">SIMULATED · {RETRO_STYLES.find(option => option.id === style)?.name}</p>
            <p className="mt-1 text-sm text-neutral-400">{page.remake?.content === "public" ? "Real public source content · simulated retro layout" : page.remake ? "Interactive design remake · illustrative sample content" : "A creative remake of current public content"}. Change styles instantly above.</p></div>
          <a href={page.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-neutral-300 underline underline-offset-4">Open original website ↗</a>
        </div>
        {page.remake && <p className="mb-3 rounded border border-amber-900 bg-amber-950/20 p-3 text-sm text-amber-200">{page.remake.notice}</p>}
        <p className="mb-3 break-all text-xs text-neutral-500">{page.remake?.content === "sample" ? "Design reference" : "Source"}: {page.sourceUrl} · {page.remake?.content === "sample" ? "Created" : "Retrieved"} {new Date(page.fetchedAt).toLocaleString("en-US", { timeZone: "UTC" })} (UTC){page.truncated ? " · Content shortened" : ""}</p>
        <iframe ref={iframe} title="Retro website preview" srcDoc={preview} sandbox={page.remake ? "allow-scripts allow-popups allow-popups-to-escape-sandbox" : "allow-popups allow-popups-to-escape-sandbox"}
          referrerPolicy="no-referrer" className="h-[85vh] min-h-[540px] w-full rounded border border-neutral-700 bg-white" />
      </section>}
    </div>
  );
}

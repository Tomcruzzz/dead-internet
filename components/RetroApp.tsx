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
  const [useAi, setUseAi] = useState(true);
  const [mobilePreview, setMobilePreview] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const iframe = useRef<HTMLIFrameElement | null>(null);
  const previewSection = useRef<HTMLElement | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (page) previewSection.current?.scrollIntoView({ behavior: "instant", block: "start" });
  }, [page]);
  const preview = useMemo(() => page ? renderRetroPage(page, style) : "", [page, style]);

  const convert = useCallback(async (input = url, requestedLayout = layout, requestedContent = content) => {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(useAi ? "/api/retro/ai" : "/api/retro", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: input.trim(), layout: requestedLayout, content: requestedContent, ...(useAi ? { style } : {}) }),
        signal: AbortSignal.any([active.signal, AbortSignal.timeout(useAi ? 95_000 : 35_000)]),
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
  }, [url, layout, content, useAi, style]);

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
    <div className="retro-studio mx-auto max-w-5xl px-6 py-10">
      <header className="retro-studio-hero mb-8">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-amber-300">MUTATE / Retro view</p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Today&apos;s websites.<br /><span className="text-amber-300">Yesterday&apos;s internet.</span></h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-neutral-400 sm:text-base">Give a familiar corner of the web a new past. Choose how to rebuild it, pick an era, and explore your own alternate internet.</p>
        <div className="mt-5 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-wider text-neutral-500"><span className="studio-tag">Current public content</span><span className="studio-tag">Creative simulation</span><span className="studio-tag">No account needed</span></div>
      </header>

      <fieldset className="engine-picker mb-7 rounded-2xl border border-neutral-800 p-5 sm:p-6" disabled={loading}>
        <legend className="px-2 font-mono text-xs uppercase tracking-widest text-neutral-400">01 / Choose your engine</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`engine-option ${useAi ? "engine-option-ai" : ""}`}><span className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 font-medium text-violet-200"><span aria-hidden="true">✦</span> AI rebuild</span><input type="radio" name="retro-engine" checked={useAi} onChange={() => setUseAi(true)} className="accent-violet-300" /></span><span className="mt-2 block text-sm leading-relaxed text-neutral-400">A layout planned around your page&apos;s content. An old-school look with a little new-school intelligence.</span><span className="mt-4 block font-mono text-[10px] uppercase tracking-widest text-violet-300">Gemini → Groq → classic backup</span></label>
          <label className={`engine-option ${!useAi ? "engine-option-classic" : ""}`}><span className="flex items-center justify-between gap-3"><span className="font-medium text-neutral-200">▣ Classic renderer</span><input type="radio" name="retro-engine" checked={!useAi} onChange={() => setUseAi(false)} className="accent-amber-300" /></span><span className="mt-2 block text-sm leading-relaxed text-neutral-400">Instant, handcrafted templates. Familiar retro layouts, with no AI request required.</span><span className="mt-4 block font-mono text-[10px] uppercase tracking-widest text-amber-300">Fast preview / no AI API needed</span></label>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-neutral-500">{useAi ? "AI receives bounded page text and your theme through Gemini, or Groq if needed. Public content only; no account or private session is accessed. If both are unavailable, a labeled classic preview takes over." : "Classic mode is selected. Choose AI rebuild above for a custom layout plan. Both modes preserve source text and links."}</p>
      </fieldset>

      <fieldset className="mb-7" disabled={loading}>
        <legend className="mb-4 font-mono text-xs uppercase tracking-widest text-neutral-400">02 / Choose your era</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {RETRO_STYLES.map(option => <label key={option.id}
            className={`era-option cursor-pointer rounded-xl border p-4 ${style === option.id ? "border-amber-300 bg-amber-300/5" : "border-neutral-800 bg-neutral-900/50 hover:border-neutral-500"}`}>
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



      <form onSubmit={event => { event.preventDefault(); void convert(); }} className="studio-source mb-4 grid gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 sm:grid-cols-[minmax(0,1fr)_180px] sm:p-6">
        <p className="font-mono text-xs uppercase tracking-widest text-neutral-400 sm:col-span-2">03 / Bring a website</p>
        <label className="flex min-w-0 flex-col gap-2 text-sm text-neutral-300">
          Website URL
          <input value={url} onChange={event => setUrl(event.target.value)} required maxLength={4096}
            placeholder="e.g. youtube.com" spellCheck={false} autoComplete="url" disabled={loading}
            className="min-w-0 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-3 text-base text-neutral-100 outline-none focus:border-amber-300" />
        </label>
        <label className="flex flex-col gap-2 text-sm text-neutral-300">Content source
          <select aria-label="Content source" value={content} onChange={event => setContent(event.target.value as ContentMode)}
            disabled={loading} className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-3 text-base text-neutral-100">
            <option value="public">Public data</option><option value="sample">Sample design</option>
          </select>
        </label>
        <details className="text-sm text-neutral-400 sm:col-span-2"><summary className="w-fit cursor-pointer py-1">Advanced layout options</summary><label className="mt-3 flex max-w-xs flex-col gap-2 text-sm text-neutral-300">Remake layout
          <select aria-label="Remake layout" value={layout} onChange={event => setLayout(event.target.value as RemakeLayout)}
            disabled={loading} className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-3 text-base text-neutral-100">
            <option value="auto">Auto-detect website</option>
            <option value="youtube">Video site</option><option value="facebook">Social network</option>
            <option value="github">Code hosting</option><option value="website">Website · public content</option>
          </select>
        </label><p className="mt-2 text-xs leading-relaxed text-neutral-500">Auto-detect works best for supported websites. AI uses normalized text with its own layout plan.</p></details>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-800 pt-4 sm:col-span-2"><p className="text-xs text-neutral-500">{RETRO_STYLES.find(option => option.id === style)?.name} <span className="mx-1">/</span> {useAi ? "AI rebuild" : "Classic renderer"}</p><button type="submit" disabled={loading} className={`w-full rounded-lg px-6 py-3 text-sm font-semibold text-neutral-950 disabled:opacity-50 sm:w-auto ${useAi ? "bg-violet-200 hover:bg-violet-100" : "bg-amber-300 hover:bg-amber-200"}`}>
          {loading ? (useAi ? "Planning your remake…" : "Building your remake…") : useAi ? "✦ Rebuild with AI →" : "Create retro preview →"}
        </button></div>
      </form>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-neutral-400">
        <span>Try a remake:</span>
        {[{ label: "YouTube", url: "https://youtube.com", content: "public" }, { label: "Facebook demo", url: "https://facebook.com", content: "sample" }, { label: "GitHub", url: "https://github.com/octocat/Hello-World", content: "public" }].map(example =>
          <button type="button" key={example.url} disabled={loading} className="rounded-full border border-neutral-800 px-3 py-1.5 text-xs hover:border-neutral-600 hover:text-neutral-100 disabled:opacity-50"
            onClick={() => { setUrl(example.url); setLayout("auto"); setContent(example.content as ContentMode); void convert(example.url, "auto", example.content as ContentMode); }}>{example.label}</button>)}
      </div>
      <p className="max-w-3xl text-sm text-neutral-500">Public data loads actual YouTube videos and GitHub repository files. A plain YouTube URL starts a public “retro computing” search. Facebook and other layout experiments use Sample design. No account is connected.</p>

      {loading && <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-800 p-4"><p role="status" className="font-mono text-xs text-amber-200">{useAi ? "Reading public content and planning a retro layout…" : "Rebuilding the website for another era…"}{page ? " Your previous preview remains below." : ""}</p><button type="button" className="workspace-link" onClick={() => { controller.current?.abort(); setLoading(false); }}>Cancel</button></div>}
      {error && <div role="alert" className="mt-6 rounded border border-amber-800 bg-amber-950/20 p-4 text-sm text-amber-200">
        {error}{page ? " Your previous preview remains below." : ""}<button type="button" onClick={() => void convert()} className="ml-3 underline underline-offset-4">Try again</button>
      </div>}
      {page && <section ref={previewSection} aria-label="Retro preview" className="mt-8 scroll-mt-5">
        <p role="status" className={`mb-4 rounded-xl border p-4 text-sm font-medium ${page.ai ? "border-violet-400/40 bg-violet-400/10 text-violet-200" : "border-amber-800 bg-amber-950/20 text-amber-200"}`}>{page.ai ? `✦ AI redesign complete · ${page.ai.layout} layout · ${page.ai.provider === "groq" ? "Groq" : "Gemini"}` : page.aiFallback ? "AI was unavailable — showing a classic preview instead." : "Classic preview ready · no AI was used."}</p>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div><p role="status" className="font-mono text-sm text-amber-300">SIMULATED · {RETRO_STYLES.find(option => option.id === style)?.name}</p>
            <p className="mt-1 text-sm text-neutral-400">{page.ai?.sourceMode === "sample" ? "AI layout plan · illustrative sample content" : page.remake?.content === "public" ? "Real public source content · simulated retro layout" : page.remake ? "Interactive design remake · illustrative sample content" : "A creative remake of current public content"}. Change styles instantly above.</p></div>
          <a href={page.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-neutral-300 underline underline-offset-4">Open original website ↗</a>
        </div>
        {page.remake && <p className="mb-3 rounded border border-amber-900 bg-amber-950/20 p-3 text-sm text-amber-200">{page.remake.notice}</p>}
        {page.aiFallback && <p role="status" className="mb-4 rounded-xl border border-amber-800 bg-amber-950/20 p-4 text-sm text-amber-200"><strong>Classic fallback active.</strong> {page.aiFallback}</p>}
        {page.ai && <div className="mb-4 rounded-xl border border-violet-400/30 bg-violet-400/5 p-4"><p className="font-mono text-xs text-violet-200">AI REMAKE · SIMULATED · {page.ai.layout} layout · {page.ai.provider === "groq" ? "Groq backup" : "Google Gemini"} · {page.ai.model}</p><p className="mt-2 text-sm text-neutral-300">{page.ai.rationale}</p><p className="mt-2 text-xs text-neutral-500">AI chose this layout and content order. Text-first preview; source links open the original website. This is not a historical record. Theme changes restyle this plan; rebuild to create a new one.</p></div>}
        <p className="mb-3 break-all text-xs text-neutral-500">{page.remake?.content === "sample" ? "Design reference" : "Source"}: {page.sourceUrl} · {page.remake?.content === "sample" ? "Created" : "Retrieved"} {new Date(page.fetchedAt).toLocaleString("en-US", { timeZone: "UTC" })} (UTC){page.truncated ? " · Content shortened" : ""}</p>
        <div className="preview-browser overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900">
          <div className="flex flex-wrap items-center gap-3 border-b border-neutral-700 px-4 py-3"><span aria-hidden="true" className="flex gap-1.5"><i className="h-2 w-2 rounded-full bg-red-400/60" /><i className="h-2 w-2 rounded-full bg-amber-300/60" /><i className="h-2 w-2 rounded-full bg-lime-300/60" /></span><span className="min-w-0 flex-1 truncate font-mono text-xs text-neutral-500">{page.sourceUrl}</span><div role="group" aria-label="Preview size" className="flex gap-1"><button type="button" aria-pressed={!mobilePreview} onClick={() => setMobilePreview(false)} className={`rounded px-2 py-1 text-xs ${!mobilePreview ? "bg-neutral-700 text-white" : "text-neutral-400"}`}>Full width</button><button type="button" aria-pressed={mobilePreview} onClick={() => setMobilePreview(true)} className={`rounded px-2 py-1 text-xs ${mobilePreview ? "bg-neutral-700 text-white" : "text-neutral-400"}`}>Mobile</button></div></div>
          <div className="overflow-hidden bg-neutral-950/50"><iframe ref={iframe} title="Retro website preview" srcDoc={preview} sandbox={page.remake ? "allow-scripts allow-popups allow-popups-to-escape-sandbox" : "allow-popups allow-popups-to-escape-sandbox"}
          referrerPolicy="no-referrer" className={`mx-auto block h-[80vh] min-h-[540px] w-full border-0 bg-white ${mobilePreview ? "max-w-[390px]" : ""}`} /></div>
        </div>
      </section>}
    </div>
  );
}

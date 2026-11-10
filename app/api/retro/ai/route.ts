import { POST as loadRetro } from "../route";
import { aiRebuild } from "@/lib/retro/ai";
import { historianRequestBody } from "@/lib/historian/validation";
import { historianErrorResponse, HistorianError } from "@/lib/historian/errors";
import type { RetroStyle } from "@/lib/retro/types";

export async function POST(request: Request) {
  try {
    const body = await historianRequestBody(request);
    if (typeof body.url !== "string" || body.url.length > 4096 || !["web95", "portal", "win98"].includes(String(body.style))) throw new HistorianError("invalid_input", "Choose a website and a supported retro style.");
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(85_000)]);
    const source = await loadRetro(new Request(request.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: body.url, content: body.content, layout: body.layout }), signal }));
    const result = await source.json();
    if (!source.ok || result.status !== "ready") return Response.json(result, { status: source.status, headers: { "Cache-Control": "no-store" } });
    try {
      const page = await aiRebuild(result.page, body.style as RetroStyle, signal);
      return Response.json({ status: "ready", page }, { headers: { "Cache-Control": "no-store" } });
    } catch {
      if (request.signal.aborted) throw new HistorianError("provider_unavailable", "The remake request was cancelled.");
      // A working deterministic preview needs no AI service or additional API key.
      return Response.json({ status: "ready", page: { ...result.page,
        aiFallback: "AI planning was unavailable. This preview uses the classic renderer with the retrieved content and your chosen style. No AI-generated plan was applied." } },
        { headers: { "Cache-Control": "no-store" } });
    }
  } catch (error) { return historianErrorResponse(error); }
}

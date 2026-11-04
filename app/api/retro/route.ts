import { fetchPublicPage, retroUrl } from "@/lib/retro/fetch";
import { createRemake, detectRemake } from "@/lib/retro/remake";
import { publicRemake } from "@/lib/retro/public-content";
import { extractRetroPage } from "@/lib/retro/extract";
import { RetroError } from "@/lib/retro/errors";
import type { RetroResponse } from "@/lib/retro/types";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch {
      throw new RetroError("invalid_input", "Enter a website URL to convert.");
    }
    if (!body || typeof body !== "object" || !("url" in body) || typeof body.url !== "string") {
      throw new RetroError("invalid_input", "Enter a website URL to convert.");
    }
    const layout = "layout" in body ? body.layout : "auto";
    if (typeof layout !== "string" || !["auto", "website", "youtube", "facebook", "github"].includes(layout)) {
      throw new RetroError("invalid_input", "Choose a supported remake layout.");
    }
    const url = retroUrl(body.url);
    const content = "content" in body ? body.content : "public";
    if (content !== "public" && content !== "sample") throw new RetroError("invalid_input", "Choose Public data or Sample design.");
    const kind = layout === "auto" ? detectRemake(url) : layout === "website" ? undefined : layout as "youtube" | "facebook" | "github";
    if (kind) {
      const page = content === "sample" ? createRemake(url, kind) : await publicRemake(url, kind, request.signal);
      return Response.json({ status: "ready", page } satisfies RetroResponse, { headers: { "Cache-Control": "no-store" } });
    }
    const source = await fetchPublicPage(body.url, { signal: request.signal });
    const page = extractRetroPage(source.body, source.url, source.contentType);
    return Response.json({ status: "ready", page } satisfies RetroResponse, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const result: RetroResponse = error instanceof RetroError
      ? { status: error.status, message: error.message }
      : { status: "unavailable", message: "The website could not be converted. Try another public page." };
    return Response.json(result, {
      status: result.status === "invalid_input" ? 400 : result.status === "unsupported" ? 422 : 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

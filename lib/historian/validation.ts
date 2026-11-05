import { normalizeUrl, parseRequestedDate } from "../validation";
import { parseCdxTimestamp } from "../wayback";
import { HistorianError } from "./errors";
import type { HistorianContext } from "./types";

export function historianContext(value: unknown): HistorianContext {
  if (!value || typeof value !== "object") throw new HistorianError("invalid_input", "Select an archived capture before asking 404.");
  const data = value as Record<string, unknown>;
  if (typeof data.url !== "string" || data.url.length > 4096 || typeof data.requestedDate !== "string" ||
    data.requestedDate.length > 10 || typeof data.timestamp !== "string" || !/^\d{14}$/.test(data.timestamp)) {
    throw new HistorianError("invalid_input", "A website, requested date and valid archive timestamp are required.");
  }
  try {
    const date = parseCdxTimestamp(data.timestamp);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 19).replace(/\D/g, "") !== data.timestamp) throw new Error("Invalid capture");
    parseRequestedDate(data.requestedDate);
    return { url: normalizeUrl(data.url), requestedDate: data.requestedDate.trim(), timestamp: data.timestamp };
  } catch { throw new HistorianError("invalid_input", "Check the website, requested date and actual capture timestamp."); }
}

export function historianQuestion(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > 1000) {
    throw new HistorianError("invalid_input", "Ask a question of 1–1000 characters about this capture.");
  }
  return value.trim();
}

export function historianOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new HistorianError("invalid_input", "Use 404 from this application's archive view.");
}

export async function historianRequestBody(request: Request): Promise<Record<string, unknown>> {
  historianOrigin(request);
  const reader = request.body?.getReader();
  if (!reader) throw new HistorianError("invalid_input", "A JSON request is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 8192) { await reader.cancel(); throw new HistorianError("too_large", "The 404 request is too large."); }
    chunks.push(value);
  }
  try {
    const buffer = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
    const body: unknown = JSON.parse(new TextDecoder().decode(buffer));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid body");
    return body as Record<string, unknown>;
  } catch { throw new HistorianError("invalid_input", "The 404 request must be a JSON object."); }
}

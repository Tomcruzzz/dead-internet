import "server-only";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { createHash } from "node:crypto";
import { TtlCache } from "../cdx-cache";
import { HistorianError } from "./errors";
import { HISTORIAN_SCHEMA, HISTORIAN_SYSTEM, validateHistorianAnswer } from "./grounding";
import { historianBudget } from "./budget";
import type { EvidencePack, HistorianAvailability, HistorianResult } from "./types";

const DEFAULT_MODEL = "gemini-3.8-flash";
const PROMPT_VERSION = "404-evidence-v1";
export const historianAnswerCache = new TtlCache<HistorianResult>(5 * 60_000, 40);

export function historianAvailability(): HistorianAvailability {
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  return { configured: Boolean(process.env.GEMINI_API_KEY?.trim()), enabled: process.env.AI_HISTORIAN_ENABLED !== "false", model: /^gemini-[a-z0-9.-]+$/.test(model) ? model : DEFAULT_MODEL };
}

export function requireHistorianConfiguration() {
  const availability = historianAvailability();
  if (!availability.enabled) throw new HistorianError("disabled", "404 is disabled on this server. Archive browsing remains available.");
  if (!availability.configured) throw new HistorianError("not_configured", "404 needs a server-side Gemini key. Configure GEMINI_API_KEY in .env.local and restart the server; never enter the key in this page.");
  if (process.env.GEMINI_MODEL && !/^gemini-[a-z0-9.-]+$/.test(process.env.GEMINI_MODEL.trim())) throw new HistorianError("not_configured", "The server's Gemini model configuration is invalid.");
  return availability;
}

export async function askGeminiHistorian(question: string, evidence: EvidencePack, signal?: AbortSignal): Promise<HistorianResult> {
  const { model } = requireHistorianConfiguration();
  const contents = JSON.stringify({ question, evidence });
  const key = createHash("sha256").update(`${PROMPT_VERSION}|${model}|${contents}`).digest("hex");
  const cached = historianAnswerCache.get(key);
  if (cached) return { ...cached, cached: true };
  const configuredLimit = Number(process.env.AI_HISTORIAN_DAILY_LIMIT || 50);
  const dailyLimit = Number.isInteger(configuredLimit) && configuredLimit >= 1 && configuredLimit <= 5000 ? configuredLimit : 50;
  const release = historianBudget.reserve(dailyLimit);
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!.trim(), httpOptions: { timeout: 25_000, retryOptions: { attempts: 1 } } });
    // Count the schema representation too, conservatively covering output-schema overhead.
    const count = await ai.models.countTokens({ model, contents: `${contents}\nResponse schema: ${JSON.stringify(HISTORIAN_SCHEMA)}`,
      config: { systemInstruction: HISTORIAN_SYSTEM, abortSignal: signal } });
    if (!Number.isFinite(count.totalTokens) || count.totalTokens! > 8000) throw new HistorianError("too_large", "The evidence exceeds 404's input budget. Try a smaller capture or question.");
    const response = await ai.models.generateContent({ model, contents, config: {
      systemInstruction: HISTORIAN_SYSTEM, responseMimeType: "application/json", responseJsonSchema: HISTORIAN_SCHEMA,
      maxOutputTokens: 2048, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }, abortSignal: signal,
    } });
    if (response.candidates?.[0]?.finishReason !== "STOP") throw new HistorianError("invalid_answer", "404's response was incomplete or blocked. No partial historical claims were displayed.");
    let parsed: unknown;
    try { parsed = JSON.parse(response.text ?? ""); } catch { throw new HistorianError("invalid_answer", "404 returned an unreadable answer. No unverified analysis was displayed."); }
    const answer = validateHistorianAnswer(parsed, evidence);
    const usage = response.usageMetadata;
    const result: HistorianResult = { status: "answered", answer, evidence, model, generatedAt: new Date().toISOString(), cached: false,
      usage: { inputTokens: usage?.promptTokenCount ?? count.totalTokens!, outputTokens: usage?.candidatesTokenCount ?? 0,
        thinkingTokens: usage?.thoughtsTokenCount ?? 0, totalTokens: usage?.totalTokenCount ?? 0 } };
    historianAnswerCache.set(key, result);
    return result;
  } catch (error) {
    if (error instanceof HistorianError) throw error;
    // Never forward provider error text: it may contain request/credential details.
    const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 0;
    if (status === 429) throw new HistorianError("rate_limited", "Gemini is rate-limited. Please wait before asking 404 again.");
    if (status === 401 || status === 403) throw new HistorianError("provider_unavailable", "Gemini rejected the server credentials or model access. Check the server configuration.");
    throw new HistorianError("provider_unavailable", signal?.aborted ? "404's request was cancelled or timed out." : "Gemini is unavailable or the configured model cannot answer. Try again later; the archive view is unaffected.");
  } finally { release(); }
}

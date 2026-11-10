import "server-only";
import { RETRO_PLAN_SCHEMA, validateRetroPlan } from "./ai-plan";

// Fixed provider endpoint; no client-selected model, host, headers or credentials.
export async function groqRetroPlan(system: string, contents: string, blockCount: number, signal: AbortSignal) {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key || signal.aborted || contents.length > 16_000) throw new Error("Groq unavailable");
  const model = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b";
  if (!["openai/gpt-oss-20b", "openai/gpt-oss-120b"].includes(model)) throw new Error("Unsupported Groq model");
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST", redirect: "error", cache: "no-store",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: contents }],
      max_completion_tokens: 2048, reasoning_effort: "low",
      response_format: { type: "json_schema", json_schema: { name: "retro_plan", strict: true, schema: RETRO_PLAN_SCHEMA } } }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
  });
  if (!response.ok) { await response.body?.cancel(); throw new Error("Groq request failed"); }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Missing Groq response");
  let size = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 65_536) { await reader.cancel(); throw new Error("Groq response too large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  const choice = data.choices?.[0];
  if (choice?.finish_reason !== "stop" || choice.message?.refusal || typeof choice.message?.content !== "string") throw new Error("Incomplete Groq plan");
  return { model, plan: validateRetroPlan(JSON.parse(choice.message.content), blockCount) };
}

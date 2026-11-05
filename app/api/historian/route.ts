import { historianAvailability, requireHistorianConfiguration, askGeminiHistorian } from "@/lib/historian/gemini";
import { loadHistorianEvidence } from "@/lib/historian/evidence";
import { historianRequestBody, historianContext, historianQuestion, historianOrigin } from "@/lib/historian/validation";
import { historianErrorResponse } from "@/lib/historian/errors";

export async function GET(request: Request) {
  try {
    // Reading request headers also prevents Cache Components from prerendering
    // runtime credential availability into a static build response.
    historianOrigin(request);
    return Response.json(historianAvailability(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return historianErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const body = await historianRequestBody(request);
    const context = historianContext(body);
    const question = historianQuestion(body.question);
    requireHistorianConfiguration();
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(55_000)]);
    const evidence = await loadHistorianEvidence(context, { signal });
    const answer = await askGeminiHistorian(question, evidence, signal);
    return Response.json(answer, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return historianErrorResponse(error); }
}

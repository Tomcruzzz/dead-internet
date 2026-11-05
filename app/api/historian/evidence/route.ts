import { loadHistorianEvidence } from "@/lib/historian/evidence";
import { historianRequestBody } from "@/lib/historian/validation";
import { historianErrorResponse } from "@/lib/historian/errors";

export async function POST(request: Request) {
  try {
    const body = await historianRequestBody(request);
    const evidence = await loadHistorianEvidence(body, { signal: AbortSignal.any([request.signal, AbortSignal.timeout(45_000)]) });
    return Response.json({ status: "ready", evidence }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return historianErrorResponse(error); }
}

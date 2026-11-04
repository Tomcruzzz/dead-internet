import { captureTimeline } from "@/lib/timeline";
import { ResurrectError } from "@/lib/errors";
import type { TimelineResponse } from "@/lib/types";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ status: "invalid_input", message: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("url" in body) || !("date" in body) ||
    typeof body.url !== "string" || typeof body.date !== "string" || !("year" in body) || typeof body.year !== "number") {
    return Response.json({ status: "invalid_input", message: "Provide a website, requested date, and timeline year." }, { status: 400 });
  }
  try {
    const result = await captureTimeline({ url: body.url, date: body.date, year: body.year }, { signal: request.signal });
    return Response.json(result satisfies TimelineResponse);
  } catch (error) {
    const result: TimelineResponse = error instanceof ResurrectError
      ? { status: error.status, message: error.message }
      : { status: "archive_unavailable", message: "Could not load the capture timeline." };
    return Response.json(result, { status: result.status === "invalid_input" ? 400 : 502 });
  }
}

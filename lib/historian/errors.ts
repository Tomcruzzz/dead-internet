import type { HistorianErrorStatus } from "./types";

export class HistorianError extends Error {
  constructor(public readonly status: HistorianErrorStatus, message: string) {
    super(message);
    this.name = "HistorianError";
  }
}

export function historianErrorResponse(error: unknown): Response {
  const failure = error instanceof HistorianError ? error : new HistorianError("provider_unavailable", "404 could not complete this request. The archive view is still available.");
  const codes: Record<HistorianErrorStatus, number> = {
    invalid_input: 400, unverified_capture: 409, archive_unavailable: 502, not_configured: 503,
    disabled: 503, rate_limited: 429, provider_unavailable: 502, invalid_answer: 502, too_large: 413,
  };
  return Response.json({ status: failure.status, message: failure.message }, {
    status: codes[failure.status], headers: { "Cache-Control": "no-store", ...(failure.status === "rate_limited" ? { "Retry-After": "60" } : {}) },
  });
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resurrect } from "@/lib/wayback";
import { ResurrectError } from "@/lib/errors";
import type { ResurrectResponse } from "@/lib/types";

// Route Handlers are dynamic (not prerendered/cached) by default; POST in particular
// always runs at request time on the default Node.js runtime. With Cache Components
// enabled, Next 16 disallows `dynamic`/`revalidate`/`fetchCache`/`runtime` segment
// configs, so we set none here and rely on the defaults.

const HTTP_STATUS: Record<string, number> = {
  invalid_input: 400,
  no_snapshot: 200, // a successful "no result" — 200 with a status discriminator
  no_html_snapshot: 200,
  archive_unavailable: 502,
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ status: "invalid_input", message: "Request body must be valid JSON." }, 400);
  }

  const obj = (body ?? null) as Record<string, unknown> | null;
  const url = obj?.url;
  const date = obj?.date;
  if (typeof url !== "string" || typeof date !== "string") {
    return json(
      { status: "invalid_input", message: "Fields 'url' and 'date' are required strings." },
      400,
    );
  }

  try {
    const { snapshot, playback, requestedDate } = await resurrect({ url, date });
    return json(
      {
        status: "found",
        requestedDate,
        snapshot,
        playback,
        source: "Internet Archive Wayback Machine",
      },
      200,
    );
  } catch (e) {
    if (e instanceof ResurrectError) {
      return json({ status: e.status, message: e.message }, HTTP_STATUS[e.status] ?? 500);
    }
    return json(
      { status: "archive_unavailable", message: "Unexpected error during archive lookup." },
      502,
    );
  }
}

function json(body: ResurrectResponse, status: number) {
  return NextResponse.json<ResurrectResponse>(body, { status });
}

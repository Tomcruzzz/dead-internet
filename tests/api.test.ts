import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/resurrect/route";
import { cdxCache } from "@/lib/wayback";

const HEADER = ["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"];

function cdxRows(rows: string[][]) {
  return JSON.stringify([HEADER, ...rows]);
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/resurrect", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as never; // POST expects NextRequest; a plain Request is structurally compatible.
}

function mockCdx(rows: string[][]) {
  const body = rows.length === 0 ? "[]" : cdxRows(rows);
  // A fresh Response per call: resurrect may fetch more than once (www fallback),
  // and a Response body can only be consumed once.
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async () =>
      new Response(body, { status: 200, headers: { "content-type": "application/json" } }) as never,
  );
}

beforeEach(() => {
  cdxCache.clear();
  vi.restoreAllMocks();
});

describe("POST /api/resurrect", () => {
  it("returns found with snapshot + playback URLs", async () => {
    mockCdx([
      ["com,youtube)/", "20070620000000", "http://youtube.com/", "text/html", "200", "d", "1"],
    ]);
    const res = await POST(makeRequest({ url: "youtube.com", date: "2007-06-15" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { status: string; snapshot: { timestamp: string }; playback: { iframeUrl: string } };
    expect(json.status).toBe("found");
    expect(json.snapshot.timestamp).toBe("20070620000000");
    expect(json.playback.iframeUrl).toContain("20070620000000if_");
  });

  it("returns 400 invalid_input for a non-JSON body", async () => {
    const req = new Request("http://localhost/api/resurrect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    }) as never;
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = (await res.json()) as { status: string };
    expect(json.status).toBe("invalid_input");
  });

  it("returns 400 invalid_input for missing fields", async () => {
    const res = await POST(makeRequest({ url: "youtube.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).status).toBe("invalid_input");
  });

  it("returns no_snapshot (200) when the archive has nothing", async () => {
    mockCdx([]);
    const res = await POST(makeRequest({ url: "nope.com", date: "2099-06-15" }));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("no_snapshot");
  });

  it("returns 502 archive_unavailable when fetch throws", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down") as never);
    const res = await POST(makeRequest({ url: "youtube.com", date: "2007-06-15" }));
    expect(res.status).toBe(502);
    expect((await res.json()).status).toBe("archive_unavailable");
  });
});

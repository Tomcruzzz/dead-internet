import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureTimeline, timelineCache } from "@/lib/timeline";
import { POST } from "@/app/api/timeline/route";

const header = ["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"];
const row = (timestamp: string, original = "http://example.com/", mime = "text/html", status = "200") =>
  ["com,example)/", timestamp, original, mime, status, "digest", "10"];
const response = (rows: string[][]) => new Response(JSON.stringify([header, ...rows]));
beforeEach(() => { timelineCache.clear(); vi.restoreAllMocks(); });

describe("monthly timeline", () => {
  it("bounds and collapses its query without changing exact-nearest queries", async () => {
    let query: URL | undefined;
    const fetchImpl: typeof fetch = async input => { query = new URL(String(input)); return response([row("20070615120000")]); };
    const result = await captureTimeline({ url: "example.com", date: "2007-06-15", year: 2007 }, { fetchImpl });
    expect(query!.searchParams.get("collapse")).toBe("timestamp:6");
    expect(query!.searchParams.get("limit")).toBe("13");
    expect(query!.searchParams.getAll("filter")).toEqual(["statuscode:200", "mimetype:text/html"]);
    expect(query!.searchParams.get("from")).toBe("20070101000000");
    expect(result.captures[0].playback.iframeUrl).toContain("20070615120000if_/http://example.com/");
  });
  it("sorts and samples months while excluding invalid or unsafe rows", async () => {
    const fetchImpl: typeof fetch = async () => response([
      row("20070801000000"), row("20070620000000"), row("20070601000000"),
      row("20070231000000"), row("20070501000000", "javascript:alert(1)"),
      row("20070401000000", "http://example.com/", "image/png"),
      row("20070301000000", "http://example.com/", "text/html", "404"),
      row("19950101000000"), row("20990101000000"),
    ]);
    const result = await captureTimeline({ url: "example.com", date: "2007-06-15", year: 2007 }, { fetchImpl });
    expect(result.captures.map(c => c.snapshot.timestamp)).toEqual(["20070601000000", "20070801000000"]);
    expect(result.captures[0].snapshot.distanceDays).toBe(14);
  });
  it("caches raw rows but recalculates distance for a different request date", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => { calls++; return response([row("20070601000000")]); };
    await captureTimeline({ url: "example.com", date: "2007-06-01", year: 2007 }, { fetchImpl });
    const result = await captureTimeline({ url: "example.com", date: "2007-06-15", year: 2007 }, { fetchImpl });
    expect(calls).toBe(1);
    expect(result.captures[0].snapshot.distanceDays).toBe(14);
  });
  it("keeps empty results distinct from archive failures and does not cache failures", async () => {
    const fetchImpl: typeof fetch = async () => { throw new Error("offline"); };
    await expect(captureTimeline({ url: "example.com", date: "2007", year: 2007 }, { fetchImpl })).rejects.toMatchObject({ status: "archive_unavailable" });
    expect(timelineCache.size).toBe(0);
    const result = await captureTimeline({ url: "example.com", date: "2007", year: 2007 }, { fetchImpl: async () => new Response("[]") });
    expect(result.captures).toEqual([]);
    expect(result.truncated).toBe(false);
  });
  it("does not reuse cached rows for another year", async () => {
    const fetchImpl: typeof fetch = async input => {
      const year = new URL(String(input)).searchParams.get("from")!.slice(0, 4);
      return response([row(`${year}0601000000`)]);
    };
    await captureTimeline({ url: "example.com", date: "2007", year: 2007 }, { fetchImpl });
    const result = await captureTimeline({ url: "example.com", date: "2007", year: 2008 }, { fetchImpl });
    expect(result.captures[0].snapshot.timestamp).toBe("20080601000000");
    expect(result.searchWindow).toEqual({ from: "20080101", to: "20081231" });
  });
  it("reports extra upstream rows without returning duplicate months", async () => {
    const fetchImpl: typeof fetch = async () => response(Array.from({ length: 13 }, () => row("20070601000000")));
    const result = await captureTimeline({ url: "example.com", date: "2007", year: 2007 }, { fetchImpl });
    expect(result.truncated).toBe(true);
    expect(result.captures).toHaveLength(1);
  });
});

function request(body: unknown) {
  return new Request("http://localhost/api/timeline", { method: "POST", body: JSON.stringify(body) });
}
describe("POST /api/timeline", () => {
  it.each([null, {}, { url: "example.com", date: "2007" },
    ...[1995, 9999, 2007.5, "2007"].map(year => ({ url: "example.com", date: "2007", year })),
    { url: "example.com", date: "2007-02-31", year: 2007 }, { url: "mailto:a@example.com", date: "2007", year: 2007 }])("rejects invalid input %j before archive access", async body => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const result = await POST(request(body));
    expect(result.status).toBe(400);
    expect((await result.json()).status).toBe("invalid_input");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("returns monthly captures", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => response([row("20070601000000")]));
    const result = await POST(request({ url: "example.com", date: "2007", year: 2007 }));
    expect(result.status).toBe(200);
    expect((await result.json()).captures).toHaveLength(1);
  });
  it("rejects malformed JSON", async () => {
    const result = await POST(new Request("http://localhost/api/timeline", { method: "POST", body: "{" }));
    expect(result.status).toBe(400);
  });
  it("returns an archive error without crashing", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    const result = await POST(request({ url: "example.com", date: "2007", year: 2007 }));
    expect(result.status).toBe(502);
    expect((await result.json()).status).toBe("archive_unavailable");
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import {
  parseCdxTimestamp,
  formatDateForDisplay,
  parseRequestedDate,
  normalizeUrl,
  urlVariants,
  buildPlaybackUrls,
  parseCdxResponse,
  selectClosestSnapshot,
  resurrect,
  cdxCache,
} from "@/lib/wayback";
import { ResurrectError } from "@/lib/errors";
import type { CdxRow } from "@/lib/wayback";

const HEADER = ["urlkey", "timestamp", "original", "mimetype", "statuscode", "digest", "length"];

function row(
  timestamp: string,
  opts: Partial<{ mimetype: string; statuscode: string; original: string }> = {},
): [string, string, string, string, string, string, string] {
  return [
    "com,youtube)/",
    timestamp,
    opts.original ?? "http://youtube.com/",
    opts.mimetype ?? "text/html",
    opts.statuscode ?? "200",
    "d",
    "1",
  ];
}

// CdxRow object helper for selectClosestSnapshot (which consumes objects, not raw arrays).
function objRow(
  timestamp: string,
  opts: Partial<{ mimetype: string; statuscode: string; original: string }> = {},
): CdxRow {
  return {
    urlkey: "com,youtube)/",
    timestamp,
    original: opts.original ?? "http://youtube.com/",
    mimetype: opts.mimetype ?? "text/html",
    statuscode: opts.statuscode ?? "200",
    digest: "d",
    length: "1",
  };
}

function cdxJson(rows: string[][]) {
  return JSON.stringify([HEADER, ...rows]);
}

// Mock fetch returning the given CDX rows (ignores the request URL).
function mockCdx(rows: string[][]): typeof fetch {
  const body = rows.length === 0 ? "[]" : cdxJson(rows);
  return (async () =>
    new Response(body, { status: 200, headers: { "content-type": "application/json" } })) as unknown as typeof fetch;
}

// Mock fetch that returns different responses per call (for www-fallback testing).
function mockCdxSequence(responses: string[][][]): typeof fetch {
  let i = 0;
  return (async () => {
    const rows = responses[Math.min(i, responses.length - 1)];
    i++;
    const body = rows.length === 0 ? "[]" : cdxJson(rows);
    return new Response(body, { status: 200, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
}

beforeEach(() => cdxCache.clear());

describe("parseCdxTimestamp", () => {
  it("parses a 14-digit UTC timestamp", () => {
    expect(parseCdxTimestamp("20070615120905").toISOString()).toBe("2007-06-15T12:09:05.000Z");
  });
  it("pads shorter timestamps with zeros", () => {
    expect(parseCdxTimestamp("20070615").toISOString()).toBe("2007-06-15T00:00:00.000Z");
  });
});

describe("formatDateForDisplay", () => {
  it("formats a UTC date", () => {
    expect(formatDateForDisplay(new Date(Date.UTC(2007, 5, 15)))).toBe("June 15, 2007");
  });
});

describe("parseRequestedDate", () => {
  it("parses YYYY-MM-DD", () => {
    const { date, display } = parseRequestedDate("2007-06-15");
    expect(date.toISOString()).toBe("2007-06-15T00:00:00.000Z");
    expect(display).toBe("June 15, 2007");
  });
  it("defaults month/day for YYYY", () => {
    expect(parseRequestedDate("2007").date.toISOString()).toBe("2007-01-01T00:00:00.000Z");
  });
  it("defaults day for YYYY-MM", () => {
    expect(parseRequestedDate("2007-06").date.toISOString()).toBe("2007-06-01T00:00:00.000Z");
  });
  it("rejects bad format", () => {
    expect(() => parseRequestedDate("not-a-date")).toThrow(ResurrectError);
  });
  it("rejects bad month", () => {
    expect(() => parseRequestedDate("2007-13")).toThrow(ResurrectError);
  });
  it("accepts a far-future date (no_snapshot is decided by the archive, not validation)", () => {
    expect(parseRequestedDate("2099-06-15").date.toISOString()).toBe("2099-06-15T00:00:00.000Z");
  });
});

describe("normalizeUrl", () => {
  it("adds an http scheme when missing", () => {
    expect(normalizeUrl("youtube.com")).toBe("http://youtube.com/");
  });
  it("keeps https", () => {
    expect(normalizeUrl("https://example.com/path")).toBe("https://example.com/path");
  });
  it("rejects empty", () => expect(() => normalizeUrl("")).toThrow(ResurrectError));
  it("rejects a value with no dotted domain", () => {
    expect(() => normalizeUrl("localhost")).toThrow(ResurrectError);
  });
});

describe("urlVariants", () => {
  it("adds a www variant when missing", () => {
    const v = urlVariants("http://youtube.com/");
    expect(v).toContain("http://youtube.com/");
    expect(v).toContain("http://www.youtube.com/");
  });
  it("removes www when present", () => {
    const v = urlVariants("http://www.youtube.com/");
    expect(v).toContain("http://youtube.com/");
  });
});

describe("buildPlaybackUrls", () => {
  it("builds the if_ (iframe) and canonical playback URLs", () => {
    const p = buildPlaybackUrls("20070615120905", "http://youtube.com/");
    expect(p.iframeUrl).toBe("https://web.archive.org/web/20070615120905if_/http://youtube.com/");
    expect(p.canonicalUrl).toBe("https://web.archive.org/web/20070615120905/http://youtube.com/");
  });
});

describe("parseCdxResponse", () => {
  it("parses rows using the header", () => {
    const rows = parseCdxResponse([HEADER, row("20070615120905")]);
    expect(rows).toHaveLength(1);
    expect(rows[0].timestamp).toBe("20070615120905");
    expect(rows[0].original).toBe("http://youtube.com/");
  });
  it("returns [] for a truly empty response", () => {
    expect(parseCdxResponse([])).toEqual([]);
  });
  it("returns [] for a header-only response", () => {
    expect(parseCdxResponse([HEADER])).toEqual([]);
  });
  it("throws on a malformed (non-array) response", () => {
    expect(() => parseCdxResponse({})).toThrow(ResurrectError);
  });
});

describe("selectClosestSnapshot", () => {
  const target = new Date(Date.UTC(2007, 5, 15));
  it("selects the closest capture", () => {
    const rows = [objRow("20070601000000"), objRow("20070620000000"), objRow("20071001000000")];
    expect(selectClosestSnapshot(rows, target)?.row.timestamp).toBe("20070620000000");
  });
  it("breaks ties to the earliest capture", () => {
    const rows = [objRow("20070614120000"), objRow("20070615120000")]; // both 12h from midnight
    expect(selectClosestSnapshot(rows, target)?.row.timestamp).toBe("20070614120000");
  });
  it("filters out non-html and non-200 captures", () => {
    const rows = [
      objRow("20070615120000", { mimetype: "image/jpeg" }),
      objRow("20070620120000", { statuscode: "404" }),
      objRow("20070620120000", { mimetype: "text/html", statuscode: "200" }),
    ];
    const c = selectClosestSnapshot(rows, target);
    expect(c?.row.mimetype).toBe("text/html");
    expect(c?.row.statuscode).toBe("200");
  });
  it("returns undefined when no usable capture exists", () => {
    expect(
      selectClosestSnapshot([objRow("20070615120000", { mimetype: "image/jpeg" })], target),
    ).toBeUndefined();
  });
});

describe("resurrect (mocked CDX)", () => {
  it("finds the closest snapshot and builds playback URLs", async () => {
    const fetchImpl = mockCdx([row("20070601000000"), row("20070620000000"), row("20071001000000")]);
    const r = await resurrect({ url: "youtube.com", date: "2007-06-15" }, { fetchImpl });
    expect(r.snapshot.timestamp).toBe("20070620000000");
    expect(r.snapshot.displayDate).toBe("June 20, 2007");
    expect(r.requestedDate).toBe("June 15, 2007");
    expect(r.snapshot.distanceDays).toBe(5);
    expect(r.playback.iframeUrl).toBe("https://web.archive.org/web/20070620000000if_/http://youtube.com/");
  });

  it("falls back to a www variant when the first returns nothing", async () => {
    const fetchImpl = mockCdxSequence([[], [row("20070620000000", { original: "http://www.youtube.com/" })]]);
    const r = await resurrect({ url: "youtube.com", date: "2007-06-15" }, { fetchImpl });
    expect(r.snapshot.timestamp).toBe("20070620000000");
    expect(r.snapshot.originalUrl).toBe("http://www.youtube.com/");
  });

  it("throws no_snapshot when the archive returns no rows", async () => {
    const fetchImpl = mockCdx([]);
    await expect(
      resurrect({ url: "nope.com", date: "2007-06-15" }, { fetchImpl }),
    ).rejects.toMatchObject({ status: "no_snapshot" });
  });

  it("throws archive_unavailable on a fetch error", async () => {
    const fetchImpl = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    await expect(
      resurrect({ url: "youtube.com", date: "2007-06-15" }, { fetchImpl }),
    ).rejects.toMatchObject({ status: "archive_unavailable" });
  });

  it("throws archive_unavailable on a malformed response", async () => {
    const fetchImpl = (async () => new Response("not json", { status: 200 })) as unknown as typeof fetch;
    await expect(
      resurrect({ url: "youtube.com", date: "2007-06-15" }, { fetchImpl }),
    ).rejects.toMatchObject({ status: "archive_unavailable" });
  });

  it("throws invalid_input for an empty url without calling fetch", async () => {
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return new Response("[]");
    }) as unknown as typeof fetch;
    await expect(
      resurrect({ url: "", date: "2007-06-15" }, { fetchImpl }),
    ).rejects.toMatchObject({ status: "invalid_input" });
    expect(called).toBe(false);
  });
});

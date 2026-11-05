import { beforeEach, describe, expect, it, vi } from "vitest";
import { historianEvidenceCache, loadHistorianEvidence } from "@/lib/historian/evidence";
import { historianContext, historianQuestion, historianRequestBody } from "@/lib/historian/validation";
import { archivedText } from "@/lib/historian/archive-text";
import { validateHistorianAnswer, HISTORIAN_SYSTEM } from "@/lib/historian/grounding";
import type { CdxRow } from "@/lib/wayback";

const context = { url: "youtube.com", requestedDate: "2007-06-15", timestamp: "20070614120959" };
const row: CdxRow = { timestamp: context.timestamp, original: "http://youtube.com/", statuscode: "200", mimetype: "text/html", digest: "DIGEST", length: "100", urlkey: "com,youtube)/" };
const html = Buffer.from('<title>YouTube - Broadcast Yourself</title><body><div id="wm-ipp">Toolbar noise</div><h1>Featured Videos</h1><div>Browse videos shared by members of this website.</div><script>stealSecret()</script><p hidden>Hidden text</p><form>Credentials</form></body>');
const source = { body: html, url: `https://web.archive.org/web/${context.timestamp}id_/http://youtube.com/`, contentType: "text/html", mementoDatetime: "Thu, 14 Jun 2007 12:09:59 GMT" };
beforeEach(() => { historianEvidenceCache.clear(); });

describe("historian evidence boundary", () => {
  it("verifies the exact capture and fetches only bounded Wayback text", async () => {
    const query = vi.fn(async () => [row]);
    const fetchPage = vi.fn(async () => source);
    const evidence = await loadHistorianEvidence(context, { query, fetchPage });
    expect(query.mock.calls[0]).toBeDefined();
    expect(evidence.coverage).toBe("archive_text");
    expect(evidence.context.captureDate).toBe("June 14, 2007");
    expect(evidence.context.requestedDisplayDate).toBe("June 15, 2007");
    expect(evidence.sources[0].url).toBe(`https://web.archive.org/web/${context.timestamp}/http://youtube.com/`);
    const text = evidence.sources.map(source => source.excerpt).join(" ");
    expect(text).toContain("Browse videos shared by members");
    expect(text).not.toMatch(/stealSecret|Hidden text|Credentials|Toolbar noise/);
  });
  it("rejects a capture that CDX cannot confirm instead of trusting client metadata", async () => {
    const fetchPage = vi.fn(async () => source);
    await expect(loadHistorianEvidence(context, { query: async () => [{ ...row, timestamp: "20070615000000" }], fetchPage }))
      .rejects.toMatchObject({ status: "unverified_capture" });
    expect(fetchPage).not.toHaveBeenCalled();
  });
  it.each([
    { ...source, url: source.url.replace(context.timestamp, "20070615000000") },
    { ...source, url: source.url.replace("web.archive.org", "example.com") },
    { ...source, mementoDatetime: "Fri, 15 Jun 2007 12:09:59 GMT" },
  ])("excludes text when playback cannot be attributed to the selected capture", async response => {
    const evidence = await loadHistorianEvidence(context, { query: async () => [row], fetchPage: async () => response });
    expect(evidence.coverage).toBe("metadata_only");
    expect(evidence.sources).toHaveLength(1);
    expect(evidence.limitations.join(" ")).toContain("excluded");
  });
  it("continues with honest metadata-only coverage when text is unavailable", async () => {
    const evidence = await loadHistorianEvidence(context, { query: async () => [row], fetchPage: async () => { throw new Error("offline"); } });
    expect(evidence.coverage).toBe("metadata_only");
    expect(evidence.limitations.join(" ")).toContain("Only verified capture metadata");
  });
  it("does not cache a client's requested date as capture material", async () => {
    let calls = 0;
    const query = async () => { calls++; return [row]; };
    const first = await loadHistorianEvidence(context, { query, fetchPage: async () => source });
    const second = await loadHistorianEvidence({ ...context, requestedDate: "2007-01-01" }, { query, fetchPage: async () => source });
    expect(calls).toBe(1);
    expect(second.context.requestedDisplayDate).toBe("January 1, 2007");
    expect(second.context.captureDate).toBe(first.context.captureDate);
  });
  it("fails if metadata verification fails", async () => {
    await expect(loadHistorianEvidence(context, { query: async () => { throw new Error("offline"); } })).rejects.toMatchObject({ status: "archive_unavailable" });
  });
  it("bounds text and removes archive error pages", () => {
    const text = archivedText(Buffer.from(`<title>Page</title><body>${"Long archived text. ".repeat(2000)}</body>`), "text/html");
    expect(text.chunks.join("").length).toBeLessThanOrEqual(10_000);
    expect(text.shortened).toBe(true);
    expect(() => archivedText(Buffer.from('<title>Wayback Machine</title><body>This page has not archived a capture. It is not available at the requested date.</body>'), "text/html")).toThrow();
  });
});

describe("historian request/output validation", () => {
  it.each(["20070231000000", "20071301000000", "bad"])("rejects invalid timestamp %s", timestamp => {
    expect(() => historianContext({ ...context, timestamp })).toThrow();
  });
  it("rejects oversized questions, bodies, and cross-origin browser requests", async () => {
    expect(() => historianQuestion("x".repeat(1001))).toThrow();
    await expect(historianRequestBody(new Request("https://app.test/api/historian", { method: "POST", body: "x".repeat(8193) }))).rejects.toMatchObject({ status: "too_large" });
    await expect(historianRequestBody(new Request("https://app.test/api/historian", { method: "POST", headers: { origin: "https://other.test" }, body: "{}" }))).rejects.toMatchObject({ status: "invalid_input" });
  });
  it("requires actual excerpt membership and known IDs, not model-invented citations", async () => {
    const evidence = await loadHistorianEvidence(context, { query: async () => [row], fetchPage: async () => source });
    const valid = { observations: [{ claim: "The page labels a video section.", evidenceId: "E3", quote: "Featured Videos" }], inferences: [], gaps: ["One capture does not establish evolution."] };
    expect(validateHistorianAnswer(valid, evidence).observations).toHaveLength(1);
    expect(() => validateHistorianAnswer({ ...valid, observations: [{ ...valid.observations[0], evidenceId: "E99" }] }, evidence)).toThrow();
    expect(() => validateHistorianAnswer({ ...valid, observations: [{ ...valid.observations[0], quote: "A fabricated quotation" }] }, evidence)).toThrow();
    expect(() => validateHistorianAnswer({ ...valid, observations: [{ ...valid.observations[0], claim: "See https://made-up.test/source" }] }, evidence)).toThrow();
    expect(() => validateHistorianAnswer({ ...valid, summary: "Uncited history" }, evidence)).toThrow();
    expect(HISTORIAN_SYSTEM).toContain("untrusted data");
    expect(HISTORIAN_SYSTEM).toContain("cannot show");
  });
});

// Uses real archive evidence. Gemini runs only when the server has a local key.
import assert from "node:assert/strict";

const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
async function post(path, body) {
  const response = await fetch(new URL(path, base), { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(70_000) });
  return { response, data: await response.json() };
}
const availabilityResponse = await fetch(new URL("/api/historian", base));
assert.equal(availabilityResponse.status, 200);
const availability = await availabilityResponse.json();
assert.equal(typeof availability.configured, "boolean");
assert.equal(Object.hasOwn(availability, "apiKey"), false);

const lookup = await post("/api/resurrect", { url: "youtube.com", date: "2007-06-15" });
assert.equal(lookup.data.status, "found", lookup.data.message);
const context = { url: lookup.data.snapshot.originalUrl, timestamp: lookup.data.snapshot.timestamp, requestedDate: "2007-06-15" };
const evidenceResult = await post("/api/historian/evidence", context);
assert.equal(evidenceResult.response.status, 200, evidenceResult.data.message);
assert.equal(evidenceResult.data.status, "ready");
const evidence = evidenceResult.data.evidence;
assert.equal(evidence.context.timestamp, context.timestamp);
assert.ok(evidence.sources.length >= 1);
assert.ok(evidence.sources.every(source => new URL(source.url).hostname === "web.archive.org"));
assert.ok(evidence.limitations.length > 0);

const invalid = await post("/api/historian", { ...context, timestamp: "invalid", question: "Purpose?" });
assert.equal(invalid.response.status, 400);
const report = { checkedAt: new Date().toISOString(), model: availability.model, capture: context.timestamp,
  coverage: evidence.coverage, excerpts: evidence.sources.length, geminiLive: "not_run" };
const question = "What does this archived page itself show about the website's purpose, and what can it not establish about internet culture? Use exact evidence quotes.";
if (availability.configured && availability.enabled) {
  const result = await post("/api/historian", { ...context, question });
  assert.equal(result.response.status, 200, result.data.message);
  assert.equal(result.data.status, "answered");
  for (const claim of [...result.data.answer.observations, ...result.data.answer.inferences]) {
    const source = result.data.evidence.sources.find(source => source.id === claim.evidenceId);
    assert.ok(source);
    assert.ok(source.excerpt.replace(/\s+/g, " ").includes(claim.quote.replace(/\s+/g, " ")));
  }
  report.geminiLive = "passed";
  report.usage = result.data.usage;
  report.observations = result.data.answer.observations.length;
  report.inferences = result.data.answer.inferences.length;
  report.gaps = result.data.answer.gaps.length;
} else {
  const result = await post("/api/historian", { ...context, question });
  assert.equal(result.response.status, 503);
  assert.ok(["not_configured", "disabled"].includes(result.data.status));
  report.geminiLive = "skipped_no_server_configuration";
  if (process.env.HISTORIAN_SMOKE_REQUIRE_GEMINI === "1") process.exitCode = 1;
}
console.log(JSON.stringify(report, null, 2));

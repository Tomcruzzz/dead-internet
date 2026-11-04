// Real-network acceptance probe. Run against a running app, never as a unit test.
import assert from "node:assert/strict";

const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const report = { checkedAt: new Date().toISOString(), base, checks: [] };

async function check(name, run) {
  const started = Date.now();
  try {
    const detail = await run();
    report.checks.push({ name, passed: true, ms: Date.now() - started, ...detail });
  } catch (error) {
    report.checks.push({ name, passed: false, ms: Date.now() - started, error: error.message });
    process.exitCode = 1;
  }
}

async function lookup(url, date) {
  const response = await fetch(new URL("/api/resurrect", base), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, date }),
    signal: AbortSignal.timeout(60_000),
  });
  return { httpStatus: response.status, data: await response.json() };
}

let found;
await check("homepage", async () => {
  const response = await fetch(base, { signal: AbortSignal.timeout(15_000) });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /DEAD INTERNET/);
  return { httpStatus: response.status };
});
await check("real historical lookup", async () => {
  const { httpStatus, data } = await lookup("youtube.com", "2007-06-15");
  assert.equal(httpStatus, 200);
  assert.equal(data.status, "found", data.message);
  assert.match(data.snapshot.timestamp, /^20070[4-8]\d{8}$/);
  assert.equal(data.source, "Internet Archive Wayback Machine");
  assert.equal(new URL(data.playback.iframeUrl).hostname, "web.archive.org");
  assert.ok(data.playback.iframeUrl.includes(`${data.snapshot.timestamp}if_/`));
  assert.ok(data.playback.canonicalUrl.includes(`${data.snapshot.timestamp}/`));
  found = data;
  return { httpStatus, timestamp: data.snapshot.timestamp, playback: data.playback };
});
await check("unarchived URL", async () => {
  const { httpStatus, data } = await lookup(`dead-internet-${crypto.randomUUID()}.invalid`, "2007-06-15");
  assert.equal(httpStatus, 200);
  assert.equal(data.status, "no_snapshot", data.message);
  return { httpStatus, status: data.status };
});
await check("monthly capture timeline", async () => {
  assert.ok(found, "Historical lookup must succeed before testing the timeline.");
  const response = await fetch(new URL("/api/timeline", base), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: found.snapshot.originalUrl, date: "2007-06-15", year: 2007 }),
    signal: AbortSignal.timeout(60_000),
  });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.status, "found", data.message);
  assert.ok(data.captures.length > 0 && data.captures.length <= 12);
  assert.equal(new Set(data.captures.map(c => c.snapshot.timestamp.slice(0, 6))).size, data.captures.length);
  for (const capture of data.captures) {
    assert.ok(capture.snapshot.timestamp.startsWith("2007"));
    assert.ok(capture.playback.iframeUrl.includes(`${capture.snapshot.timestamp}if_/`));
  }
  return { httpStatus: response.status, samples: data.captures.length, truncated: data.truncated };
});
await check("far future", async () => {
  const { httpStatus, data } = await lookup("youtube.com", "2099-06-15");
  assert.equal(httpStatus, 200);
  assert.equal(data.status, "no_snapshot", data.message);
  return { httpStatus, status: data.status };
});
await check("invalid calendar date", async () => {
  const { httpStatus, data } = await lookup("youtube.com", "2007-02-31");
  assert.equal(httpStatus, 400);
  assert.equal(data.status, "invalid_input");
  return { httpStatus, status: data.status };
});
await check("archive playback HTTP response (not browser rendering)", async () => {
  assert.ok(found, "Historical lookup must succeed before testing playback.");
  const response = await fetch(found.playback.iframeUrl, { signal: AbortSignal.timeout(30_000) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /text\/html/i);
  assert.ok((await response.text()).length > 0);
  return { httpStatus: response.status, finalUrl: response.url };
});
console.log(JSON.stringify(report, null, 2));

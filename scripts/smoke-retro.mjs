import assert from "node:assert/strict";

const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
async function convert(url, content = "public") {
  const response = await fetch(new URL("/api/retro", base), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, content }), signal: AbortSignal.timeout(35_000),
  });
  return { response, data: await response.json() };
}
for (const url of ["https://example.com", "https://www.python.org"]) {
  const { response, data } = await convert(url);
  assert.equal(response.status, 200, data.message);
  assert.equal(data.status, "ready");
  assert.ok(data.page.title.length > 0);
  assert.ok(data.page.blocks.length > 0);
  assert.ok(data.page.blocks.length <= 100);
  assert.equal(data.page.html, undefined);
  console.log(JSON.stringify({ url, status: data.status, title: data.page.title, blocks: data.page.blocks.length, links: data.page.links.length }));
}
for (const url of ["http://127.0.0.1", "http://169.254.169.254", "file:///etc/passwd"]) {
  const { response, data } = await convert(url);
  assert.equal(response.status, 400);
  assert.equal(data.status, "invalid_input");
}
for (const kind of ["youtube", "facebook", "github"]) {
  const { response, data } = await convert(`https://${kind}.com`, "sample");
  assert.equal(response.status, 200);
  assert.equal(data.page.remake.kind, kind);
  assert.equal(data.page.remake.content, "sample");
  console.log(JSON.stringify({ kind, status: data.status, content: data.page.remake.content }));
}
const youtube = await convert("https://www.youtube.com/results?search_query=retro+computing");
assert.equal(youtube.response.status, 200, youtube.data.message);
assert.equal(youtube.data.page.remake.content, "public");
assert.ok(youtube.data.page.remake.videos.length > 0);
for (const video of youtube.data.page.remake.videos) {
  assert.match(video.id, /^[\w-]{11}$/);
  assert.equal(video.url, `https://www.youtube.com/watch?v=${video.id}`);
}
const github = await convert("https://github.com/octocat/Hello-World");
assert.equal(github.response.status, 200, github.data.message);
assert.equal(github.data.page.remake.content, "public");
assert.equal(github.data.page.remake.repository.fullName, "octocat/Hello-World");
assert.match(github.data.page.remake.repository.file.text, /Hello World/);
const actualFile = await convert(github.data.page.remake.repository.entries[0].url);
assert.equal(actualFile.response.status, 200, actualFile.data.message);
assert.match(actualFile.data.page.remake.repository.file.text, /Hello World/);
const facebook = await convert("https://facebook.com");
assert.equal(facebook.response.status, 422);
assert.equal(facebook.data.status, "unsupported");
assert.equal(facebook.data.page, undefined);
console.log(JSON.stringify({ publicVideos: youtube.data.page.remake.videos.length, repository: github.data.page.remake.repository.fullName, actualFile: actualFile.data.page.remake.repository.file.name }));
console.log("Retro conversion and private-address rejection checks passed.");

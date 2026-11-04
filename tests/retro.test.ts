import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPublicPage, publicAddress, retroUrl, type readPage } from "@/lib/retro/fetch";
import { extractRetroPage } from "@/lib/retro/extract";
import { renderRetroPage } from "@/lib/retro/render";
import { RETRO_STYLES } from "@/lib/retro/types";

const html = Buffer.from(`<html><head><title>A &amp; B</title><meta name="description" content="A useful public page."></head><body>
<nav><a href="/about">About us</a><a href="javascript:alert(1)">Bad link</a></nav>
<main><h1>Hello world</h1><p>This public page contains enough readable content to rebuild a useful retro website preview.</p>
<h2>Details</h2><ul><li>First thing</li><li>Second thing</li></ul><blockquote><p>Quoted words</p></blockquote>
<p hidden>Hidden secret</p><div style="display:none"><p>Invisible</p></div>
<script>alert('injected')</script><style>body{background:red}</style><form><input value="password"><p>Login form</p></form>
<a href="../guide">Read guide</a><a href="//other.com/path">External</a></main></body></html>`);
const resolve = async () => [{ address: "93.184.216.34", family: 4 }];
const ok = { status: 200, body: html, contentType: "text/html; charset=utf-8" };
beforeEach(() => vi.restoreAllMocks());

describe("public website conversion fetch", () => {
  it.each(["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1", "2001:db8::1"])("blocks non-public address %s", address => {
    expect(publicAddress(address)).toBe(false);
  });
  it.each(["93.184.216.34", "2606:4700:4700::1111"])("accepts public address %s", address => expect(publicAddress(address)).toBe(true));
  it.each(["http://localhost", "http://127.1", "http://2130706433", "http://[::ffff:127.0.0.1]", "https://example.com:8443", "file:///etc/passwd", "ftp://example.com", "https://user:password@example.com", "http://service.internal"])("rejects unsafe URL %s", url => expect(() => retroUrl(url)).toThrow());
  it("defaults to HTTPS and strips page fragments", () => expect(retroUrl("example.com/page?q=1#section").href).toBe("https://example.com/page?q=1"));
  it("passes only a validated address to the socket reader", async () => {
    const read = vi.fn<typeof readPage>(async () => ok);
    const result = await fetchPublicPage("example.com", { resolve, read });
    expect(read.mock.calls[0][1]).toEqual({ address: "93.184.216.34", family: 4 });
    expect(result.url).toBe("https://example.com/");
  });
  it("blocks mixed public/private DNS answers before opening a socket", async () => {
    const read = vi.fn(async () => ok);
    await expect(fetchPublicPage("example.com", { resolve: async () => [...await resolve(), { address: "127.0.0.1", family: 4 }], read }))
      .rejects.toMatchObject({ status: "invalid_input" });
    expect(read).not.toHaveBeenCalled();
  });
  it("revalidates redirect destinations and prevents private-network redirects", async () => {
    const read = vi.fn(async () => ({ ...ok, status: 302, location: "http://169.254.169.254/latest/meta-data" }));
    await expect(fetchPublicPage("example.com", { resolve, read })).rejects.toMatchObject({ status: "invalid_input" });
    expect(read).toHaveBeenCalledTimes(1);
  });
  it("checks DNS again for redirected hostnames", async () => {
    const read = vi.fn(async () => ({ ...ok, status: 301, location: "https://redirect.com/path" }));
    await expect(fetchPublicPage("example.com", { resolve: async host => host === "redirect.com" ? [{ address: "10.0.0.5", family: 4 }] : resolve(), read }))
      .rejects.toMatchObject({ status: "invalid_input" });
    expect(read).toHaveBeenCalledTimes(1);
  });
  it("bounds redirect loops", async () => {
    const read = vi.fn(async () => ({ ...ok, status: 302, location: "/next" }));
    await expect(fetchPublicPage("example.com", { resolve, read })).rejects.toMatchObject({ status: "unavailable" });
    expect(read).toHaveBeenCalledTimes(5);
  });
  it("keeps provider redirects on their service allowlist", async () => {
    const read = vi.fn(async () => ({ ...ok, status: 302, location: "https://other-public.com/" }));
    await expect(fetchPublicPage("example.com", { resolve, read, allowedHosts: ["example.com"] }))
      .rejects.toMatchObject({ status: "unsupported" });
    expect(read).toHaveBeenCalledTimes(1);
  });
  it("honors caller cancellation before DNS or network activity", async () => {
    const controller = new AbortController(); controller.abort();
    const read = vi.fn(async () => ok);
    await expect(fetchPublicPage("example.com", { resolve, read, signal: controller.signal })).rejects.toMatchObject({ status: "unavailable" });
    expect(read).not.toHaveBeenCalled();
  });
});

describe("semantic extraction and retro rendering", () => {
  it("extracts content and resolves useful links without scripts/forms/hidden text", () => {
    const page = extractRetroPage(html, "https://example.com/path/page");
    expect(page.title).toBe("A & B");
    expect(page.blocks.map(block => block.text).join(" ")).not.toMatch(/Hidden secret|Invisible|injected|Login form/);
    expect(page.blocks.filter(block => block.kind === "item")).toHaveLength(2);
    expect(page.blocks.filter(block => block.text === "Quoted words")).toHaveLength(1);
    expect(page.links).toContainEqual({ label: "Read guide", url: "https://example.com/guide" });
    expect(page.links.some(link => link.url.startsWith("javascript:"))).toBe(false);
  });
  it("rejects JavaScript-only shells rather than making up content", () => {
    expect(() => extractRetroPage(Buffer.from('<title>App</title><body><div id="root"></div><script>boot()</script></body>'), "https://example.com")).toThrow(/readable HTML/);
  });
  it("bounds extracted source content and marks truncation", () => {
    const source = Buffer.from(`<body><main>${Array.from({ length: 110 }, () => '<p>Public content that must survive extraction with clear truncation at the configured limit.</p>').join("")}</main></body>`);
    const page = extractRetroPage(source, "https://example.com");
    expect(page.blocks).toHaveLength(100);
    expect(page.truncated).toBe(true);
  });
  it.each(RETRO_STYLES)("renders $name with escaped content, no active source markup, and explicit provenance", style => {
    const page = extractRetroPage(html, "https://example.com");
    page.title = '</style><script>alert(1)</script>';
    page.blocks.push({ kind: "paragraph", text: '<img src=x onerror="alert(1)">' });
    page.links.push({ label: 'Unsafe <script>', url: 'javascript:alert(1)' });
    const result = renderRetroPage(page, style.id);
    expect(result).toContain("SIMULATED");
    expect(result).toContain("script-src 'none'");
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("<img");
    expect(result).not.toContain('href="javascript:');
    expect(result).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(result).toContain('target="_blank" rel="noopener noreferrer"');
    expect(result).not.toContain('href="about:');
  });
});

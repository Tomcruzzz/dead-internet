import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestOptions, IncomingMessage, ClientRequest } from "node:http";

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));
vi.mock("node:http", () => ({ request: requestMock }));
vi.mock("node:https", () => ({ request: requestMock }));
import { MAX_PAGE_BYTES, readPage } from "@/lib/retro/fetch";

function serve(headers: Record<string, string | undefined>, chunks: Buffer[], status = 200) {
  requestMock.mockImplementation((_url: URL, _options: RequestOptions, callback: (response: IncomingMessage) => void) => {
    const request = new EventEmitter() as ClientRequest;
    request.end = (() => {
      const response = Object.assign(new PassThrough(), { statusCode: status, headers });
      callback(response as unknown as IncomingMessage);
      for (const chunk of chunks) response.write(chunk);
      response.end();
      return request;
    }) as ClientRequest["end"];
    return request;
  });
}
const url = new URL("https://example.com/path");
const address = { address: "93.184.216.34", family: 4 };
beforeEach(() => { requestMock.mockReset(); });

describe("bounded pinned socket reads", () => {
  it("pins the validated IP and requests no compression, cookies, or pooled connection", async () => {
    serve({ "content-type": "text/html" }, [Buffer.from("<html>hello</html>")]);
    const result = await readPage(url, address, new AbortController().signal);
    expect(result.body.toString()).toBe("<html>hello</html>");
    const options = requestMock.mock.calls[0][1];
    expect(options.agent).toBe(false);
    expect(options.headers["Accept-Encoding"]).toBe("identity");
    expect(options.headers.Cookie).toBeUndefined();
    const callback = vi.fn();
    options.lookup("example.com", {}, callback);
    expect(callback).toHaveBeenCalledWith(null, address.address, 4);
  });
  it("rejects large streamed bodies even when Content-Length is missing", async () => {
    serve({ "content-type": "text/html" }, [Buffer.alloc(MAX_PAGE_BYTES), Buffer.from("x")]);
    await expect(readPage(url, address, new AbortController().signal)).rejects.toMatchObject({ status: "unsupported" });
  });
  it.each([
    { "content-type": "application/pdf" },
    { "content-type": "text/html", "content-length": String(MAX_PAGE_BYTES + 1) },
    { "content-type": "text/html", "content-encoding": "gzip" },
  ])("rejects unsupported or oversized response headers %j", async headers => {
    serve(headers, []);
    await expect(readPage(url, address, new AbortController().signal)).rejects.toMatchObject({ status: "unsupported" });
  });
  it("reports site HTTP errors", async () => {
    serve({ "content-type": "text/html" }, [], 403);
    await expect(readPage(url, address, new AbortController().signal)).rejects.toMatchObject({ status: "unavailable", message: expect.stringContaining("403") });
  });
});

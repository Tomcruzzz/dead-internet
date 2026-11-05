import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
import { RetroError } from "./errors";

export const MAX_PAGE_BYTES = 1_500_000;

export function publicAddress(address: string): boolean {
  try { return ipaddr.process(address).range() === "unicast"; } catch { return false; }
}

export function retroUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 4096) throw new RetroError("invalid_input", "Enter a public website URL.");
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch { throw new RetroError("invalid_input", "Enter a valid website URL."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
    (url.port && url.port !== (url.protocol === "https:" ? "443" : "80"))) {
    throw new RetroError("invalid_input", "Use a public HTTP or HTTPS URL without credentials or a custom port.");
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (hostname.includes("%") || (!isIP(hostname) && (!hostname.includes(".") ||
    /\.(localhost|local|internal|test|invalid|example|onion)\.?$/i.test(hostname)))) {
    throw new RetroError("invalid_input", "Only public Internet websites can be converted.");
  }
  if (isIP(hostname) && !publicAddress(hostname)) {
    throw new RetroError("invalid_input", "Only public Internet websites can be converted.");
  }
  url.hash = "";
  return url;
}

export interface PageResponse {
  status: number;
  location?: string;
  contentType: string;
  body: Buffer;
  mementoDatetime?: string;
}

export interface ReadPolicy {
  maxBytes?: number;
  accept?: string;
  contentTypes?: string[];
}

// Pin a validated DNS address so the socket cannot resolve to a different/private IP.
export async function readPage(url: URL, address: LookupAddress, signal: AbortSignal, policy: ReadPolicy = {}): Promise<PageResponse> {
  const maxBytes = Math.min(policy.maxBytes ?? MAX_PAGE_BYTES, 5_000_000);
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(url, {
      agent: false,
      signal,
      family: address.family,
      lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
      headers: {
        Accept: policy.accept ?? "text/html,application/xhtml+xml;q=0.9",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
        "User-Agent": "DeadInternetRetro/0.1 (public page preview)",
      },
    }, response => {
      const status = response.statusCode ?? 502;
      const contentType = response.headers["content-type"] ?? "";
      if (status >= 300 && status < 400) {
        response.destroy();
        resolve({ status, contentType, location: response.headers.location, body: Buffer.alloc(0) });
        return;
      }
      if (status < 200 || status >= 300) {
        response.destroy();
        reject(new RetroError("unavailable", `The website returned HTTP ${status}. Try another public page.`));
        return;
      }
      const mime = contentType.split(";")[0].trim().toLowerCase();
      if (!(policy.contentTypes ?? ["text/html", "application/xhtml+xml"]).includes(mime)) {
        response.destroy();
        reject(new RetroError("unsupported", "This URL does not return an HTML webpage."));
        return;
      }
      if (response.headers["content-encoding"] && response.headers["content-encoding"] !== "identity") {
        response.destroy();
        reject(new RetroError("unsupported", "This website returned an unsupported compressed response. Try another page."));
        return;
      }
      if (Number(response.headers["content-length"]) > maxBytes) {
        response.destroy();
        reject(new RetroError("unsupported", "This page is too large to convert. Try a smaller page."));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > maxBytes) {
          response.destroy(new RetroError("unsupported", "This page is too large to convert. Try a smaller page."));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => resolve({ status, contentType, body: Buffer.concat(chunks),
        ...(typeof response.headers["memento-datetime"] === "string" ? { mementoDatetime: response.headers["memento-datetime"] } : {}),
      }));
      response.on("error", reject);
    });
    request.on("error", reject);
    request.end();
  });
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    if (signal.aborted) { abort(); return; }
    signal.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

export async function fetchPublicPage(input: string, options: {
  signal?: AbortSignal;
  resolve?: (hostname: string) => Promise<LookupAddress[]>;
  read?: typeof readPage;
  policy?: ReadPolicy;
  allowedHosts?: string[];
} = {}): Promise<{ body: Buffer; url: string; contentType: string; mementoDatetime?: string }> {
  let url = retroUrl(input);
  const signal = AbortSignal.any([AbortSignal.timeout(20_000), ...(options.signal ? [options.signal] : [])]);
  try {
    for (let redirect = 0; redirect <= 4; redirect++) {
      signal.throwIfAborted();
      if (options.allowedHosts && !options.allowedHosts.includes(url.hostname)) {
        throw new RetroError("unsupported", "The public source redirected outside its supported service. No account or consent pages are loaded.");
      }
      const hostname = url.hostname.replace(/^\[|\]$/g, "");
      const addresses = isIP(hostname)
        ? [{ address: hostname, family: isIP(hostname) }]
        : await abortable((options.resolve ?? (host => lookup(host, { all: true })))(hostname), signal);
      if (!addresses.length || addresses.some(address => !publicAddress(address.address))) {
        throw new RetroError("invalid_input", "Only public Internet websites can be converted.");
      }
      // Prefer IPv4 where available; the Host header and TLS name remain the source hostname.
      const address = addresses.find(address => address.family === 4) ?? addresses[0];
      const result = await (options.read ?? readPage)(url, address, signal, options.policy);
      if (result.status >= 300 && result.status < 400) {
        if (!result.location || redirect === 4) throw new RetroError("unavailable", "The website redirected too many times or returned an invalid redirect.");
        url = retroUrl(new URL(result.location, url).toString());
        continue;
      }
      return { body: result.body, url: url.toString(), contentType: result.contentType,
        ...(result.mementoDatetime ? { mementoDatetime: result.mementoDatetime } : {}),
      };
    }
    throw new RetroError("unavailable", "The website could not be loaded.");
  } catch (error) {
    if (error instanceof RetroError) throw error;
    if (signal.aborted) throw new RetroError("unavailable", "The website took too long to respond. Try again or choose another page.");
    throw new RetroError("unavailable", "Could not load this website. It may block automated access or be offline.");
  }
}

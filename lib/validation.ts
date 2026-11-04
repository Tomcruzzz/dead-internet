import { invalidInput } from "./errors";

export function formatDateForDisplay(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}


export interface ParsedRequestedDate {
  date: Date;
  display: string;
}

/** Parse a user date (YYYY | YYYY-MM | YYYY-MM-DD) into a target Date + display string. */
export function parseRequestedDate(input: string): ParsedRequestedDate {
  const trimmed = input.trim();
  if (!trimmed) throw invalidInput("Date is required.");
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(trimmed);
  if (!m) throw invalidInput("Invalid date. Use YYYY, YYYY-MM, or YYYY-MM-DD.");
  const year = Number(m[1]);
  const month = m[2] ? Number(m[2]) : 1;
  const day = m[3] ? Number(m[3]) : 1;
  if (month < 1 || month > 12) throw invalidInput("Invalid month.");
  if (day < 1 || day > 31) throw invalidInput("Invalid day.");
  if (year < 1900) throw invalidInput("Invalid year.");
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) throw invalidInput("Invalid date.");
  return { date, display: formatDateForDisplay(date) };
}

/** Normalize a user-entered URL: default scheme, require a dotted domain. */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw invalidInput("URL is required.");
  if (/^[a-z][a-z\d+.-]*:(?!\d+(?:[/?#]|$))/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    throw invalidInput("Invalid URL: use an HTTP or HTTPS website.");
  }
  let withScheme = trimmed;
  if (!/^https?:\/\//i.test(withScheme)) withScheme = "http://" + withScheme;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw invalidInput("Invalid URL: could not be parsed.");
  }
  if (parsed.username || parsed.password) {
    throw invalidInput("Invalid URL: credentials are not supported.");
  }
  if (!parsed.hostname || !parsed.hostname.includes(".")) {
    throw invalidInput("Invalid URL: must include a domain name.");
  }
  // Fragments identify locations within a document and are never sent to servers.
  parsed.hash = "";
  return parsed.toString();
}


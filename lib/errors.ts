import type { ResurrectStatus } from "./types";

type ErrorStatus = Extract<
  ResurrectStatus,
  "no_snapshot" | "archive_unavailable" | "invalid_input" | "no_html_snapshot"
>;

/**
 * Typed error thrown by the resurrect pipeline. The API route converts these into
 * the discriminated ResurrectResponse shape; nothing is ever thrown to the client.
 */
export class ResurrectError extends Error {
  constructor(
    public readonly status: ErrorStatus,
    message: string,
  ) {
    super(message);
    this.name = "ResurrectError";
  }
}

export const invalidInput = (message: string) => new ResurrectError("invalid_input", message);
export const noSnapshot = (message: string) => new ResurrectError("no_snapshot", message);
export const archiveUnavailable = (message: string) =>
  new ResurrectError("archive_unavailable", message);
export const noHtmlSnapshot = (message: string) => new ResurrectError("no_html_snapshot", message);

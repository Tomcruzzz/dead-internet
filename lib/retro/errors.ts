export class RetroError extends Error {
  constructor(public readonly status: "invalid_input" | "unavailable" | "unsupported", message: string) {
    super(message);
    this.name = "RetroError";
  }
}

import "server-only";
import { HistorianError } from "./errors";

// Prototype instance-local limits, not a durable or global monetary cap.
export class HistorianBudget {
  private day = "";
  private daily = 0;
  private minute = 0;
  private minuteCalls = 0;
  private active = 0;
  reserve(dailyLimit = 50): () => void {
    const now = Date.now();
    const day = new Date(now).toISOString().slice(0, 10);
    const minute = Math.floor(now / 60_000);
    if (this.day !== day) { this.day = day; this.daily = 0; }
    if (this.minute !== minute) { this.minute = minute; this.minuteCalls = 0; }
    if (this.active >= 2 || this.daily >= dailyLimit || this.minuteCalls >= 6) throw new HistorianError("rate_limited", "404's prototype request limit has been reached. Wait before retrying; archive browsing is unaffected.");
    this.active++; this.daily++; this.minuteCalls++;
    let released = false;
    return () => { if (!released) { released = true; this.active--; } };
  }
}
export const historianBudget = new HistorianBudget();

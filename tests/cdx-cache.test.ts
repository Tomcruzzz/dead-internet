import { afterEach, describe, expect, it, vi } from "vitest";
import { TtlCache } from "@/lib/cdx-cache";

afterEach(() => vi.useRealTimers());

describe("TtlCache", () => {
  it("expires at the TTL boundary", () => {
    vi.useFakeTimers();
    const cache = new TtlCache<number>(100);
    cache.set("a", 1);
    vi.advanceTimersByTime(100);
    expect(cache.get("a")).toBeUndefined();
  });

  it("removes expired entries when writing a different key", () => {
    vi.useFakeTimers();
    const cache = new TtlCache<number>(100);
    cache.set("a", 1);
    cache.set("b", 2);
    vi.advanceTimersByTime(100);
    cache.set("c", 3);
    expect(cache.size).toBe(1);
    expect(cache.get("c")).toBe(3);
  });

  it("evicts the oldest entry at capacity and refreshes overwritten entries", () => {
    const cache = new TtlCache<number>(1000, 2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("a", 3);
    cache.set("c", 4);
    expect(cache.size).toBe(2);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(3);
    expect(cache.get("c")).toBe(4);
  });
});

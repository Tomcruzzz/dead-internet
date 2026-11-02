// Tiny in-memory TTL cache for CDX responses. CDX snapshots are immutable for a
// given timestamp, so caching the index rows for a short window is safe and keeps
// repeat demo requests off the archive API.

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache<T> {
  private store = new Map<string, Entry<T>>();

  constructor(private ttlMs = 15 * 60 * 1000, private maxEntries = 100) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) {
      throw new RangeError("maxEntries must be a positive integer.");
    }
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now >= entry.expiresAt) this.store.delete(key);
    }
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.prune();
    this.store.delete(key);
    if (this.store.size >= this.maxEntries) {
      this.store.delete(this.store.keys().next().value!);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    this.prune();
    return this.store.size;
  }
}

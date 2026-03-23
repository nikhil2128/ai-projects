interface CacheEntry {
  value: string;
  expiresAt: number;
}

/**
 * LRU cache with TTL expiration. Uses a Map which preserves insertion order
 * in JS, giving O(1) get/set/delete with LRU eviction semantics.
 *
 * This eliminates DB lookups for hot URLs — the primary path for redirect
 * latency optimization.
 */
export class LRUCache {
  private cache: Map<string, CacheEntry>;
  private readonly maxSize: number;
  private readonly ttlMs: number;

  private hits = 0;
  private misses = 0;

  constructor(maxSize: number, ttlMs: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: string): string | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    // Move to end (most recently used) by re-inserting
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.value;
  }

  set(key: string, value: string): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict least recently used (first entry in Map)
      const oldest = this.cache.keys().next().value!;
      this.cache.delete(oldest);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  get size(): number {
    return this.cache.size;
  }

  get stats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
    };
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

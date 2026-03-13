/**
 * Token-bucket rate limiter per client IP.
 * No external dependency — lightweight and sufficient for single-instance deployment.
 * For multi-instance deployments, swap to a Redis-backed limiter.
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private readonly maxTokens: number;
  private readonly windowMs: number;
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(maxTokens: number, windowMs: number) {
    this.maxTokens = maxTokens;
    this.windowMs = windowMs;

    // Purge stale buckets every 5 minutes to prevent memory leaks
    this.cleanupTimer = setInterval(() => this.cleanup(), 300_000);
    this.cleanupTimer.unref();
  }

  /**
   * Returns true if the request should be allowed, false if rate limited.
   */
  consume(key: string): { allowed: boolean; remaining: number; retryAfterMs: number } {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    const elapsed = now - bucket.lastRefill;
    const refillRate = this.maxTokens / this.windowMs;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + elapsed * refillRate);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterMs: 0 };
    }

    const retryAfterMs = Math.ceil((1 - bucket.tokens) / refillRate);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.windowMs * 2;
    for (const [key, bucket] of this.buckets) {
      if (bucket.lastRefill < cutoff) {
        this.buckets.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.buckets.clear();
  }
}

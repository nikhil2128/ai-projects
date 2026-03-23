export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

const DEFAULTS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 15_000,
  backoffFactor: 2,
};

function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("econnrefused") ||
      msg.includes("econnreset") ||
      msg.includes("etimedout") ||
      msg.includes("socket hang up") ||
      msg.includes("network") ||
      msg.includes("timeout") ||
      msg.includes("deadlock") ||
      msg.includes("too many connections") ||
      msg.includes("connection terminated") ||
      msg.includes("could not connect") ||
      msg.includes("503") ||
      msg.includes("502") ||
      msg.includes("429")
    );
  }
  return false;
}

function computeDelay(attempt: number, opts: RetryOptions): number {
  const delay = opts.baseDelayMs * Math.pow(opts.backoffFactor, attempt);
  const jitter = delay * 0.2 * Math.random();
  return Math.min(delay + jitter, opts.maxDelayMs);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULTS, ...options };
  const shouldRetry = opts.shouldRetry ?? ((err) => isTransientError(err));

  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt >= opts.maxRetries || !shouldRetry(err, attempt)) {
        throw err;
      }

      const delay = computeDelay(attempt, opts);
      opts.onRetry?.(err, attempt + 1, delay);
      await sleep(delay);
    }
  }

  throw lastError;
}

export { isTransientError };

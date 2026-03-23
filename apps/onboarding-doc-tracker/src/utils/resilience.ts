export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryAfterMs?: number;
  isRetryable?: (error: unknown) => boolean;
}

const DEFAULT_RETRY: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 15_000,
};

export class RetryableError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly retryAfterMs?: number
  ) {
    super(message);
    this.name = 'RetryableError';
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === opts.maxAttempts) break;
      if (opts.isRetryable && !opts.isRetryable(error)) break;

      let delay: number;
      if (error instanceof RetryableError && error.retryAfterMs) {
        delay = Math.min(error.retryAfterMs, opts.maxDelayMs);
      } else {
        delay = Math.min(
          opts.baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * opts.baseDelayMs,
          opts.maxDelayMs
        );
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Runs an async function over each item with bounded concurrency.
 * Unlike Promise.all, this limits how many items are in-flight simultaneously
 * to avoid overwhelming downstream APIs.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      try {
        const value = await fn(items[index], index);
        results[index] = { status: 'fulfilled', value };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );

  await Promise.all(workers);
  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

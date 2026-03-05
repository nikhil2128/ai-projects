import { LogLevel, LOG_LEVEL_LABELS } from '../types.js';
import type { LogEntry, LogTransport, TransportConfig } from '../types.js';

export interface HttpTransportConfig extends TransportConfig {
  url: string;
  headers?: Record<string, string>;
  method?: 'POST' | 'PUT';

  /**
   * Transform a batch of log entries into the body payload the target
   * service expects. Return any JSON-serialisable value.
   *
   * Examples:
   *  - New Relic Log API expects `[{ common: {}, logs: [...] }]`
   *  - Splunk HEC expects `{ event: ... }` per line (NDJSON)
   *  - A custom API might accept `{ entries: [...] }`
   *
   * When omitted a sensible default JSON array is used.
   */
  formatter?: (entries: LogEntry[]) => unknown;

  /**
   * If `true`, the formatter returns one string per entry and the body is
   * sent as newline-delimited JSON (NDJSON) — required by Splunk HEC, Loki,
   * and similar systems.
   */
  ndjson?: boolean;

  /** Max entries to hold before auto-flushing. Default: 50 */
  batchSize?: number;
  /** Max milliseconds to wait before flushing a partial batch. Default: 5 000 */
  flushIntervalMs?: number;
  /** Number of retry attempts on transient HTTP failures. Default: 2 */
  retries?: number;
  /** Per-request timeout in milliseconds. Default: 10 000 */
  timeoutMs?: number;
}

function defaultFormatter(entries: LogEntry[]): unknown {
  return entries.map((e) => ({
    timestamp: e.timestamp.toISOString(),
    level: LOG_LEVEL_LABELS[e.level as Exclude<LogLevel, LogLevel.SILENT>],
    message: e.message,
    ...(e.context && { context: e.context }),
    ...(e.traceId && { traceId: e.traceId }),
    ...(e.metadata && { metadata: e.metadata }),
    ...(e.error && {
      error: {
        name: e.error.name,
        message: e.error.message,
        stack: e.error.stack,
      },
    }),
  }));
}

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

export class HttpTransport implements LogTransport {
  readonly name: string;

  private url: string;
  private method: 'POST' | 'PUT';
  private headers: Record<string, string>;
  private formatter: (entries: LogEntry[]) => unknown;
  private ndjson: boolean;
  private level: LogLevel;

  private batchSize: number;
  private flushIntervalMs: number;
  private retries: number;
  private timeoutMs: number;

  private buffer: LogEntry[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(config: HttpTransportConfig) {
    this.name = `http:${new URL(config.url).hostname}`;
    this.url = config.url;
    this.method = config.method ?? 'POST';
    this.headers = { 'Content-Type': 'application/json', ...config.headers };
    this.formatter = config.formatter ?? defaultFormatter;
    this.ndjson = config.ndjson ?? false;
    this.level = config.level ?? LogLevel.DEBUG;

    this.batchSize = config.batchSize ?? 50;
    this.flushIntervalMs = config.flushIntervalMs ?? 5_000;
    this.retries = config.retries ?? 2;
    this.timeoutMs = config.timeoutMs ?? 10_000;

    this.startTimer();
  }

  log(entry: LogEntry): void {
    if (entry.level < this.level) return;
    this.buffer.push(entry);

    if (this.buffer.length >= this.batchSize) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0);
    await this.send(batch);
  }

  async shutdown(): Promise<void> {
    this.stopTimer();
    await this.flush();
  }

  private startTimer(): void {
    if (this.flushIntervalMs > 0) {
      this.timer = setInterval(() => void this.flush(), this.flushIntervalMs);
      if (typeof this.timer === 'object' && 'unref' in this.timer) {
        this.timer.unref();
      }
    }
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async send(entries: LogEntry[]): Promise<void> {
    const body = this.ndjson
      ? (this.formatter(entries) as unknown[]).map((e) => JSON.stringify(e)).join('\n')
      : JSON.stringify(this.formatter(entries));

    let lastError: unknown;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
          const res = await fetch(this.url, {
            method: this.method,
            headers: this.headers,
            body,
            signal: controller.signal,
          });

          if (res.ok) return;

          if (!RETRYABLE_STATUS_CODES.has(res.status)) {
            console.error(
              `[HttpTransport] Non-retryable HTTP ${res.status} from ${this.url}`,
            );
            return;
          }

          lastError = new Error(`HTTP ${res.status}`);
        } finally {
          clearTimeout(timeout);
        }
      } catch (err) {
        lastError = err;
      }

      if (attempt < this.retries) {
        await sleep(exponentialBackoff(attempt));
      }
    }

    console.error(
      `[HttpTransport] Failed after ${this.retries + 1} attempts to ${this.url}:`,
      lastError,
    );
  }
}

function exponentialBackoff(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 30_000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

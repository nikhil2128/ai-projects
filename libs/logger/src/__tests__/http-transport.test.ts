import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpTransport } from '../transports/http.transport.js';
import { LogLevel } from '../types.js';
import type { LogEntry } from '../types.js';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    level: LogLevel.INFO,
    message: 'test',
    timestamp: new Date('2025-01-15T10:30:00.000Z'),
    ...overrides,
  };
}

describe('HttpTransport', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 200 }),
    );
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('buffers entries and flushes on batchSize', async () => {
    const transport = new HttpTransport({
      url: 'https://logs.example.com/ingest',
      batchSize: 2,
      flushIntervalMs: 0,
    });

    transport.log(makeEntry({ message: 'one' }));
    expect(fetchSpy).not.toHaveBeenCalled();

    transport.log(makeEntry({ message: 'two' }));

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchSpy).toHaveBeenCalledOnce();

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body).toHaveLength(2);
    expect(body[0].message).toBe('one');
    expect(body[1].message).toBe('two');

    await transport.shutdown();
  });

  it('sends to the configured URL with headers', async () => {
    const transport = new HttpTransport({
      url: 'https://logs.example.com/v1',
      headers: { 'Api-Key': 'secret' },
      batchSize: 1,
      flushIntervalMs: 0,
    });

    transport.log(makeEntry());
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://logs.example.com/v1',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Api-Key': 'secret' }),
      }),
    );

    await transport.shutdown();
  });

  it('uses a custom formatter', async () => {
    const transport = new HttpTransport({
      url: 'https://newrelic.example.com/log/v1',
      batchSize: 1,
      flushIntervalMs: 0,
      formatter: (entries) => ({
        logs: entries.map((e) => ({ msg: e.message })),
      }),
    });

    transport.log(makeEntry({ message: 'custom' }));
    await vi.advanceTimersByTimeAsync(0);

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.logs[0].msg).toBe('custom');

    await transport.shutdown();
  });

  it('respects level filter', async () => {
    const transport = new HttpTransport({
      url: 'https://logs.example.com',
      level: LogLevel.ERROR,
      batchSize: 1,
      flushIntervalMs: 0,
    });

    transport.log(makeEntry({ level: LogLevel.INFO }));
    transport.log(makeEntry({ level: LogLevel.ERROR }));
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchSpy).toHaveBeenCalledOnce();

    await transport.shutdown();
  });

  it('flush sends buffered entries immediately', async () => {
    const transport = new HttpTransport({
      url: 'https://logs.example.com',
      batchSize: 100,
      flushIntervalMs: 0,
    });

    transport.log(makeEntry());
    await transport.flush();

    expect(fetchSpy).toHaveBeenCalledOnce();

    await transport.shutdown();
  });

  it('shutdown flushes remaining entries', async () => {
    const transport = new HttpTransport({
      url: 'https://logs.example.com',
      batchSize: 100,
      flushIntervalMs: 0,
    });

    transport.log(makeEntry({ message: 'final' }));
    await transport.shutdown();

    expect(fetchSpy).toHaveBeenCalledOnce();
    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body[0].message).toBe('final');
  });

  it('retries on 5xx errors', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    const transport = new HttpTransport({
      url: 'https://logs.example.com',
      batchSize: 1,
      retries: 1,
      flushIntervalMs: 0,
    });

    transport.log(makeEntry());
    await vi.advanceTimersByTimeAsync(10_000);

    expect(fetchSpy).toHaveBeenCalledTimes(2);

    await transport.shutdown();
  });

  it('does not retry on 4xx errors', async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 400 }));

    const transport = new HttpTransport({
      url: 'https://logs.example.com',
      batchSize: 1,
      retries: 2,
      flushIntervalMs: 0,
    });

    transport.log(makeEntry());
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchSpy).toHaveBeenCalledOnce();

    await transport.shutdown();
  });
});

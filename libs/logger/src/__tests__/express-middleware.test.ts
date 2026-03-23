import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestLogger } from '../middleware/express.middleware.js';
import { Logger } from '../logger.js';
import { LogLevel } from '../types.js';
import type { LogEntry, LogTransport } from '../types.js';

function createMockTransport(): LogTransport & { entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  return {
    name: 'mock',
    entries,
    log: vi.fn((entry: LogEntry) => entries.push(entry)),
  };
}

function createMockReqRes(overrides: {
  method?: string;
  url?: string;
  statusCode?: number;
} = {}) {
  const closeHandlers: (() => void)[] = [];
  const req = {
    method: overrides.method ?? 'GET',
    url: overrides.url ?? '/api/test',
    headers: {} as Record<string, string | string[] | undefined>,
    ip: '127.0.0.1',
  };
  const res = {
    statusCode: overrides.statusCode ?? 200,
    on: vi.fn((event: string, cb: () => void) => {
      if (event === 'close') closeHandlers.push(cb);
    }),
    setHeader: vi.fn(),
    getHeader: vi.fn(() => undefined),
  };
  const next = vi.fn();

  return {
    req,
    res,
    next,
    triggerClose: () => closeHandlers.forEach((h) => h()),
  };
}

describe('requestLogger middleware', () => {
  let transport: ReturnType<typeof createMockTransport>;
  let logger: Logger;

  beforeEach(() => {
    transport = createMockTransport();
    logger = new Logger({ transports: [transport], level: LogLevel.DEBUG });
  });

  it('logs the incoming request and response', () => {
    const mw = requestLogger({ logger });
    const { req, res, next, triggerClose } = createMockReqRes();

    mw(req, res, next);
    expect(next).toHaveBeenCalled();

    expect(transport.entries).toHaveLength(1);
    expect(transport.entries[0].message).toBe('Incoming request');
    expect(transport.entries[0].metadata).toEqual(
      expect.objectContaining({ method: 'GET', url: '/api/test' }),
    );

    triggerClose();

    expect(transport.entries).toHaveLength(2);
    expect(transport.entries[1].message).toBe('Request completed');
    expect(transport.entries[1].metadata).toEqual(
      expect.objectContaining({ statusCode: 200 }),
    );
    expect(transport.entries[1].metadata!.durationMs).toBeDefined();
  });

  it('logs WARN for 4xx responses', () => {
    const mw = requestLogger({ logger });
    const { req, res, next, triggerClose } = createMockReqRes({ statusCode: 404 });

    mw(req, res, next);
    triggerClose();

    expect(transport.entries[1].level).toBe(LogLevel.WARN);
  });

  it('logs ERROR for 5xx responses', () => {
    const mw = requestLogger({ logger });
    const { req, res, next, triggerClose } = createMockReqRes({ statusCode: 500 });

    mw(req, res, next);
    triggerClose();

    expect(transport.entries[1].level).toBe(LogLevel.ERROR);
  });

  it('reads trace ID from request header', () => {
    const mw = requestLogger({ logger, traceHeader: 'x-trace-id' });
    const { req, res, next } = createMockReqRes();
    req.headers['x-trace-id'] = 'existing-trace';

    mw(req, res, next);

    expect(transport.entries[0].traceId).toBe('existing-trace');
  });

  it('generates a trace ID when none is present', () => {
    const mw = requestLogger({ logger });
    const { req, res, next } = createMockReqRes();

    mw(req, res, next);

    expect(transport.entries[0].traceId).toBeDefined();
    expect(typeof transport.entries[0].traceId).toBe('string');
  });

  it('skips logging when skip returns true', () => {
    const mw = requestLogger({
      logger,
      skip: (r) => r.url === '/health',
    });
    const { req, res, next } = createMockReqRes({ url: '/health' });

    mw(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(transport.entries).toHaveLength(0);
  });

  it('uses metaExtractor for custom metadata', () => {
    const mw = requestLogger({
      logger,
      metaExtractor: (r) => ({ agent: r.headers['user-agent'] }),
    });
    const { req, res, next } = createMockReqRes();
    req.headers['user-agent'] = 'TestAgent/1.0';

    mw(req, res, next);

    expect(transport.entries[0].metadata).toEqual(
      expect.objectContaining({ agent: 'TestAgent/1.0' }),
    );
  });
});

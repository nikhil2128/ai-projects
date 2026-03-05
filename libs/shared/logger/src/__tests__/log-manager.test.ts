import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LogManager } from '../log-manager.js';
import { Logger } from '../logger.js';
import { LogLevel } from '../types.js';
import type { LogEntry, LogTransport } from '../types.js';

function createMockTransport(): LogTransport & { entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  return {
    name: 'mock',
    entries,
    log: vi.fn((entry: LogEntry) => entries.push(entry)),
    flush: vi.fn(async () => {}),
    shutdown: vi.fn(async () => {}),
  };
}

describe('LogManager', () => {
  let transport: ReturnType<typeof createMockTransport>;

  beforeEach(() => {
    transport = createMockTransport();
    LogManager.initialize({
      level: LogLevel.DEBUG,
      transports: [transport],
    });
  });

  afterEach(async () => {
    await LogManager.shutdown();
  });

  it('marks itself as initialized', () => {
    expect(LogManager.isInitialized()).toBe(true);
  });

  it('getLogger returns a Logger instance', () => {
    const logger = LogManager.getLogger('TestService');
    expect(logger).toBeInstanceOf(Logger);
  });

  it('caches loggers by context', () => {
    const a = LogManager.getLogger('Svc');
    const b = LogManager.getLogger('Svc');
    expect(a).toBe(b);
  });

  it('returns different loggers for different contexts', () => {
    const a = LogManager.getLogger('A');
    const b = LogManager.getLogger('B');
    expect(a).not.toBe(b);
  });

  it('getLogger without context returns a default logger', () => {
    const a = LogManager.getLogger();
    const b = LogManager.getLogger();
    expect(a).toBe(b);
  });

  it('loggers use the configured transports', () => {
    const logger = LogManager.getLogger('Test');
    logger.info('hello');

    expect(transport.entries).toHaveLength(1);
    expect(transport.entries[0].context).toBe('Test');
  });

  it('replaceTransports clears cached loggers', () => {
    const logger1 = LogManager.getLogger('Svc');
    const newTransport = createMockTransport();

    LogManager.replaceTransports([newTransport]);

    const logger2 = LogManager.getLogger('Svc');
    expect(logger2).not.toBe(logger1);

    logger2.info('test');
    expect(newTransport.entries).toHaveLength(1);
    expect(transport.entries).toHaveLength(0);
  });

  it('flush delegates to all loggers', async () => {
    LogManager.getLogger('A').info('a');
    LogManager.getLogger('B').info('b');

    await LogManager.flush();
    expect(transport.flush).toHaveBeenCalled();
  });

  it('shutdown clears loggers and resets state', async () => {
    LogManager.getLogger('A');
    await LogManager.shutdown();

    expect(LogManager.isInitialized()).toBe(false);
  });

  it('works without explicit initialize (defaults)', () => {
    LogManager['initialized'] = false;
    LogManager['loggers'].clear();
    LogManager['config'] = {};

    const logger = LogManager.getLogger('Fallback');
    expect(logger).toBeInstanceOf(Logger);
  });
});

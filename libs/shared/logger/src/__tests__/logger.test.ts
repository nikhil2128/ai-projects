import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger, createLogger } from '../logger.js';
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

describe('Logger', () => {
  let transport: ReturnType<typeof createMockTransport>;
  let logger: Logger;

  beforeEach(() => {
    transport = createMockTransport();
    logger = new Logger({ transports: [transport], level: LogLevel.DEBUG });
  });

  it('logs at each level', () => {
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');
    logger.fatal('f');

    expect(transport.entries).toHaveLength(5);
    expect(transport.entries.map((e) => e.level)).toEqual([
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
      LogLevel.FATAL,
    ]);
  });

  it('respects the minimum level', () => {
    const warnLogger = new Logger({
      transports: [transport],
      level: LogLevel.WARN,
    });

    warnLogger.debug('no');
    warnLogger.info('no');
    warnLogger.warn('yes');
    warnLogger.error('yes');

    expect(transport.entries).toHaveLength(2);
  });

  it('includes context in log entries', () => {
    const ctx = new Logger({
      transports: [transport],
      level: LogLevel.DEBUG,
      context: 'UserService',
    });

    ctx.info('hello');

    expect(transport.entries[0].context).toBe('UserService');
  });

  it('merges metadata', () => {
    const meta = new Logger({
      transports: [transport],
      level: LogLevel.DEBUG,
      metadata: { service: 'api' },
    });

    meta.info('req', { userId: 42 });

    expect(transport.entries[0].metadata).toEqual({
      service: 'api',
      userId: 42,
    });
  });

  it('accepts Error as second argument', () => {
    const err = new Error('boom');
    logger.error('failed', err);

    expect(transport.entries[0].error).toBe(err);
    expect(transport.entries[0].message).toBe('failed');
  });

  it('accepts Error + metadata', () => {
    const err = new Error('boom');
    logger.error('failed', err, { requestId: 'abc' });

    expect(transport.entries[0].error).toBe(err);
    expect(transport.entries[0].metadata).toEqual({ requestId: 'abc' });
  });

  it('attaches traceId', () => {
    const traced = new Logger({
      transports: [transport],
      level: LogLevel.DEBUG,
      traceId: 'trace-123',
    });

    traced.info('hello');
    expect(transport.entries[0].traceId).toBe('trace-123');
  });

  describe('child()', () => {
    it('inherits transports and level', () => {
      const child = logger.child({ context: 'Child' });
      child.info('from child');

      expect(transport.entries[0].context).toBe('Child');
    });

    it('merges parent metadata with child metadata', () => {
      const parent = new Logger({
        transports: [transport],
        level: LogLevel.DEBUG,
        metadata: { service: 'api' },
      });

      const child = parent.child({ metadata: { module: 'auth' } });
      child.info('hello');

      expect(transport.entries[0].metadata).toEqual({
        service: 'api',
        module: 'auth',
      });
    });

    it('can override traceId', () => {
      const parent = new Logger({
        transports: [transport],
        level: LogLevel.DEBUG,
        traceId: 'parent-trace',
      });

      const child = parent.child({ traceId: 'child-trace' });
      child.info('hello');

      expect(transport.entries[0].traceId).toBe('child-trace');
    });
  });

  describe('transport management', () => {
    it('addTransport adds a new transport', () => {
      const extra = createMockTransport();
      extra.name = 'extra' as never;
      Object.defineProperty(extra, 'name', { value: 'extra' });

      logger.addTransport(extra);
      logger.info('test');

      expect(transport.entries).toHaveLength(1);
      expect(extra.entries).toHaveLength(1);
    });

    it('removeTransport removes by name', () => {
      logger.removeTransport('mock');
      logger.info('gone');

      expect(transport.entries).toHaveLength(0);
    });
  });

  describe('lifecycle', () => {
    it('flush delegates to transports', async () => {
      await logger.flush();
      expect(transport.flush).toHaveBeenCalled();
    });

    it('shutdown delegates to transports', async () => {
      await logger.shutdown();
      expect(transport.shutdown).toHaveBeenCalled();
    });
  });

  it('survives transport failures', () => {
    const bad: LogTransport = {
      name: 'bad',
      log: () => {
        throw new Error('transport crash');
      },
    };
    const safe = createMockTransport();

    const l = new Logger({
      transports: [bad, safe],
      level: LogLevel.DEBUG,
    });

    expect(() => l.info('test')).not.toThrow();
    expect(safe.entries).toHaveLength(1);
  });

  it('createLogger is a convenience factory', () => {
    const l = createLogger({ level: LogLevel.WARN });
    expect(l).toBeInstanceOf(Logger);
    expect(l.getLevel()).toBe(LogLevel.WARN);
  });

  it('setLevel changes the minimum level', () => {
    logger.setLevel(LogLevel.ERROR);
    logger.info('skipped');
    logger.error('kept');

    expect(transport.entries).toHaveLength(1);
    expect(transport.entries[0].level).toBe(LogLevel.ERROR);
  });
});

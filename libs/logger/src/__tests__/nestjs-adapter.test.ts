import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NestLoggerAdapter } from '../adapters/nestjs.adapter.js';
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

describe('NestLoggerAdapter', () => {
  let transport: ReturnType<typeof createMockTransport>;
  let adapter: NestLoggerAdapter;

  beforeEach(() => {
    transport = createMockTransport();
    adapter = new NestLoggerAdapter({
      transports: [transport],
      level: LogLevel.DEBUG,
    });
  });

  it('log() maps to INFO', () => {
    adapter.log('hello');
    expect(transport.entries[0].level).toBe(LogLevel.INFO);
    expect(transport.entries[0].message).toBe('hello');
  });

  it('error() maps to ERROR', () => {
    adapter.error('bad');
    expect(transport.entries[0].level).toBe(LogLevel.ERROR);
  });

  it('error() with stack attaches an Error object', () => {
    adapter.error('bad', 'Error: bad\n    at line 1');
    expect(transport.entries[0].error).toBeDefined();
    expect(transport.entries[0].error!.stack).toContain('at line 1');
  });

  it('warn() maps to WARN', () => {
    adapter.warn('careful');
    expect(transport.entries[0].level).toBe(LogLevel.WARN);
  });

  it('debug() maps to DEBUG', () => {
    adapter.debug('details');
    expect(transport.entries[0].level).toBe(LogLevel.DEBUG);
  });

  it('verbose() maps to DEBUG with verbose metadata', () => {
    adapter.verbose('verbose msg');
    expect(transport.entries[0].level).toBe(LogLevel.DEBUG);
    expect(transport.entries[0].metadata).toEqual(
      expect.objectContaining({ verbose: true }),
    );
  });

  it('fatal() maps to FATAL', () => {
    adapter.fatal('crash');
    expect(transport.entries[0].level).toBe(LogLevel.FATAL);
  });

  it('uses the context parameter', () => {
    adapter.log('hello', 'MyService');
    expect(transport.entries[0].context).toBe('MyService');
  });

  it('setLogLevels adjusts the minimum level', () => {
    adapter.setLogLevels(['error']);
    adapter.debug('skip');
    adapter.error('keep');

    expect(transport.entries).toHaveLength(1);
    expect(transport.entries[0].level).toBe(LogLevel.ERROR);
  });
});

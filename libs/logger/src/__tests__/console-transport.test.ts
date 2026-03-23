import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsoleTransport } from '../transports/console.transport.js';
import { LogLevel } from '../types.js';
import type { LogEntry } from '../types.js';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    level: LogLevel.INFO,
    message: 'test message',
    timestamp: new Date('2025-01-15T10:30:00.000Z'),
    ...overrides,
  };
}

describe('ConsoleTransport', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('pretty format', () => {
    it('outputs human-readable lines', () => {
      const transport = new ConsoleTransport({ format: 'pretty', colorize: false });
      transport.log(makeEntry());

      expect(logSpy).toHaveBeenCalledOnce();
      const output = logSpy.mock.calls[0][0] as string;
      expect(output).toContain('2025-01-15T10:30:00.000Z');
      expect(output).toContain('INFO');
      expect(output).toContain('test message');
    });

    it('includes context', () => {
      const transport = new ConsoleTransport({ format: 'pretty', colorize: false });
      transport.log(makeEntry({ context: 'UserService' }));

      const output = logSpy.mock.calls[0][0] as string;
      expect(output).toContain('[UserService]');
    });

    it('includes traceId', () => {
      const transport = new ConsoleTransport({ format: 'pretty', colorize: false });
      transport.log(makeEntry({ traceId: 'abc-123' }));

      const output = logSpy.mock.calls[0][0] as string;
      expect(output).toContain('(abc-123)');
    });

    it('includes metadata', () => {
      const transport = new ConsoleTransport({ format: 'pretty', colorize: false });
      transport.log(makeEntry({ metadata: { userId: 42 } }));

      const output = logSpy.mock.calls[0][0] as string;
      expect(output).toContain('"userId":42');
    });

    it('includes error stack', () => {
      const transport = new ConsoleTransport({ format: 'pretty', colorize: false });
      const err = new Error('boom');
      transport.log(makeEntry({ level: LogLevel.ERROR, error: err }));

      const output = errorSpy.mock.calls[0][0] as string;
      expect(output).toContain('boom');
    });
  });

  describe('json format', () => {
    it('outputs valid JSON', () => {
      const transport = new ConsoleTransport({ format: 'json' });
      transport.log(makeEntry());

      const output = logSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.level).toBe('INFO');
      expect(parsed.message).toBe('test message');
      expect(parsed.timestamp).toBe('2025-01-15T10:30:00.000Z');
    });

    it('includes error details', () => {
      const transport = new ConsoleTransport({ format: 'json' });
      const err = new Error('fail');
      transport.log(makeEntry({ level: LogLevel.ERROR, error: err }));

      const output = errorSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.error.name).toBe('Error');
      expect(parsed.error.message).toBe('fail');
    });
  });

  it('respects its own level filter', () => {
    const transport = new ConsoleTransport({ level: LogLevel.WARN });
    transport.log(makeEntry({ level: LogLevel.INFO }));
    transport.log(makeEntry({ level: LogLevel.WARN }));

    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it('routes ERROR and FATAL to console.error', () => {
    const transport = new ConsoleTransport({ format: 'pretty', colorize: false });
    transport.log(makeEntry({ level: LogLevel.ERROR }));
    transport.log(makeEntry({ level: LogLevel.FATAL }));

    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).not.toHaveBeenCalled();
  });
});

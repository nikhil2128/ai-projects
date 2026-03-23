import { writeFileSync, mkdirSync, renameSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { LogLevel, LOG_LEVEL_LABELS } from '../types.js';
import type { LogEntry, LogTransport, TransportConfig } from '../types.js';

export interface FileTransportConfig extends TransportConfig {
  /** Absolute path to the log file. Parent directories are created automatically. */
  filePath: string;

  /**
   * Format written to disk.
   * - `json`: one JSON object per line (default) — ideal for CloudWatch Agent, Fluentd, Filebeat
   * - `text`: human-readable lines similar to ConsoleTransport pretty mode
   */
  format?: 'json' | 'text';

  /** Max file size in bytes before rotation. Default: 10 MB */
  maxFileSize?: number;
  /** Number of rotated files to keep. Default: 5 */
  maxFiles?: number;
  /** Entries to buffer before writing to disk. Default: 20 */
  bufferSize?: number;
}

export class FileTransport implements LogTransport {
  readonly name = 'file';

  private filePath: string;
  private format: 'json' | 'text';
  private level: LogLevel;
  private maxFileSize: number;
  private maxFiles: number;
  private bufferSize: number;
  private buffer: string[] = [];

  constructor(config: FileTransportConfig) {
    this.filePath = config.filePath;
    this.format = config.format ?? 'json';
    this.level = config.level ?? LogLevel.DEBUG;
    this.maxFileSize = config.maxFileSize ?? 10 * 1024 * 1024;
    this.maxFiles = config.maxFiles ?? 5;
    this.bufferSize = config.bufferSize ?? 20;

    mkdirSync(dirname(this.filePath), { recursive: true });
  }

  log(entry: LogEntry): void {
    if (entry.level < this.level) return;

    const line =
      this.format === 'json'
        ? this.formatJson(entry)
        : this.formatText(entry);

    this.buffer.push(line);

    if (this.buffer.length >= this.bufferSize) {
      this.writeToDisk();
    }
  }

  async flush(): Promise<void> {
    this.writeToDisk();
  }

  async shutdown(): Promise<void> {
    this.writeToDisk();
  }

  private writeToDisk(): void {
    if (this.buffer.length === 0) return;

    const lines = this.buffer.splice(0);
    const data = lines.join('\n') + '\n';

    this.rotateIfNeeded();
    writeFileSync(this.filePath, data, { flag: 'a' });
  }

  private rotateIfNeeded(): void {
    try {
      if (!existsSync(this.filePath)) return;
      const stats = statSync(this.filePath);
      if (stats.size < this.maxFileSize) return;
    } catch {
      return;
    }

    const dir = dirname(this.filePath);
    const base = this.filePath.slice(dir.length + 1);

    for (let i = this.maxFiles - 1; i >= 1; i--) {
      const from = join(dir, `${base}.${i}`);
      const to = join(dir, `${base}.${i + 1}`);
      if (existsSync(from)) {
        renameSync(from, to);
      }
    }

    renameSync(this.filePath, join(dir, `${base}.1`));
  }

  private formatJson(entry: LogEntry): string {
    return JSON.stringify({
      timestamp: entry.timestamp.toISOString(),
      level: LOG_LEVEL_LABELS[entry.level as Exclude<LogLevel, LogLevel.SILENT>],
      message: entry.message,
      ...(entry.context && { context: entry.context }),
      ...(entry.traceId && { traceId: entry.traceId }),
      ...(entry.metadata && { metadata: entry.metadata }),
      ...(entry.error && {
        error: {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack,
        },
      }),
    });
  }

  private formatText(entry: LogEntry): string {
    const label = LOG_LEVEL_LABELS[entry.level as Exclude<LogLevel, LogLevel.SILENT>];
    const time = entry.timestamp.toISOString();
    const parts: string[] = [time, label.padEnd(5)];

    if (entry.context) parts.push(`[${entry.context}]`);
    if (entry.traceId) parts.push(`(${entry.traceId})`);
    parts.push(entry.message);

    let result = parts.join(' ');

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      result += ` ${JSON.stringify(entry.metadata)}`;
    }
    if (entry.error) {
      result += `\n${entry.error.stack ?? entry.error.message}`;
    }
    return result;
  }
}

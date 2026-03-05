import { Logger } from '../logger.js';
import { LogLevel } from '../types.js';
import type { LoggerConfig } from '../types.js';

/**
 * Matches NestJS's `LoggerService` interface without importing `@nestjs/common`,
 * so the shared logger stays framework-agnostic.
 *
 * Usage in a NestJS app:
 * ```ts
 * import { NestLoggerAdapter } from '@shared/logger';
 *
 * const app = await NestFactory.create(AppModule, {
 *   logger: new NestLoggerAdapter(),
 * });
 * ```
 */
export class NestLoggerAdapter {
  private logger: Logger;

  constructor(config?: LoggerConfig) {
    this.logger = new Logger({ ...config, context: config?.context ?? 'Nest' });
  }

  log(message: unknown, context?: string): void {
    this.getLogger(context).info(String(message));
  }

  error(message: unknown, stack?: string, context?: string): void {
    const logger = this.getLogger(context);
    if (stack) {
      const err = new Error(String(message));
      err.stack = stack;
      logger.error(String(message), err);
    } else {
      logger.error(String(message));
    }
  }

  warn(message: unknown, context?: string): void {
    this.getLogger(context).warn(String(message));
  }

  debug(message: unknown, context?: string): void {
    this.getLogger(context).debug(String(message));
  }

  verbose(message: unknown, context?: string): void {
    this.getLogger(context).debug(String(message), { verbose: true });
  }

  fatal(message: unknown, context?: string): void {
    this.getLogger(context).fatal(String(message));
  }

  setLogLevels(levels: string[]): void {
    const nestToLevel: Record<string, LogLevel> = {
      verbose: LogLevel.DEBUG,
      debug: LogLevel.DEBUG,
      log: LogLevel.INFO,
      warn: LogLevel.WARN,
      error: LogLevel.ERROR,
      fatal: LogLevel.FATAL,
    };

    const minLevel = levels.reduce((min, l) => {
      const mapped = nestToLevel[l] ?? LogLevel.INFO;
      return mapped < min ? mapped : min;
    }, LogLevel.SILENT);

    this.logger.setLevel(minLevel);
  }

  private getLogger(context?: string): Logger {
    return context ? this.logger.child({ context }) : this.logger;
  }
}

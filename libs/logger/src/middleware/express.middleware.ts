import { randomUUID } from 'node:crypto';
import { Logger } from '../logger.js';
import { LogManager } from '../log-manager.js';
import type { LogMeta } from '../types.js';

type Req = {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
};

type Res = {
  statusCode: number;
  on(event: string, cb: () => void): void;
  getHeader?(name: string): string | number | string[] | undefined;
};

type NextFn = (err?: unknown) => void;

export interface RequestLoggerOptions {
  /** Logger instance; falls back to `LogManager.getLogger('http')`. */
  logger?: Logger;
  /** Header to read an incoming trace/request ID from. Default: `x-request-id` */
  traceHeader?: string;
  /** Attach a generated request ID to the response header. Default: `true` */
  exposeTraceId?: boolean;
  /** Extra metadata to extract from every request. */
  metaExtractor?: (req: Req) => LogMeta;
  /** Skip logging for certain paths (e.g. health checks). */
  skip?: (req: Req) => boolean;
}

/**
 * Express-compatible middleware that:
 * 1. Assigns (or reads) a trace / request ID
 * 2. Logs the incoming request
 * 3. Logs the response with duration on finish
 *
 * ```ts
 * import { requestLogger } from '@libs/logger';
 * app.use(requestLogger());
 * ```
 */
export function requestLogger(options: RequestLoggerOptions = {}) {
  const {
    traceHeader = 'x-request-id',
    exposeTraceId = true,
    metaExtractor,
    skip,
  } = options;

  return (req: Req, res: Res, next: NextFn) => {
    if (skip?.(req)) return next();

    const traceId =
      (req.headers[traceHeader] as string | undefined) ?? randomUUID();

    const logger = (options.logger ?? LogManager.getLogger('http')).child({
      traceId,
    });

    if (exposeTraceId && 'setHeader' in res) {
      (res as unknown as { setHeader(n: string, v: string): void }).setHeader(
        traceHeader,
        traceId,
      );
    }

    const start = performance.now();

    const baseMeta: LogMeta = {
      method: req.method,
      url: req.url,
      ip: req.ip ?? req.socket?.remoteAddress,
      ...(metaExtractor?.(req) ?? {}),
    };

    logger.info('Incoming request', baseMeta);

    res.on('close', () => {
      const durationMs = Math.round(performance.now() - start);
      const status = res.statusCode;

      const responseMeta: LogMeta = {
        ...baseMeta,
        statusCode: status,
        durationMs,
        contentLength: res.getHeader?.('content-length'),
      };

      if (status >= 500) {
        logger.error('Request completed', responseMeta);
      } else if (status >= 400) {
        logger.warn('Request completed', responseMeta);
      } else {
        logger.info('Request completed', responseMeta);
      }
    });

    next();
  };
}

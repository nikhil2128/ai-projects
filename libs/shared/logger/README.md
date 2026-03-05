# @shared/logger

A provider-agnostic logging library for the **ai-projects** monorepo. The core
`Logger` writes structured `LogEntry` objects to one or more **transports**.
Swapping from console output to New Relic, CloudWatch, Splunk, Datadog, or any
other service is a single transport configuration change — zero application code
changes required.

## Quick start

```ts
import { LogManager, ConsoleTransport, LogLevel } from '@shared/logger';

// 1. Initialize once at app startup
LogManager.initialize({
  level: LogLevel.INFO,
  transports: [new ConsoleTransport({ format: 'pretty' })],
});

// 2. Get a context-scoped logger anywhere
const logger = LogManager.getLogger('UserService');
logger.info('User created', { userId: 42 });
logger.error('Payment failed', new Error('timeout'), { orderId: 7 });
```

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Your Application                    │
│                                                        │
│  logger.info('msg', { meta })                          │
│       │                                                │
│       ▼                                                │
│  ┌──────────┐     ┌──────────────────────────────────┐ │
│  │  Logger   │────▶│  Transport[]  (strategy pattern) │ │
│  └──────────┘     │                                  │ │
│                   │  ┌─────────────────┐             │ │
│                   │  │ ConsoleTransport │  (built-in) │ │
│                   │  ├─────────────────┤             │ │
│                   │  │ HttpTransport   │  (built-in) │ │
│                   │  ├─────────────────┤             │ │
│                   │  │ FileTransport   │  (built-in) │ │
│                   │  ├─────────────────┤             │ │
│                   │  │ YourTransport   │  (custom)   │ │
│                   │  └─────────────────┘             │ │
│                   └──────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

## Built-in transports

### ConsoleTransport

Human-readable (`pretty`) or machine-parseable (`json`) output to stdout/stderr.

```ts
new ConsoleTransport({ format: 'json', colorize: false });
```

### HttpTransport

Generic HTTP transport with **batching**, **retry with exponential back-off**,
and a **pluggable formatter** — the key to supporting any HTTP-based log service.

```ts
new HttpTransport({
  url: 'https://log-api.newrelic.com/log/v1',
  headers: { 'Api-Key': process.env.NEW_RELIC_LICENSE_KEY! },
  formatter: (entries) => [{
    common: { attributes: { service: 'my-app' } },
    logs: entries.map((e) => ({
      timestamp: e.timestamp.getTime(),
      message: e.message,
      level: e.level,
      attributes: e.metadata,
    })),
  }],
  batchSize: 100,
  flushIntervalMs: 5_000,
});
```

### FileTransport

Write JSON or text logs to disk with **automatic rotation**. Ideal when an
agent (CloudWatch Agent, Fluentd, Filebeat) ships files to a central system.

```ts
new FileTransport({
  filePath: '/var/log/myapp/app.log',
  format: 'json',
  maxFileSize: 10 * 1024 * 1024, // 10 MB
  maxFiles: 5,
});
```

## Writing a custom transport

Implement the `LogTransport` interface:

```ts
import type { LogTransport, LogEntry } from '@shared/logger';

export class DatadogTransport implements LogTransport {
  readonly name = 'datadog';

  log(entry: LogEntry): void {
    // Send to Datadog
  }

  async flush(): Promise<void> {
    // Flush any buffered entries
  }

  async shutdown(): Promise<void> {
    // Close connections
  }
}
```

## Swapping providers at runtime

```ts
import { LogManager, HttpTransport } from '@shared/logger';

// App starts with console only
LogManager.initialize({
  transports: [new ConsoleTransport()],
});

// Later, after config loads, swap to Splunk HEC
LogManager.replaceTransports([
  new ConsoleTransport({ format: 'json' }),
  new HttpTransport({
    url: process.env.SPLUNK_HEC_URL!,
    headers: { Authorization: `Splunk ${process.env.SPLUNK_TOKEN}` },
    ndjson: true,
    formatter: (entries) =>
      entries.map((e) => ({
        event: { message: e.message, level: e.level },
        time: e.timestamp.getTime() / 1000,
        sourcetype: '_json',
      })),
  }),
]);
```

## Framework integrations

### NestJS

```ts
import { NestFactory } from '@nestjs/core';
import { NestLoggerAdapter, LogManager, ConsoleTransport } from '@shared/logger';

LogManager.initialize({ transports: [new ConsoleTransport()] });

const app = await NestFactory.create(AppModule, {
  logger: new NestLoggerAdapter({
    transports: LogManager['config'].transports,
  }),
});
```

### Express

```ts
import express from 'express';
import { requestLogger, LogManager, ConsoleTransport } from '@shared/logger';

LogManager.initialize({ transports: [new ConsoleTransport()] });

const app = express();
app.use(requestLogger({
  skip: (req) => req.url === '/health',
}));
```

The middleware automatically:
- Assigns/reads a trace ID (`x-request-id` header)
- Logs the incoming request with method, URL, and IP
- Logs the response with status code and duration

## Child loggers

Create scoped loggers that inherit transports but add context:

```ts
const logger = LogManager.getLogger('OrderService');
const reqLogger = logger.child({
  traceId: req.headers['x-request-id'],
  metadata: { userId: req.user.id },
});

reqLogger.info('Processing order');  // includes traceId + userId
```

## Graceful shutdown

```ts
process.on('SIGTERM', async () => {
  await LogManager.shutdown(); // flushes all buffered entries
  process.exit(0);
});
```

# Click Analytics — System Documentation

A production-grade, high-throughput click analytics backend designed for multi-website tracking with zero event loss guarantees. Built with **Node.js**, **TypeScript**, **Redis Streams**, and **PostgreSQL**.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Data Pipeline](#2-data-pipeline)
3. [Component Reference](#3-component-reference)
4. [API Documentation](#4-api-documentation)
5. [Database Schema](#5-database-schema)
6. [Type System](#6-type-system)
7. [Configuration](#7-configuration)
8. [Deployment](#8-deployment)
9. [Reliability Guarantees](#9-reliability-guarantees)

---

## 1. System Architecture

### High-Level Overview

```
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │                             CLICK ANALYTICS SYSTEM                          │
 │                                                                             │
 │   ┌─────────────┐     ┌────────────────────────────────────────────────┐    │
 │   │             │     │            EXPRESS API SERVER                   │    │
 │   │  Websites / │     │  ┌──────────────┐  ┌────────────────────────┐  │    │
 │   │  Clients    ├────►│  │  Middleware   │  │   Route Handlers       │  │    │
 │   │             │     │  │              │  │                        │  │    │
 │   │  POST /track│     │  │ • CORS       │  │  /api/track            │  │    │
 │   │  GET  /anal │     │  │ • Rate Limit │  │  /api/track/batch      │  │    │
 │   │             │     │  │ • Zod Valid. │  │  /api/analytics/*      │  │    │
 │   │             │     │  │ • Error Hndl │  │  /api/health           │  │    │
 │   └─────────────┘     │  └──────────────┘  └──────┬───────┬─────────┘  │    │
 │                       └───────────────────────────┼───────┼────────────┘    │
 │                                                   │       │                 │
 │                                    Tracking       │       │ Analytics       │
 │                                    (write path)   │       │ (read path)     │
 │                                                   ▼       │                 │
 │                       ┌───────────────────────────────┐   │                 │
 │                       │       REDIS STREAMS           │   │                 │
 │                       │                               │   │                 │
 │                       │  Stream: clicks:stream        │   │                 │
 │                       │  Group:  click-workers        │   │                 │
 │      ┌──────────┐     │  Max Len: 1,000,000           │   │                 │
 │      │ IN-MEM   │◄───►│                               │   │                 │
 │      │ BUFFER   │     │  AOF persistence enabled      │   │                 │
 │      │ (100k)   │     │  noeviction policy             │   │                 │
 │      └──────────┘     └──────────────┬────────────────┘   │                 │
 │       Fallback when                  │                     │                 │
 │       Redis is down                  │ XREADGROUP          │                 │
 │                                      ▼                     ▼                 │
 │                       ┌───────────────────────────────────────────────┐      │
 │                       │               WORKER PROCESS                  │      │
 │                       │                                               │      │
 │                       │  1. Drain pending (crash recovery)            │      │
 │                       │  2. XREADGROUP  COUNT 500  BLOCK 2000        │      │
 │                       │  3. Parse JSON → QueuedEvent[]               │      │
 │                       │  4. Multi-row INSERT into PostgreSQL         │      │
 │                       │  5. XACK processed message IDs               │      │
 │                       └──────────────────────┬────────────────────────┘      │
 │                                              │                              │
 │                                              ▼                              │
 │                       ┌───────────────────────────────────────────────┐      │
 │                       │              POSTGRESQL 16                    │      │
 │                       │                                               │      │
 │                       │  Table: click_events (BIGSERIAL PK)          │      │
 │                       │  6 indexes for query performance             │      │
 │                       │  Connection pool: 20 (API) / 10 (Worker)     │      │
 │                       └───────────────────────────────────────────────┘      │
 └──────────────────────────────────────────────────────────────────────────────┘
```

### Component Interaction Diagram

```
              WRITE PATH                           READ PATH
              ─────────                            ─────────

  Client                                      Client
    │                                           │
    │  POST /api/track                          │  GET /api/analytics/*
    │  POST /api/track/batch                    │
    ▼                                           ▼
┌────────────┐                            ┌────────────┐
│ Rate       │                            │ Analytics  │
│ Limiter    │                            │ Routes     │
│ (1000/min) │                            │            │
└─────┬──────┘                            └─────┬──────┘
      │                                         │
      ▼                                         │
┌────────────┐                                  │
│ Zod        │                                  │
│ Validation │                                  │
└─────┬──────┘                                  │
      │                                         │
      ▼                                         │
┌────────────┐                                  │
│ Tracking   │                                  │
│ Route      │                                  │
│            │                                  │
│ toQueued() │                                  │
└─────┬──────┘                                  │
      │                                         │
      ▼                                         │
┌────────────┐     ┌────────────┐               │
│ Redis      │◄───►│ In-Memory  │               │
│ Producer   │fail │ Buffer     │               │
│            │     │ (ring buf) │               │
│ XADD      │     └────────────┘               │
└─────┬──────┘                                  │
      │                                         │
      ▼                                         ▼
┌────────────┐                          ┌────────────────┐
│ Redis      │                          │ Analytics      │
│ Stream     │                          │ Service        │
│            │                          │                │
│ clicks:    │                          │ Parameterized  │
│ stream     │                          │ SQL queries    │
└─────┬──────┘                          └───────┬────────┘
      │                                         │
      │ XREADGROUP                              │
      ▼                                         ▼
┌────────────┐                          ┌────────────────┐
│ Consumer   │                          │ PostgreSQL     │
│ (Worker)   │─────────────────────────►│                │
│            │  Multi-row INSERT        │ click_events   │
│ XACK       │                          │                │
└────────────┘                          └────────────────┘
```

### Module Dependency Map

```
src/
├── index.ts ─────────────────────► Express API entry point
│   ├── config.ts                     Central configuration
│   ├── database/schema.ts            Table + index creation
│   ├── database/connection.ts        PostgreSQL pool
│   ├── queue/redis.ts                Redis singleton
│   ├── buffer/memory.ts              In-memory fallback
│   ├── middleware/errorHandler.ts     Global error handler
│   ├── middleware/rateLimiter.ts      Rate limiting middleware
│   ├── routes/tracking.ts            Tracking endpoints
│   │   ├── types/index.ts              Zod schemas
│   │   ├── middleware/validation.ts    Request validation
│   │   ├── queue/producer.ts           Redis XADD
│   │   └── buffer/memory.ts            Buffer fallback
│   └── routes/analytics.ts           Analytics endpoints
│       └── services/analytics.ts      SQL aggregation queries
│           └── database/connection.ts  PostgreSQL pool
│
├── worker.ts ────────────────────► Background worker entry point
│   ├── config.ts
│   ├── database/schema.ts
│   ├── database/connection.ts
│   ├── queue/redis.ts
│   └── queue/consumer.ts              Stream consumer loop
│       └── services/tracking.ts       Batch INSERT logic
│           └── database/connection.ts
```

---

## 2. Data Pipeline

### Stage 1: Ingestion (API Server)

```
Client Request
      │
      ▼
┌─────────────────────────────────────────────────────┐
│ 1. RECEIVE  ── POST /api/track or /api/track/batch  │
│                                                     │
│ 2. RATE-CHECK ── express-rate-limit                 │
│    • 1000 requests per 60-second window             │
│    • Keyed by x-forwarded-for or req.ip             │
│    • Returns 429 if exceeded                        │
│                                                     │
│ 3. VALIDATE ── Zod schema (ClickEventSchema)        │
│    • sessionId: required, non-empty string          │
│    • pageUrl: required, valid URL                   │
│    • elementTag: required, non-empty string         │
│    • xPos, yPos: required, non-negative integers    │
│    • viewportWidth/Height: required, positive ints  │
│    • websiteId, elementId, elementClass,            │
│      elementText, referrer, userAgent, metadata:    │
│      all optional                                   │
│    • Returns 400 with field errors on failure       │
│                                                     │
│ 4. ENRICH ── toQueuedEvent()                        │
│    • Resolve websiteId from pageUrl hostname        │
│    • Attach client IP (x-forwarded-for or req.ip)   │
│    • Stamp receivedAt timestamp                     │
│                                                     │
│ 5. QUEUE ── pushToStream() / pushBatchToStream()    │
│    • Redis XADD with MAXLEN ~ 1,000,000            │
│    • On failure → pushToBuffer() (in-memory)        │
│                                                     │
│ 6. RESPOND ── 202 Accepted                          │
│    { queued: true|count, timestamp }                │
└─────────────────────────────────────────────────────┘
```

### Stage 2: Buffering (Redis Streams)

```
┌─────────────────────────────────────────────────────┐
│              REDIS STREAM: clicks:stream             │
│                                                     │
│  Format: XADD clicks:stream MAXLEN ~ 1000000 *     │
│          data <JSON-encoded QueuedEvent>            │
│                                                     │
│  Consumer Group: click-workers                      │
│  Persistence: AOF (append-only file)                │
│  Memory Policy: noeviction (never drops data)       │
│  Max Memory: 512 MB                                 │
│                                                     │
│  Each message contains:                             │
│  ┌─────────────────────────────────────────────┐    │
│  │ ID: <timestamp>-<sequence>                  │    │
│  │ Fields: { data: "<JSON QueuedEvent>" }      │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### Stage 3: Processing (Worker)

```
┌─────────────────────────────────────────────────────┐
│                   WORKER LIFECYCLE                   │
│                                                     │
│  STARTUP                                            │
│  ├── waitForRedis()     Wait for Redis connection   │
│  ├── initializeSchema() Ensure PostgreSQL table     │
│  └── initConsumerGroup() CREATE group if not exists  │
│                                                     │
│  PHASE 1: DRAIN PENDING                             │
│  │  On restart, re-process any unACKed messages     │
│  │  that belonged to this consumer                  │
│  │  └── XREADGROUP ... STREAMS clicks:stream 0     │
│  │                                                  │
│  PHASE 2: CONSUME NEW                               │
│  │  Main loop (while running):                      │
│  │  ├── XREADGROUP GROUP click-workers <consumer>   │
│  │  │   COUNT 500  BLOCK 2000                       │
│  │  │   STREAMS clicks:stream >                     │
│  │  │                                               │
│  │  ├── Parse JSON payloads → QueuedEvent[]         │
│  │  │                                               │
│  │  ├── insertClicksBatch(events)                   │
│  │  │   Multi-row INSERT INTO click_events          │
│  │  │   VALUES ($1,$2,...), ($17,$18,...), ...       │
│  │  │                                               │
│  │  └── XACK clicks:stream click-workers <ids...>   │
│  │                                                  │
│  SHUTDOWN                                           │
│  ├── stopConsumer() sets running = false             │
│  ├── Wait 3s for current batch to finish            │
│  ├── closeRedis()                                   │
│  └── closePool()                                    │
└─────────────────────────────────────────────────────┘
```

### Stage 4: Querying (Analytics)

```
┌─────────────────────────────────────────────────────┐
│                ANALYTICS PIPELINE                   │
│                                                     │
│  GET /api/analytics/<endpoint>?from=&to=&...        │
│         │                                           │
│         ▼                                           │
│  parseQuery(req.query)                              │
│  ├── from?       → ISO 8601 start bound             │
│  ├── to?         → ISO 8601 end bound               │
│  ├── pageUrl?    → page URL filter                  │
│  ├── websiteId?  → website filter                   │
│  ├── granularity → minute|hour|day|week|month       │
│  └── limit?      → clamped to [1, 500]              │
│         │                                           │
│         ▼                                           │
│  buildWhereClause(query)                            │
│  ├── Dynamically builds WHERE SQL                   │
│  └── Parameterized ($1, $2, ...) for safety         │
│         │                                           │
│         ▼                                           │
│  PostgreSQL parameterized query                     │
│  ├── Aggregations: COUNT, COUNT DISTINCT            │
│  ├── Grouping: to_char for time series              │
│  ├── Heatmap: viewport-relative % bucketing (5%)    │
│  └── Sorting + LIMIT                                │
│         │                                           │
│         ▼                                           │
│  JSON response                                      │
└─────────────────────────────────────────────────────┘
```

### In-Memory Buffer Lifecycle

```
┌─────────────────────────────────────────────────────┐
│             IN-MEMORY RING BUFFER                   │
│                                                     │
│  Capacity: 100,000 events (configurable)            │
│  Behavior: FIFO ring — drops oldest on overflow     │
│  Flush interval: every 5 seconds                    │
│                                                     │
│  WRITE PATH                                         │
│  ┌──────────────────────────────┐                   │
│  │ pushToStream() fails         │                   │
│  │        │                     │                   │
│  │        ▼                     │                   │
│  │ pushToBuffer(event)          │                   │
│  │        │                     │                   │
│  │        ▼                     │                   │
│  │ buffer.length >= maxSize?    │                   │
│  │   YES → shift oldest out     │                   │
│  │   NO  → push to end          │                   │
│  └──────────────────────────────┘                   │
│                                                     │
│  FLUSH PATH (every 5s)                              │
│  ┌──────────────────────────────┐                   │
│  │ buffer.length === 0? → skip  │                   │
│  │        │                     │                   │
│  │        ▼                     │                   │
│  │ isRedisHealthy()?            │                   │
│  │   NO  → skip                 │                   │
│  │   YES → splice first 500     │                   │
│  │        │                     │                   │
│  │        ▼                     │                   │
│  │ pushBatchToStream(batch)     │                   │
│  │        │                     │                   │
│  │        ▼                     │                   │
│  │ partial success?             │                   │
│  │   YES → unshift remainder    │                   │
│  │   NO  → done                 │                   │
│  └──────────────────────────────┘                   │
└─────────────────────────────────────────────────────┘
```

---

## 3. Component Reference

### 3.1 API Server (`src/index.ts`)

The Express application that handles all HTTP traffic. Responsibilities:

- Configures CORS, JSON parsing (1 MB limit), and rate limiting
- Registers route handlers for tracking and analytics
- Mounts the global error handler
- On startup: connects Redis (non-blocking), initializes PostgreSQL schema, starts the buffer flush loop
- Handles graceful shutdown on `SIGINT`/`SIGTERM`

### 3.2 Worker Process (`src/worker.ts`)

A standalone Node.js process that drains the Redis Stream into PostgreSQL. Responsibilities:

- Waits for Redis to become available before proceeding
- Initializes the database schema and Redis consumer group
- Runs a two-phase consume loop (drain pending, then consume new)
- Shuts down gracefully, allowing 3 seconds for the current batch to complete

### 3.3 Redis Producer (`src/queue/producer.ts`)

Handles writing events to the Redis Stream via `XADD`. Uses Redis pipelines for batch operations to minimize round-trips.

### 3.4 Redis Consumer (`src/queue/consumer.ts`)

Handles reading events from the Redis Stream using `XREADGROUP`. Implements:

- **Consumer group initialization** with `MKSTREAM` (idempotent via `BUSYGROUP` check)
- **Pending drain** on startup — re-processes any messages from a previous crash
- **Main consume loop** — `XREADGROUP ... COUNT 500 BLOCK 2000 STREAMS clicks:stream >`
- **processAndAck** — parses JSON, calls batch INSERT, then `XACK`

### 3.5 In-Memory Buffer (`src/buffer/memory.ts`)

A ring buffer that catches events when Redis is unavailable. Periodically attempts to flush events back to Redis every 5 seconds when the connection recovers. If the buffer reaches capacity, the oldest event is evicted.

### 3.6 Middleware

| Module | File | Purpose |
|--------|------|---------|
| Validation | `middleware/validation.ts` | Zod `safeParse` on request body; returns 400 with structured field errors |
| Rate Limiter | `middleware/rateLimiter.ts` | `express-rate-limit` on `/api/track` routes; 1000 req/min per IP |
| Error Handler | `middleware/errorHandler.ts` | Catches unhandled errors; logs and returns 500 |

### 3.7 Database

| Module | File | Purpose |
|--------|------|---------|
| Connection | `database/connection.ts` | PostgreSQL connection pool (`pg.Pool`), health check, graceful close |
| Schema | `database/schema.ts` | `CREATE TABLE IF NOT EXISTS` with 6 indexes; runs on both API and worker startup |

---

## 4. API Documentation

### Base URL

```
http://localhost:3400/api
```

---

### 4.1 Health Check

#### `GET /api/health`

Returns system health status for Redis, PostgreSQL, and the in-memory buffer.

**Response** (`200 OK` when healthy, `503 Service Unavailable` when degraded):

```json
{
  "status": "ok",
  "redis": "connected",
  "database": "connected",
  "bufferSize": 0,
  "timestamp": "2026-03-03T12:00:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | `"ok" \| "degraded"` | `"ok"` if both Redis and PostgreSQL are connected |
| `redis` | `"connected" \| "disconnected"` | Redis connectivity status |
| `database` | `"connected" \| "disconnected"` | PostgreSQL connectivity status |
| `bufferSize` | `number` | Number of events in the in-memory fallback buffer |
| `timestamp` | `string` | ISO 8601 timestamp of the check |

---

### 4.2 Tracking Endpoints

All tracking endpoints are rate-limited to **1000 requests per 60-second window** per IP address.

---

#### `POST /api/track`

Queue a single click event for processing.

**Request Body:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `websiteId` | `string` | No | min 1 char | Site identifier; defaults to `pageUrl` hostname |
| `sessionId` | `string` | **Yes** | min 1 char | Unique session identifier |
| `pageUrl` | `string` | **Yes** | valid URL | Full page URL where the click occurred |
| `elementTag` | `string` | **Yes** | min 1 char | HTML tag name (e.g. `"BUTTON"`, `"A"`, `"DIV"`) |
| `elementId` | `string` | No | — | Element `id` attribute |
| `elementClass` | `string` | No | — | Element `class` attribute |
| `elementText` | `string` | No | max 500 chars | Visible text content of the element |
| `xPos` | `integer` | **Yes** | >= 0 | Click X coordinate in pixels |
| `yPos` | `integer` | **Yes** | >= 0 | Click Y coordinate in pixels |
| `viewportWidth` | `integer` | **Yes** | > 0 | Browser viewport width in pixels |
| `viewportHeight` | `integer` | **Yes** | > 0 | Browser viewport height in pixels |
| `referrer` | `string` | No | — | Document referrer URL |
| `userAgent` | `string` | No | — | Browser user agent string |
| `metadata` | `Record<string, string>` | No | — | Arbitrary key-value metadata |

**Example Request:**

```bash
curl -X POST http://localhost:3400/api/track \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "sess-abc-123",
    "pageUrl": "https://example.com/pricing",
    "elementTag": "BUTTON",
    "elementId": "cta-signup",
    "elementClass": "btn btn-primary",
    "elementText": "Sign Up Now",
    "xPos": 540,
    "yPos": 320,
    "viewportWidth": 1920,
    "viewportHeight": 1080,
    "referrer": "https://google.com",
    "metadata": { "campaign": "spring-sale" }
  }'
```

**Response** (`202 Accepted`):

```json
{
  "queued": true,
  "timestamp": "2026-03-03T12:00:00.000Z"
}
```

**Error Response** (`400 Bad Request` — validation failure):

```json
{
  "error": "Validation failed",
  "details": [
    {
      "path": ["sessionId"],
      "message": "Required"
    }
  ]
}
```

**Error Response** (`429 Too Many Requests` — rate limit exceeded):

```
Too many requests, please try again later.
```

---

#### `POST /api/track/batch`

Queue multiple click events (1 to 1000) in a single request.

**Request Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `events` | `ClickEventInput[]` | **Yes** | min 1, max 1000 elements |

Each element in the `events` array follows the same schema as `POST /api/track`.

**Example Request:**

```bash
curl -X POST http://localhost:3400/api/track/batch \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "sessionId": "sess-001",
        "pageUrl": "https://example.com/home",
        "elementTag": "A",
        "xPos": 100,
        "yPos": 200,
        "viewportWidth": 1920,
        "viewportHeight": 1080
      },
      {
        "sessionId": "sess-001",
        "pageUrl": "https://example.com/home",
        "elementTag": "BUTTON",
        "elementId": "buy-now",
        "xPos": 800,
        "yPos": 600,
        "viewportWidth": 1920,
        "viewportHeight": 1080
      }
    ]
  }'
```

**Response** (`202 Accepted`):

```json
{
  "queued": 2,
  "timestamp": "2026-03-03T12:00:00.123Z"
}
```

---

#### `GET /api/track/status`

Check the current size of the in-memory fallback buffer.

**Response** (`200 OK`):

```json
{
  "bufferSize": 0
}
```

---

### 4.3 Analytics Endpoints

All analytics endpoints share a common set of query parameters for filtering and controlling output.

#### Common Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `from` | `string` | — | ISO 8601 start time (inclusive). Example: `2026-03-01T00:00:00Z` |
| `to` | `string` | — | ISO 8601 end time (inclusive). Example: `2026-03-03T23:59:59Z` |
| `pageUrl` | `string` | — | Filter results to a specific page URL |
| `websiteId` | `string` | — | Filter results to a specific website |
| `granularity` | `string` | `"hour"` | Time bucketing: `minute`, `hour`, `day`, `week`, `month` |
| `limit` | `number` | `20` | Maximum results returned (clamped to `[1, 500]`) |

---

#### `GET /api/analytics/summary`

Returns an aggregated dashboard summary combining totals, top pages, top elements, and a time series.

**Example Request:**

```bash
curl "http://localhost:3400/api/analytics/summary?websiteId=example.com&from=2026-03-01T00:00:00Z"
```

**Response** (`200 OK`):

```json
{
  "totalClicks": 15230,
  "uniqueSessions": 3412,
  "uniquePages": 28,
  "topPages": [
    { "pageUrl": "https://example.com/pricing", "totalClicks": 4200, "uniqueSessions": 1100 },
    { "pageUrl": "https://example.com/home", "totalClicks": 3800, "uniqueSessions": 2200 }
  ],
  "topElements": [
    { "elementTag": "BUTTON", "elementId": "cta-signup", "elementClass": "btn-primary", "elementText": "Sign Up", "totalClicks": 2100 },
    { "elementTag": "A", "elementId": null, "elementClass": "nav-link", "elementText": "Pricing", "totalClicks": 1800 }
  ],
  "clicksOverTime": [
    { "bucket": "2026-03-01T10:00", "count": 342 },
    { "bucket": "2026-03-01T11:00", "count": 518 }
  ]
}
```

**Response Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `totalClicks` | `number` | Total number of click events |
| `uniqueSessions` | `number` | Count of distinct `session_id` values |
| `uniquePages` | `number` | Count of distinct `page_url` values |
| `topPages` | `PageStats[]` | Top 10 pages by total clicks |
| `topElements` | `ElementStats[]` | Top 10 elements by total clicks |
| `clicksOverTime` | `TimeSeriesPoint[]` | Click count time series at requested granularity |

---

#### `GET /api/analytics/clicks-over-time`

Returns click counts bucketed by the requested time granularity.

**Example Request:**

```bash
curl "http://localhost:3400/api/analytics/clicks-over-time?granularity=day&from=2026-03-01"
```

**Response** (`200 OK`):

```json
[
  { "bucket": "2026-03-01", "count": 5120 },
  { "bucket": "2026-03-02", "count": 4830 },
  { "bucket": "2026-03-03", "count": 5280 }
]
```

**Granularity formats:**

| Value | Bucket Format | Example |
|-------|---------------|---------|
| `minute` | `YYYY-MM-DDTHH:MI` | `2026-03-03T14:35` |
| `hour` | `YYYY-MM-DDTHH:00` | `2026-03-03T14:00` |
| `day` | `YYYY-MM-DD` | `2026-03-03` |
| `week` | `IYYY-WIW` | `2026-W10` |
| `month` | `YYYY-MM` | `2026-03` |

---

#### `GET /api/analytics/top-pages`

Returns pages ranked by total click count.

**Example Request:**

```bash
curl "http://localhost:3400/api/analytics/top-pages?websiteId=example.com&limit=5"
```

**Response** (`200 OK`):

```json
[
  { "pageUrl": "https://example.com/pricing", "totalClicks": 4200, "uniqueSessions": 1100 },
  { "pageUrl": "https://example.com/home", "totalClicks": 3800, "uniqueSessions": 2200 },
  { "pageUrl": "https://example.com/docs", "totalClicks": 2100, "uniqueSessions": 900 }
]
```

**Response Item Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `pageUrl` | `string` | The page URL |
| `totalClicks` | `number` | Total clicks on the page |
| `uniqueSessions` | `number` | Distinct session count |

---

#### `GET /api/analytics/top-elements`

Returns UI elements ranked by total click count.

**Example Request:**

```bash
curl "http://localhost:3400/api/analytics/top-elements?pageUrl=https://example.com/pricing&limit=10"
```

**Response** (`200 OK`):

```json
[
  {
    "elementTag": "BUTTON",
    "elementId": "cta-signup",
    "elementClass": "btn btn-primary",
    "elementText": "Sign Up Now",
    "totalClicks": 2100
  },
  {
    "elementTag": "A",
    "elementId": null,
    "elementClass": "nav-link",
    "elementText": "Features",
    "totalClicks": 1400
  }
]
```

**Response Item Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `elementTag` | `string` | HTML tag name |
| `elementId` | `string \| null` | Element `id` attribute |
| `elementClass` | `string \| null` | Element `class` attribute |
| `elementText` | `string \| null` | Visible text content |
| `totalClicks` | `number` | Total clicks on this element |

---

#### `GET /api/analytics/heatmap`

Returns click density data as a grid of viewport-relative percentage coordinates, bucketed into 5% increments.

**Example Request:**

```bash
curl "http://localhost:3400/api/analytics/heatmap?pageUrl=https://example.com/pricing"
```

**Response** (`200 OK`):

```json
[
  { "xPercent": 50, "yPercent": 30, "count": 342 },
  { "xPercent": 75, "yPercent": 15, "count": 218 },
  { "xPercent": 25, "yPercent": 80, "count": 156 }
]
```

**Response Item Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `xPercent` | `number` | Horizontal position as a percentage of viewport width (0-100, 5% increments) |
| `yPercent` | `number` | Vertical position as a percentage of viewport height (0-100, 5% increments) |
| `count` | `number` | Number of clicks in this grid cell |

**Bucketing formula:**

```
xPercent = ROUND(x_pos / viewport_w * 100 / 5) * 5
yPercent = ROUND(y_pos / viewport_h * 100 / 5) * 5
```

---

#### `GET /api/analytics/recent`

Returns the most recent raw click events, ordered by `created_at DESC`.

**Example Request:**

```bash
curl "http://localhost:3400/api/analytics/recent?websiteId=example.com&limit=3"
```

**Response** (`200 OK`):

```json
[
  {
    "id": 15230,
    "websiteId": "example.com",
    "sessionId": "sess-abc-123",
    "pageUrl": "https://example.com/pricing",
    "elementTag": "BUTTON",
    "elementId": "cta-signup",
    "elementClass": "btn btn-primary",
    "elementText": "Sign Up Now",
    "xPos": 540,
    "yPos": 320,
    "viewportWidth": 1920,
    "viewportHeight": 1080,
    "referrer": "https://google.com",
    "userAgent": "Mozilla/5.0 ...",
    "ip": "203.0.113.42",
    "metadata": { "campaign": "spring-sale" },
    "createdAt": "2026-03-03T14:32:01.123Z"
  }
]
```

---

## 5. Database Schema

### Table: `click_events`

```sql
CREATE TABLE IF NOT EXISTS click_events (
    id            BIGSERIAL    PRIMARY KEY,
    website_id    TEXT         NOT NULL DEFAULT 'default',
    session_id    TEXT         NOT NULL,
    page_url      TEXT         NOT NULL,
    element_tag   TEXT         NOT NULL,
    element_id    TEXT,
    element_class TEXT,
    element_text  TEXT,
    x_pos         INTEGER      NOT NULL,
    y_pos         INTEGER      NOT NULL,
    viewport_w    INTEGER      NOT NULL,
    viewport_h    INTEGER      NOT NULL,
    referrer      TEXT,
    user_agent    TEXT,
    ip            TEXT,
    metadata      JSONB,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

### Indexes

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `idx_ce_created_at` | `created_at` | Time-range queries, ordering |
| `idx_ce_website_id` | `website_id` | Website-scoped filtering |
| `idx_ce_session_id` | `session_id` | Session lookups |
| `idx_ce_page_url` | `page_url` | Page-level aggregations |
| `idx_ce_website_created` | `(website_id, created_at)` | Website + time range compound queries |
| `idx_ce_website_page` | `(website_id, page_url)` | Website + page compound queries |

### Entity Relationship

```
┌──────────────────────────────────────┐
│           click_events               │
├──────────────────────────────────────┤
│ PK  id            BIGSERIAL         │
│     website_id    TEXT NOT NULL      │◄── Derived from pageUrl hostname
│     session_id    TEXT NOT NULL      │◄── Client-generated session ID
│     page_url      TEXT NOT NULL      │
│     element_tag   TEXT NOT NULL      │
│     element_id    TEXT               │
│     element_class TEXT               │
│     element_text  TEXT               │
│     x_pos         INTEGER NOT NULL   │
│     y_pos         INTEGER NOT NULL   │
│     viewport_w    INTEGER NOT NULL   │
│     viewport_h    INTEGER NOT NULL   │
│     referrer      TEXT               │
│     user_agent    TEXT               │
│     ip            TEXT               │◄── Extracted from request headers
│     metadata      JSONB              │◄── Arbitrary key-value pairs
│     created_at    TIMESTAMPTZ        │◄── Server-side timestamp
└──────────────────────────────────────┘
```

---

## 6. Type System

All types are defined in `src/types/index.ts` using Zod schemas for runtime validation and TypeScript interfaces for compile-time safety.

### Input Types

**`ClickEventInput`** — The raw shape accepted by `POST /api/track`:

```typescript
interface ClickEventInput {
  websiteId?: string;       // min 1 char
  sessionId: string;        // min 1 char, required
  pageUrl: string;          // valid URL, required
  elementTag: string;       // min 1 char, required
  elementId?: string;
  elementClass?: string;
  elementText?: string;     // max 500 chars
  xPos: number;             // int, >= 0
  yPos: number;             // int, >= 0
  viewportWidth: number;    // int, > 0
  viewportHeight: number;   // int, > 0
  referrer?: string;
  userAgent?: string;
  metadata?: Record<string, string>;
}
```

### Internal Types

**`QueuedEvent`** — Enriched event stored in Redis Stream:

```typescript
interface QueuedEvent {
  websiteId: string;        // resolved from pageUrl if not provided
  sessionId: string;
  pageUrl: string;
  elementTag: string;
  elementId?: string;
  elementClass?: string;
  elementText?: string;
  xPos: number;
  yPos: number;
  viewportWidth: number;
  viewportHeight: number;
  referrer?: string;
  userAgent?: string;
  ip: string | null;        // extracted from request
  metadata?: Record<string, string>;
  receivedAt: string;       // ISO 8601 timestamp
}
```

### Output Types

**`ClickEvent`** — Persisted event returned from database:

```typescript
interface ClickEvent extends ClickEventInput {
  id: number;
  createdAt: string;
  ip: string | null;
}
```

**`AnalyticsSummary`** — Dashboard summary:

```typescript
interface AnalyticsSummary {
  totalClicks: number;
  uniqueSessions: number;
  uniquePages: number;
  topPages: PageStats[];
  topElements: ElementStats[];
  clicksOverTime: TimeSeriesPoint[];
}
```

**`TimeSeriesPoint`** — Time-bucketed click count:

```typescript
interface TimeSeriesPoint {
  bucket: string;    // formatted timestamp
  count: number;
}
```

**`PageStats`** — Per-page aggregate:

```typescript
interface PageStats {
  pageUrl: string;
  totalClicks: number;
  uniqueSessions: number;
}
```

**`ElementStats`** — Per-element aggregate:

```typescript
interface ElementStats {
  elementTag: string;
  elementId: string | null;
  elementClass: string | null;
  elementText: string | null;
  totalClicks: number;
}
```

**`HeatmapPoint`** — Click density grid cell:

```typescript
interface HeatmapPoint {
  xPercent: number;   // 0-100 in 5% steps
  yPercent: number;   // 0-100 in 5% steps
  count: number;
}
```

**`AnalyticsQuery`** — Shared query filter:

```typescript
interface AnalyticsQuery {
  from?: string;
  to?: string;
  pageUrl?: string;
  websiteId?: string;
  granularity?: "minute" | "hour" | "day" | "week" | "month";
  limit?: number;
}
```

---

## 7. Configuration

All configuration is centralized in `src/config.ts` and driven by environment variables with sensible defaults.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| **Server** | | |
| `PORT` | `3400` | API server listen port |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins |
| **PostgreSQL** | | |
| `DB_HOST` | `localhost` | Database hostname |
| `DB_PORT` | `5432` | Database port |
| `DB_NAME` | `click_analytics` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |
| `DB_POOL_SIZE` | `20` | Connection pool size |
| **Redis** | | |
| `REDIS_HOST` | `localhost` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | _(none)_ | Redis password |
| `REDIS_STREAM_KEY` | `clicks:stream` | Redis Stream key name |
| `REDIS_CONSUMER_GROUP` | `click-workers` | Consumer group name |
| `REDIS_MAX_STREAM_LEN` | `1000000` | Max stream length (approximate trimming) |
| **Worker** | | |
| `WORKER_BATCH_SIZE` | `500` | Max events per `XREADGROUP` call |
| `WORKER_BATCH_TIMEOUT_MS` | `2000` | Block timeout for `XREADGROUP` |
| `WORKER_CONSUMER_ID` | `worker-<hostname\|pid>` | Unique consumer identifier |
| **Buffer** | | |
| `BUFFER_MAX_SIZE` | `100000` | Max in-memory buffer capacity |
| `BUFFER_FLUSH_INTERVAL_MS` | `5000` | Buffer flush interval |
| **Rate Limiting** | | |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | `1000` | Max requests per window per IP |

---

## 8. Deployment

### Docker Compose (Production-Ready)

```
┌────────────────────────────────────────────────────────────┐
│                    Docker Compose Stack                     │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │  PostgreSQL   │  │    Redis     │                       │
│  │  16-alpine    │  │  7-alpine    │                       │
│  │  :5432        │  │  :6379       │                       │
│  │  pgdata vol   │  │  redisdata   │                       │
│  │  healthcheck  │  │  AOF on      │                       │
│  └──────┬───────┘  │  noeviction   │                       │
│         │          │  512MB max    │                       │
│         │          │  healthcheck  │                       │
│         │          └──────┬───────┘                        │
│         │                 │                                │
│         │    depends_on   │   depends_on                   │
│         │   (healthy)     │  (healthy)                     │
│         ▼                 ▼                                │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │   API x2     │  │  Worker x2   │                       │
│  │  :3400       │  │  (no port)   │                       │
│  │  Express     │  │  consumer    │                       │
│  │  restart:    │  │  restart:    │                       │
│  │  unless-     │  │  unless-     │                       │
│  │  stopped     │  │  stopped     │                       │
│  └──────────────┘  └──────────────┘                       │
└────────────────────────────────────────────────────────────┘
```

**Commands:**

```bash
# Start the full stack
docker compose up --build

# Scale horizontally
docker compose up --scale api=4 --scale worker=3

# Infrastructure only (for local dev)
docker compose up postgres redis
```

### Local Development

```bash
# Start infrastructure
docker compose up postgres redis

# Install dependencies
npm install

# Terminal 1: API with hot-reload
npm run dev

# Terminal 2: Worker with hot-reload
npm run dev:worker
```

### Build and Run (Production)

```bash
npm run build              # TypeScript → dist/
npm run start              # API: node dist/index.js
npm run start:worker       # Worker: node dist/worker.js
```

### Dockerfile

Multi-stage build using Node.js 20 Alpine:

1. **Builder stage** — Installs all dependencies, compiles TypeScript
2. **Runtime stage** — Copies only `dist/` and production `node_modules`, exposes port 3400

---

## 9. Reliability Guarantees

### Event Loss Prevention Matrix

```
┌─────────────────────┬───────────────────────────────────────────────────────┐
│ Failure Scenario    │ Protection Mechanism                                  │
├─────────────────────┼───────────────────────────────────────────────────────┤
│ Redis unavailable   │ Events stored in in-memory ring buffer (100k cap).   │
│                     │ Auto-flushed to Redis every 5s when connection        │
│                     │ recovers. Oldest events evicted if buffer overflows.  │
├─────────────────────┼───────────────────────────────────────────────────────┤
│ Worker crashes      │ Unacknowledged messages remain in the Redis Stream.  │
│ mid-batch           │ On restart, drainPending() re-reads and re-processes │
│                     │ all pending messages before consuming new ones.       │
├─────────────────────┼───────────────────────────────────────────────────────┤
│ API server crashes  │ Events already written to Redis via XADD are safe.   │
│                     │ Redis uses AOF persistence to survive restarts.       │
│                     │ noeviction policy prevents data loss under memory     │
│                     │ pressure.                                             │
├─────────────────────┼───────────────────────────────────────────────────────┤
│ PostgreSQL slow     │ Workers batch 500 events per INSERT to minimize       │
│                     │ round-trips. Redis Stream absorbs the write backlog.  │
│                     │ Stream capacity: ~1M messages before trimming.        │
├─────────────────────┼───────────────────────────────────────────────────────┤
│ Traffic spike       │ Rate limiter throttles at 1000 req/min per IP.       │
│                     │ Multiple API replicas distribute load.               │
│                     │ Redis Streams absorb burst writes.                   │
│                     │ Multiple worker replicas increase drain throughput.   │
├─────────────────────┼───────────────────────────────────────────────────────┤
│ Redis full          │ Stream trimmed to ~1M messages (approximate).        │
│                     │ noeviction policy causes XADD to fail gracefully →   │
│                     │ events go to in-memory buffer.                       │
├─────────────────────┼───────────────────────────────────────────────────────┤
│ Network partition   │ ioredis auto-reconnects with backoff. Buffer         │
│                     │ captures events during disconnection.                │
└─────────────────────┴───────────────────────────────────────────────────────┘
```

### Scaling Characteristics

| Component | Scaling Method | Bottleneck |
|-----------|---------------|------------|
| API replicas | `--scale api=N` | Stateless; limited only by Redis XADD throughput |
| Worker replicas | `--scale worker=N` | Consumer group distributes stream entries; limited by PostgreSQL write throughput |
| Redis | Vertical (memory) | 512 MB default; increase `maxmemory` for larger bursts |
| PostgreSQL | Vertical (CPU/IO) + connection pooling | Batch INSERT of 500 rows amortizes per-event overhead |

### Graceful Shutdown Sequence

```
API Server:
  1. Stop accepting new connections
  2. Stop buffer flush timer
  3. Close HTTP server
  4. Close Redis connection
  5. Close PostgreSQL pool
  6. Exit

Worker:
  1. Set running = false (stops consume loop)
  2. Wait 3 seconds for current batch to complete
  3. Close Redis connection
  4. Close PostgreSQL pool
  5. Exit
```

---

## Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 20 (Alpine) |
| Language | TypeScript | 5.6 |
| HTTP Server | Express | 4.21 |
| Validation | Zod | 3.23 |
| Message Queue | Redis Streams (ioredis) | Redis 7 / ioredis 5.4 |
| Database | PostgreSQL (pg) | PostgreSQL 16 / pg 8.13 |
| Rate Limiting | express-rate-limit | 7.4 |
| Containerization | Docker + Docker Compose | Multi-stage build |

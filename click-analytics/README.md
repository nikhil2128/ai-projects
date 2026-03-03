# Click Analytics — High-Throughput Edition

A production-grade click analytics backend designed for **high traffic** across multiple websites, with **zero event loss** guarantees.

## Architecture

```
                         ┌──────────────────────────────────────┐
  Websites ──────────►   │  Express API  (rate-limited, scaled) │
  (POST /api/track)      │                                      │
                         │  1. Validate with Zod                │
                         │  2. Push to Redis Stream (XADD)      │
                         │  3. Fallback → in-memory buffer      │
                         │  4. Return 202 Accepted              │
                         └──────────────┬───────────────────────┘
                                        │
                              ┌─────────▼──────────┐
                              │    Redis Streams    │
                              │  (durable queue,    │
                              │   consumer groups)  │
                              └─────────┬──────────┘
                                        │
                         ┌──────────────▼───────────────────────┐
                         │  Worker Process  (scaled replicas)   │
                         │                                      │
                         │  1. XREADGROUP in batches of 500     │
                         │  2. Multi-row INSERT into PostgreSQL │
                         │  3. XACK processed messages          │
                         │  4. Auto-recover pending on restart  │
                         └──────────────┬───────────────────────┘
                                        │
                              ┌─────────▼──────────┐
                              │    PostgreSQL       │
                              │  (indexed, pooled)  │
                              └────────────────────┘
```

### Why This Doesn't Lose Events

| Scenario | Protection |
|---|---|
| Redis is down | In-memory ring buffer (100k events), auto-flushed when Redis recovers |
| Worker crashes mid-batch | Unacknowledged messages stay in the stream; worker reclaims them on restart |
| API server crashes | Events already in Redis Stream (persisted with AOF) |
| Database is slow | Workers batch 500 rows per INSERT; Redis buffers the backlog |
| Traffic spike | Rate limiter + multiple API/worker replicas + Redis absorbs bursts |

## Quick Start

### With Docker Compose (recommended)

```bash
docker compose up --build
```

This starts PostgreSQL, Redis, 2 API replicas, and 2 worker replicas.

### Local Development

```bash
# Start infrastructure
docker compose up postgres redis

# Install dependencies
npm install

# Run API server (hot-reload)
npm run dev

# Run worker (separate terminal, hot-reload)
npm run dev:worker
```

The API listens on port **3400** by default.

## API Reference

### Tracking

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/track` | Queue a single click event |
| POST | `/api/track/batch` | Queue up to 1000 click events |
| GET | `/api/track/status` | Check in-memory buffer size |

**POST /api/track** body:

```json
{
  "websiteId": "example.com",
  "sessionId": "abc-123",
  "pageUrl": "https://example.com/pricing",
  "elementTag": "BUTTON",
  "elementId": "cta-signup",
  "elementClass": "btn btn-primary",
  "elementText": "Sign Up",
  "xPos": 540,
  "yPos": 320,
  "viewportWidth": 1920,
  "viewportHeight": 1080,
  "referrer": "https://google.com",
  "metadata": { "campaign": "spring-sale" }
}
```

- `websiteId` is optional — defaults to the hostname from `pageUrl`.
- Response: `202 Accepted` with `{ queued: true, timestamp }`.

### Analytics

All analytics endpoints accept these optional query parameters:

| Param | Type | Description |
|---|---|---|
| `from` | string | ISO 8601 start time filter |
| `to` | string | ISO 8601 end time filter |
| `pageUrl` | string | Filter to a specific page |
| `websiteId` | string | Filter to a specific website |
| `granularity` | string | `minute`, `hour`, `day`, `week`, `month` |
| `limit` | number | Max results (default 20, max 500) |

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/summary` | Aggregated dashboard summary |
| GET | `/api/analytics/clicks-over-time` | Time-series click counts |
| GET | `/api/analytics/top-pages` | Pages ranked by total clicks |
| GET | `/api/analytics/top-elements` | Elements ranked by total clicks |
| GET | `/api/analytics/heatmap` | Click position heatmap (5% grid) |
| GET | `/api/analytics/recent` | Most recent raw click events |

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Redis + PostgreSQL connectivity check |

## Configuration

See [`.env.example`](.env.example) for all environment variables.

## Scaling

```bash
# Scale API to 4 replicas and workers to 3
docker compose up --scale api=4 --scale worker=3
```

Redis consumer groups automatically distribute stream entries across worker replicas, so adding workers increases write throughput linearly.

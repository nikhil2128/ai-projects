# Click Analytics — ClickHouse Edition

A production-grade click analytics backend built for high-throughput workloads with a queue-first ingestion strategy and ClickHouse as the analytics store.

## Architecture

### Direct ingestion (default)

```
Websites -> Express API -> Redis Streams -> Worker -> ClickHouse MergeTree
```

- API validates payloads with Zod and enqueues to Redis Streams.
- Worker consumes in batches and persists to ClickHouse using `JSONEachRow`.
- Analytics endpoints query ClickHouse directly for low-latency aggregates.

### Recommended high-scale ingestion

```
Websites -> Express API -> Redis Streams -> Worker -> Kinesis Data Streams
      -> Firehose -> S3 (partitioned objects) -> ClickHouse S3Queue -> click_events
```

- Use this mode when ingestion throughput is much higher than immediate query volume.
- Set `INGESTION_MODE=kinesis-s3-clickhouse` to make workers publish to Kinesis.
- Configure Firehose delivery to S3 and ClickHouse `S3Queue` ingestion (SQL provided in `docs/clickhouse-s3-pipeline.sql`).

## Why this is resilient

| Scenario | Protection |
|---|---|
| Redis unavailable | In-memory fallback buffer with periodic flush back to Redis |
| Worker crash mid-batch | Unacknowledged stream entries stay pending and are reclaimed |
| ClickHouse slow/unavailable | Redis stream backlog absorbs pressure |
| Kinesis partial batch failure | Worker does not ACK Redis entries unless full batch is persisted |
| Traffic spikes | Horizontal API/worker scaling + Redis stream buffering |

## Quick start

### Docker Compose

```bash
docker compose up --build
```

Starts ClickHouse, Redis, API replicas, and worker replicas.

### Local development

```bash
# Start infrastructure
docker compose up clickhouse redis

# Install dependencies
npm install

# API (hot reload)
npm run dev

# Worker (hot reload, separate terminal)
npm run dev:worker
```

API default: `http://localhost:3400`.

## API reference

### Tracking

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/track` | Queue a single click event |
| POST | `/api/track/batch` | Queue up to 1000 click events |
| GET | `/api/track/status` | In-memory buffer size |

### Analytics

Query params:

| Param | Type | Description |
|---|---|---|
| `from` | string | ISO 8601 start time |
| `to` | string | ISO 8601 end time |
| `pageUrl` | string | Filter by page |
| `websiteId` | string | Filter by website |
| `granularity` | string | `minute`, `hour`, `day`, `week`, `month` |
| `limit` | number | Max rows (default 20, max 500) |

Endpoints:

| Method | Endpoint |
|---|---|
| GET | `/api/analytics/summary` |
| GET | `/api/analytics/clicks-over-time` |
| GET | `/api/analytics/top-pages` |
| GET | `/api/analytics/top-elements` |
| GET | `/api/analytics/heatmap` |
| GET | `/api/analytics/recent` |

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Redis + ClickHouse health |

## Configuration

See [`.env.example`](.env.example).

### Important variables

- `CLICKHOUSE_URL`, `CLICKHOUSE_DATABASE`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD`
- `INGESTION_MODE`:
  - `clickhouse` (worker writes directly to ClickHouse)
  - `kinesis-s3-clickhouse` (worker writes to Kinesis)
- `KINESIS_STREAM_NAME`, `AWS_REGION` (required in Kinesis mode)

Pipeline setup guides:

- `docs/kinesis-s3-clickhouse.md`
- `docs/clickhouse-s3-pipeline.sql`

## Scale workers and API

```bash
docker compose up --scale api=4 --scale worker=4
```

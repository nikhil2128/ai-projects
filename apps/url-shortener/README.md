# URL Shortener

A production-ready, cost-optimized URL shortening service built with TypeScript, Fastify, and SQLite.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client     │────▶│   Fastify    │────▶│  LRU Cache   │
│              │◀────│   Server     │◀────│  (in-memory) │
└──────────────┘     └──────┬───────┘     └──────┬───────┘
                            │                     │ miss
                            │              ┌──────▼───────┐
                            │              │   SQLite DB   │
                            └──────────────│   (WAL mode)  │
                                           └──────────────┘
```

### Why this stack?

| Component | Choice | Why |
|-----------|--------|-----|
| Runtime | Node.js + TypeScript | Type safety, ecosystem, async I/O |
| HTTP | Fastify | 3x faster than Express, built-in validation |
| Database | SQLite (WAL mode) | Zero infrastructure cost, no separate server |
| Cache | Custom LRU (in-memory) | Sub-millisecond reads for hot URLs |
| Encoding | Base62 | Compact codes (7 chars = 3.5T unique URLs) |

### Latency strategy

1. **Cache-first reads**: Redirect lookups hit the in-memory LRU cache first (O(1))
2. **SQLite WAL mode**: Readers never block writers — concurrent reads during writes
3. **301 redirects**: Browsers cache permanently, eliminating repeat server hits
4. **Fire-and-forget analytics**: Click counting runs via `setImmediate`, never blocking redirects
5. **Prepared statements**: All SQL queries are pre-compiled at startup

## API

### Shorten a URL

```bash
curl -X POST http://localhost:3100/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/very/long/path/to/some/resource?param=value"}'
```

Response:
```json
{
  "short_url": "http://localhost:3100/6Lazr0",
  "short_code": "6Lazr0",
  "original_url": "https://example.com/very/long/path/to/some/resource?param=value",
  "created_at": "2025-01-01 12:00:00"
}
```

### Redirect (open short URL)

```bash
curl -L http://localhost:3100/6Lazr0
```

### Get URL info

```bash
curl http://localhost:3100/api/urls/6Lazr0
```

### System stats

```bash
curl http://localhost:3100/api/stats
```

### Health check

```bash
curl http://localhost:3100/health
```

## Setup

```bash
# Install dependencies
npm install

# Development (with hot reload)
npm run dev

# Build and run
npm run build
npm start
```

## Configuration

All settings via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3100` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `BASE_URL` | `http://localhost:3100` | Public base URL for generated short links |
| `DB_PATH` | `./data/urls.db` | SQLite database file path |
| `CACHE_MAX_SIZE` | `50000` | Max entries in the LRU cache |
| `CACHE_TTL_MS` | `3600000` | Cache entry TTL (1 hour) |
| `RATE_LIMIT_MAX` | `100` | Max requests per window per IP |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (1 minute) |
| `SHORT_CODE_LENGTH` | `7` | Length of generated short codes |
| `LOG_LEVEL` | `info` | Pino log level |

## Docker

```bash
# Build
docker build -t url-shortener .

# Run with persistent storage
docker run -d \
  -p 3100:3100 \
  -v url-data:/app/data \
  -e BASE_URL=https://short.example.com \
  url-shortener
```

## Cost analysis

| Resource | Cost |
|----------|------|
| Database | $0 (SQLite, no server) |
| Cache | $0 (in-process memory) |
| Compute | Single process, ~30MB RAM |
| Storage | ~100 bytes per URL |

A single $5/month VPS can handle millions of URLs and thousands of redirects/second.

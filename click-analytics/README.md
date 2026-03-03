# Click Analytics Backend

A TypeScript backend service for tracking and analyzing website click events. Uses Express + SQLite (via `better-sqlite3`) for a zero-dependency-infrastructure setup.

## Quick Start

```bash
npm install
npm run dev      # development with hot-reload
npm run build    # compile TypeScript
npm start        # run compiled output
```

The server starts on port **3400** by default (override with `PORT` env var).

## API Reference

### Tracking

| Method | Endpoint             | Description                    |
|--------|----------------------|--------------------------------|
| POST   | `/api/track`         | Record a single click event    |
| POST   | `/api/track/batch`   | Record up to 1000 click events |

**POST /api/track** body:

```json
{
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

### Analytics

All analytics endpoints accept these optional query parameters:

| Param         | Type   | Description                              |
|---------------|--------|------------------------------------------|
| `from`        | string | ISO 8601 start time filter               |
| `to`          | string | ISO 8601 end time filter                 |
| `pageUrl`     | string | Filter to a specific page                |
| `granularity` | string | `minute`, `hour`, `day`, `week`, `month` |
| `limit`       | number | Max results (default 20, max 500)        |

| Method | Endpoint                        | Description                              |
|--------|---------------------------------|------------------------------------------|
| GET    | `/api/analytics/summary`        | Aggregated dashboard summary             |
| GET    | `/api/analytics/clicks-over-time` | Time-series click counts               |
| GET    | `/api/analytics/top-pages`      | Pages ranked by total clicks             |
| GET    | `/api/analytics/top-elements`   | Elements ranked by total clicks          |
| GET    | `/api/analytics/heatmap`        | Click position heatmap (5% grid buckets) |
| GET    | `/api/analytics/recent`         | Most recent raw click events             |

### Health

| Method | Endpoint       | Description  |
|--------|----------------|--------------|
| GET    | `/api/health`  | Health check |

## Configuration

| Env Variable   | Default                | Description                      |
|----------------|------------------------|----------------------------------|
| `PORT`         | `3400`                 | Server port                      |
| `DB_PATH`      | `./data/clicks.db`     | SQLite database file path        |
| `CORS_ORIGINS` | `*`                    | Comma-separated allowed origins  |

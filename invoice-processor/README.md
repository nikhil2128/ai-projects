# Invoice Processor API

A production-ready NestJS service for uploading, processing, and searching PDF invoices. Uses async queue-based processing to handle **200+ invoice uploads per minute**.

## Architecture

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Client     │────▶│  NestJS API     │────▶│  PostgreSQL  │
│  (upload PDF)│     │  (Controller)   │     │  (Invoices)  │
└──────────────┘     └────────┬────────┘     └──────────────┘
                              │
                              │ enqueue job
                              ▼
                     ┌─────────────────┐
                     │  Redis (BullMQ) │
                     │  Job Queue      │
                     └────────┬────────┘
                              │
                              │ dequeue & process
                              ▼
                     ┌─────────────────┐     ┌──────────────────┐
                     │  Queue Worker   │────▶│ Extraction       │
                     │  (Processor)    │     │ Strategy         │
                     └─────────────────┘     │ (Regex / OpenAI) │
                                             └──────────────────┘
```

### Key Design Decisions

1. **Async Queue Processing (BullMQ + Redis)**: Upload endpoint immediately returns `202 Accepted` and enqueues a job. Workers process invoices in the background with configurable concurrency (default: 10 workers) and rate limiting (200 jobs/min).

2. **Strategy Pattern for Extraction**: Pluggable extraction strategies:
   - **Regex Strategy** (default): Zero external dependencies. Uses `pdf-parse` + regex patterns. Works well for standard invoice formats.
   - **OpenAI Strategy**: LLM-based extraction via structured prompts. Far more accurate for diverse invoice formats. Requires `OPENAI_API_KEY`.

3. **Retry with Exponential Backoff**: Failed extractions are retried up to 3 times (configurable) with exponential backoff. After all retries are exhausted, the invoice is marked as `FAILED` with an error message.

4. **Rate Limiting**: NestJS Throttler configured for 200 requests/minute per IP, protecting against abuse.

5. **Health Checks**: `/api/v1/health` endpoint with database connectivity check for load balancer integration.

## API Endpoints

### Upload Invoice
```
POST /api/v1/invoices/upload
Content-Type: multipart/form-data

Body: file (PDF, max 10MB)

Response (202):
{
  "id": "uuid",
  "originalFilename": "invoice.pdf",
  "status": "pending",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "message": "Invoice uploaded successfully. Processing has been queued."
}
```

### Get Invoice Status
```
GET /api/v1/invoices/:id/status

Response (200):
{
  "id": "uuid",
  "originalFilename": "invoice.pdf",
  "status": "completed",          // pending | processing | completed | failed
  "attempts": 1,
  "vendorName": "Acme Corp",
  "amount": 1500.00,
  "tax": 150.00,
  "dueDate": "2024-03-15",
  "confidence": 0.85,
  "errorMessage": null,
  "createdAt": "...",
  "updatedAt": "...",
  "processedAt": "..."
}
```

### Search Invoices
```
GET /api/v1/invoices/search?vendorName=Acme&amountMin=100&amountMax=5000&dueDateFrom=2024-01-01&page=1&limit=20&sortBy=amount&sortOrder=DESC

Response (200):
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 42,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Health Check
```
GET /api/v1/health
```

## Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (for PostgreSQL and Redis)

### Setup

```bash
# 1. Navigate to the project
cd invoice-processor

# 2. Install dependencies
npm install

# 3. Start infrastructure (PostgreSQL + Redis)
docker compose up -d postgres redis

# 4. Create .env from example
cp .env.example .env

# 5. Start the application
npm run start:dev
```

The API will be available at `http://localhost:3000/api/v1`.
Swagger docs at `http://localhost:3000/api/docs`.

### Docker (full stack)

```bash
docker compose up --build
```

## Testing

```bash
# Unit tests
npm test

# Unit tests with coverage
npm run test:cov

# E2E tests (requires running PostgreSQL + Redis)
docker compose up -d postgres redis
npm run test:e2e
```

## Configuration

All configuration via environment variables (see `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP server port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `invoice_user` | PostgreSQL user |
| `DB_PASSWORD` | `invoice_pass` | PostgreSQL password |
| `DB_DATABASE` | `invoice_processor` | PostgreSQL database name |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `UPLOAD_DIR` | `./uploads` | Directory for uploaded PDFs |
| `QUEUE_CONCURRENCY` | `10` | Number of concurrent workers |
| `QUEUE_MAX_RETRIES` | `3` | Max retry attempts per invoice |
| `QUEUE_RETRY_DELAY_MS` | `5000` | Base delay between retries |
| `EXTRACTION_STRATEGY` | `regex` | `regex` or `openai` |
| `OPENAI_API_KEY` | - | Required if strategy is `openai` |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model to use |
| `THROTTLE_TTL_SECONDS` | `60` | Rate limit window |
| `THROTTLE_LIMIT` | `200` | Max requests per window |

## Scaling Considerations

- **Horizontal scaling**: Run multiple app instances behind a load balancer. BullMQ + Redis ensures jobs are distributed across workers.
- **Queue concurrency**: Tune `QUEUE_CONCURRENCY` based on CPU/memory per instance.
- **Rate limiter at 200/min**: Configurable via `THROTTLE_LIMIT`. For higher throughput, increase and add more worker instances.
- **Database connection pooling**: Configured with max 20 connections per instance.
- **File storage**: For production, replace local disk storage with S3/GCS by implementing a storage adapter.

## Project Structure

```
src/
├── main.ts                          # Bootstrap, global pipes, Swagger
├── app.module.ts                    # Root module wiring
├── config/
│   └── configuration.ts             # Typed configuration loader
├── common/
│   └── filters/
│       └── all-exceptions.filter.ts # Global error handler
├── extraction/
│   ├── extraction.module.ts         # DI wiring with strategy factory
│   ├── extraction.service.ts        # Facade over active strategy
│   ├── interfaces/
│   │   └── extraction-result.interface.ts
│   └── strategies/
│       ├── regex-extraction.strategy.ts    # Default: pdf-parse + regex
│       └── openai-extraction.strategy.ts   # Optional: LLM-based
├── health/
│   ├── health.module.ts
│   └── health.controller.ts
└── invoices/
    ├── invoices.module.ts
    ├── invoices.controller.ts       # REST endpoints
    ├── invoices.service.ts          # Business logic
    ├── invoices.processor.ts        # BullMQ worker
    ├── entities/
    │   └── invoice.entity.ts        # TypeORM entity
    ├── enums/
    │   └── invoice-status.enum.ts
    └── dto/
        ├── upload-invoice-response.dto.ts
        ├── invoice-status-response.dto.ts
        ├── search-invoices.dto.ts
        └── search-invoices-response.dto.ts
```

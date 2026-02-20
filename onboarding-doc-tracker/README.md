# Onboarding Document Tracker

A multi-tenant, serverless SaaS system that automates employee onboarding document collection. Employees email their documents (PDFs) to a tenant-specific address; the system parses the email, normalizes filenames, uploads documents to the HR team's OneDrive, generates a sharing link, and notifies HR via email — all without manual intervention.

## Table of Contents

- [How It Works](#how-it-works)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Multi-Tenancy](#multi-tenancy)
- [Security](#security)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## How It Works

```
Employee sends email          System processes automatically          HR receives notification
with PDF attachments    --->  parses, normalizes, uploads to    ---> with OneDrive folder link
to acme@docs.example.com     HR's OneDrive                          containing organized docs
```

**End-to-end flow:**

1. **Employee** emails PDF documents (passport, license, etc.) to a tenant-specific address (e.g. `acme@docs.example.com`)
2. **AWS SES** receives the email and stores the raw MIME message in **S3** (`incoming/` prefix)
3. **S3** fires an event notification to **SQS**
4. **Lambda** picks up the SQS message and triggers the processing pipeline:
   - Parses the raw email with `mailparser` to extract sender info and PDF attachments
   - Resolves the tenant from the recipient email address via DynamoDB GSI lookup
   - Checks for duplicate processing (idempotency via `messageId`)
   - Normalizes document filenames (e.g. `passport2.pdf` → `john_doe_passport.pdf`)
   - Creates an employee subfolder in the HR user's OneDrive via Microsoft Graph API
   - Uploads all documents concurrently with bounded parallelism
   - Generates an organization-scoped sharing link
   - Sends an HTML notification email to HR via SES
   - Records the processing result in a per-tenant DynamoDB tracking table

---

## Architecture Overview

![System Architecture Diagram](docs/architecture-diagram.png)

```
┌─────────────┐     ┌─────────┐     ┌─────────────────┐     ┌──────────────┐
│  Employee    │────>│ AWS SES │────>│  S3 Bucket      │────>│  SQS Queue   │
│  (Email)     │     │ Receipt │     │  (incoming/*)   │     │  (+DLQ)      │
└─────────────┘     │ Rule    │     │  KMS encrypted  │     │  KMS encrypt │
                    └─────────┘     └─────────────────┘     └──────┬───────┘
                                                                   │
                                                                   ▼
                                                            ┌──────────────┐
                                                            │   Lambda     │
                                                            │  (Node 20)  │
                                                            └──────┬───────┘
                       ┌───────────────────────────────────────────┤
                       │                   │                       │
                       ▼                   ▼                       ▼
                ┌─────────────┐   ┌────────────────┐    ┌───────────────────┐
                │  DynamoDB   │   │ Secrets Manager│    │  Microsoft Graph  │
                │  - Tenants  │   │ Azure Client   │    │  API (OneDrive)   │
                │  - Tracking │   │ Secrets        │    │  - Create folder  │
                │  (per tenant│   │ KMS encrypted  │    │  - Upload files   │
                │   tables)   │   └────────────────┘    │  - Sharing links  │
                └─────────────┘                         └───────────────────┘
                       │
                       │                         ┌──────────────┐
                       └────────────────────────>│   AWS SES    │
                                                 │  (Send HR    │
                                                 │  notification│
                                                 └──────────────┘
```

> For a detailed architecture deep-dive with component diagrams, data flow, and design decisions, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

> For the full API specification, see [docs/API.md](docs/API.md).

---

## Tech Stack

| Layer              | Technology                                           |
|--------------------|------------------------------------------------------|
| **Runtime**        | Node.js 20                                           |
| **Language**       | TypeScript 5.6 (strict mode)                         |
| **Framework**      | Express.js 4.21                                      |
| **Compute**        | AWS Lambda (serverless) / Docker (containerized)     |
| **Email Ingest**   | AWS SES (receiving)                                  |
| **Queue**          | AWS SQS (with dead-letter queue)                     |
| **Storage**        | AWS S3 (raw emails), AWS DynamoDB (tenant + tracking)|
| **Secrets**        | AWS Secrets Manager                                  |
| **Encryption**     | AWS KMS (customer-managed key, auto-rotation)        |
| **File Storage**   | Microsoft OneDrive (via Graph API)                   |
| **Notifications**  | AWS SES (sending)                                    |
| **Auth (Azure)**   | OAuth2 Client Credentials (Azure AD)                 |
| **IaC**            | AWS SAM (CloudFormation)                             |
| **Testing**        | Vitest 3.0 (90% coverage threshold)                  |
| **Linting**        | ESLint 9 with TypeScript ESLint                      |

---

## Project Structure

```
onboarding-doc-tracker/
├── src/
│   ├── handlers/
│   │   └── process-emails.handler.ts    # Lambda entry point (SQS → processing)
│   ├── middleware/
│   │   └── security.ts                  # Helmet, rate limiting, API key auth, audit logging
│   ├── routes/
│   │   ├── health.ts                    # GET /health
│   │   ├── tenants.ts                   # CRUD /api/tenants
│   │   └── trigger.ts                   # POST /trigger (manual processing)
│   ├── services/
│   │   ├── document-normalizer.ts       # Filename normalization & document type detection
│   │   ├── email-parser.ts              # MIME parsing from S3 (mailparser)
│   │   ├── graph-client.ts              # Microsoft Graph API client with token caching
│   │   ├── notification.service.ts      # HTML email notifications via SES
│   │   ├── onedrive.service.ts          # OneDrive folder/file operations
│   │   ├── processing.service.ts        # Core orchestration pipeline
│   │   ├── secrets.service.ts           # AWS Secrets Manager with in-memory cache
│   │   ├── tenant.service.ts            # Tenant CRUD + DynamoDB table lifecycle
│   │   └── tracking.service.ts          # Per-tenant processing record management
│   ├── utils/
│   │   ├── resilience.ts                # Retry with exponential backoff, bounded concurrency
│   │   └── sanitize.ts                  # Input validation, HTML escaping, timing-safe compare
│   ├── app.ts                           # Express app setup (middleware, routes)
│   ├── config.ts                        # Centralized configuration from env vars
│   ├── index.ts                         # Local dev server entry point
│   └── types.ts                         # TypeScript interfaces and type definitions
├── src/__tests__/                       # Unit, integration, and E2E tests
├── .env.example                         # Environment variable template
├── Dockerfile                           # Multi-stage production Docker build
├── template.yaml                        # AWS SAM infrastructure template
├── tsconfig.json                        # TypeScript configuration (strict)
├── eslint.config.mjs                    # ESLint configuration
├── vitest.config.ts                     # Vitest configuration (90% coverage)
└── package.json                         # Dependencies and scripts
```

---

## Prerequisites

- **Node.js** >= 20.x
- **npm** >= 9.x
- **AWS CLI** v2 (configured with appropriate credentials)
- **AWS SAM CLI** (for deployment)
- **Azure AD App Registration** (for each tenant — Graph API access to OneDrive)
- **AWS SES** domain/email verification in the target region
- **Docker** (optional, for containerized deployment)

---

## Getting Started

### 1. Clone and install

```bash
cd onboarding-doc-tracker
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your values (see Configuration section below)
```

### 3. Run locally

```bash
npm run dev          # Starts Express server on port 3005 with hot-reload
```

### 4. Run tests

```bash
npm test             # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # With coverage report (90% threshold)
```

### 5. Build

```bash
npm run build        # Compile TypeScript → dist/
npm run typecheck    # Type-check without emitting
npm run lint         # Lint source files
```

---

## Configuration

All configuration is managed through environment variables. See `.env.example` for the full template.

### Server

| Variable    | Default       | Description                    |
|-------------|---------------|--------------------------------|
| `PORT`      | `3005`        | HTTP server port (local dev)   |
| `NODE_ENV`  | `development` | `development` or `production`  |

### AWS Resources

| Variable               | Default                              | Description                              |
|------------------------|--------------------------------------|------------------------------------------|
| `AWS_REGION`           | `us-east-1`                          | AWS region for all services              |
| `DYNAMODB_TABLE_PREFIX`| `onboarding-doc-tracker-tracking`    | Prefix for per-tenant tracking tables    |
| `TENANTS_TABLE`        | `onboarding-doc-tenants`             | DynamoDB table for tenant configs        |
| `EMAIL_BUCKET`         | `onboarding-doc-emails`              | S3 bucket where SES deposits emails      |
| `KMS_KEY_ARN`          | *(required in production)*           | KMS key ARN for encryption at rest       |
| `SECRETS_PREFIX`       | `onboarding-doc-tracker/tenants`     | Secrets Manager name prefix              |

### Security

| Variable                 | Default   | Description                              |
|--------------------------|-----------|------------------------------------------|
| `API_KEY`                | *(required in production)* | API key for protected endpoints |
| `RATE_LIMIT_WINDOW_MS`   | `60000`   | Rate limit window (ms)                   |
| `RATE_LIMIT_MAX_REQUESTS` | `60`     | Max requests per window per IP           |
| `CORS_ALLOWED_ORIGINS`   | `*`       | Comma-separated allowed origins          |
| `MAX_REQUEST_BODY_BYTES` | `1048576` | Max request body size (1MB default)      |
| `SECRETS_CACHE_TTL_MS`   | `300000`  | In-memory secrets cache TTL (5 min)      |

### Processing Tuning

| Variable             | Default | Description                              |
|----------------------|---------|------------------------------------------|
| `EMAIL_CONCURRENCY`  | `5`     | Max concurrent email processing          |
| `UPLOAD_CONCURRENCY` | `3`     | Max concurrent file uploads per email    |
| `RETRY_MAX_ATTEMPTS` | `3`     | Max retry attempts for transient errors  |
| `RETRY_BASE_DELAY_MS`| `500`   | Initial retry backoff delay              |
| `RETRY_MAX_DELAY_MS` | `15000` | Maximum retry backoff delay              |

---

## Deployment

### AWS SAM (Recommended)

The `template.yaml` defines the complete infrastructure: KMS key, S3 bucket, SQS queues, Lambda, DynamoDB tables, SES receipt rules, and all IAM permissions.

```bash
# Build
sam build

# Deploy (guided — first time)
sam deploy --guided

# Deploy (subsequent)
sam deploy --parameter-overrides \
  ApiKey=your-secret-api-key \
  OnboardingDomain=docs.example.com
```

**SAM template parameters:**

| Parameter          | Description                                     |
|--------------------|-------------------------------------------------|
| `ApiKey`           | API key for tenant management (NoEcho)           |
| `OnboardingDomain` | Domain for receiving emails (e.g. `docs.example.com`) |
| `MaxRetries`       | SQS retry count before DLQ (default: 3)          |
| `CorsAllowedOrigins` | Allowed CORS origins (default: `*`)            |

**Post-deployment steps:**
1. Activate the SES receipt rule set (manual step in AWS Console)
2. Verify the `OnboardingDomain` in SES for email receiving
3. Verify sender email addresses (or domain) for SES sending
4. Register tenants via the `POST /api/tenants` endpoint

### Docker

```bash
docker build -t onboarding-doc-tracker .
docker run -p 3005:3005 --env-file .env onboarding-doc-tracker
```

The Docker image uses a multi-stage build with Alpine, runs as a non-root user, and includes a built-in health check.

---

## API Reference

All protected endpoints require the `x-api-key` header.

### Health Check

```
GET /health
```

Returns service status. No authentication required.

### Tenant Management

```
POST   /api/tenants       Create a new tenant
GET    /api/tenants       List all tenants
GET    /api/tenants/:id   Get tenant by ID
PUT    /api/tenants/:id   Update tenant
DELETE /api/tenants/:id   Delete tenant (cascading: secret + tracking table)
```

### Manual Trigger

```
POST /trigger
Body: { "key": "incoming/<s3-object-key>" }
```

Manually triggers email processing for a specific S3 object.

> For complete request/response schemas, error codes, and examples, see [docs/API.md](docs/API.md).

---

## Multi-Tenancy

The system is designed for full tenant isolation:

- **Per-tenant receiving email**: Each tenant is assigned a unique email address (e.g. `acme@docs.example.com`). Incoming emails are routed to the correct tenant via a DynamoDB Global Secondary Index on `receivingEmail`.
- **Per-tenant DynamoDB tracking table**: Each tenant gets a dedicated tracking table (`{prefix}-{tenantId}`) to store processing records, preventing cross-tenant data leakage.
- **Per-tenant Azure credentials**: Azure AD client secrets are stored individually in AWS Secrets Manager, referenced by ARN from the tenant's DynamoDB record. Secrets are never stored in DynamoDB.
- **Per-tenant OneDrive**: Each tenant configures their own HR user's OneDrive and root folder for document storage.
- **Per-tenant SES sender**: Each tenant specifies their own verified SES sender address for HR notifications.

### Tenant Lifecycle

| Action   | Resources Created / Deleted                                      |
|----------|------------------------------------------------------------------|
| **Create** | DynamoDB tenant record + Secrets Manager secret + Tracking table |
| **Update** | DynamoDB record updated; secret rotated if `azureClientSecret` changes |
| **Delete** | DynamoDB record + Secrets Manager secret (7-day recovery) + Tracking table |

---

## Security

### Defense in Depth

| Layer                  | Mechanism                                                    |
|------------------------|--------------------------------------------------------------|
| **Encryption at rest** | Customer-managed KMS key for S3, SQS, DynamoDB, Secrets Manager |
| **Encryption in transit** | TLS enforced on SES, S3 bucket policy denies non-SSL         |
| **API authentication** | Timing-safe API key comparison (`x-api-key` header)          |
| **Rate limiting**      | Per-IP rate limiting via `express-rate-limit`                 |
| **Security headers**   | Helmet (CSP, HSTS, Referrer-Policy, X-Frame-Options)         |
| **Input validation**   | Field-level type/length/format validation, email regex       |
| **Mass-assignment protection** | Allowlisted fields via `pickAllowedFields`            |
| **HTML injection**     | All user-supplied values HTML-escaped in email templates      |
| **Body size limit**    | Hard `Content-Length` check + Express JSON limit              |
| **Audit logging**      | Structured JSON logs for all security-sensitive operations    |
| **Request tracing**    | Unique `X-Request-Id` on every request for correlation       |
| **Secret management**  | Azure credentials in Secrets Manager with in-memory caching  |
| **IAM least privilege**| Lambda role scoped to specific resources and actions          |
| **KMS key rotation**   | Automatic annual key rotation enabled                        |
| **S3 security**        | Public access blocked, versioning, lifecycle expiration       |
| **Error sanitization** | Production error messages hide internal details               |

### Document Type Detection

The system recognizes the following document types from filenames:

`passport`, `driving_license`, `identity_document`, `birth_certificate`, `address_proof`, `pan_card`, `voter_id`, `aadhaar`, `social_security`, `visa`, `work_permit`

Unrecognized filenames default to `document`.

---

## Testing

The project uses **Vitest** with a 90% coverage threshold across lines, functions, branches, and statements.

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Test structure

| Directory                    | Description                                     |
|------------------------------|------------------------------------------------|
| `src/__tests__/*.test.ts`    | Unit tests for services, routes, and config     |
| `src/__tests__/e2e/`        | End-to-end tests for the full processing flow   |

All AWS SDK calls, Microsoft Graph API requests, and `mailparser` are mocked in tests.

---

## Troubleshooting

### Common Issues

**"No tenant registered for receiving email"**
- The recipient email doesn't match any tenant's `receivingEmail` in DynamoDB
- Verify the tenant is registered and `status` is `active`

**"No PDF attachments found"**
- The email had no PDF attachments or they had incorrect MIME types
- Only `application/pdf` content type or `.pdf` extension files are processed

**"Token acquisition failed"**
- Azure AD credentials are invalid or expired
- Verify `azureTenantId`, `azureClientId`, and `azureClientSecret` for the tenant
- Check that the Azure AD app has `Files.ReadWrite.All` application permission

**Messages landing in DLQ**
- The message exceeded `MaxRetries` attempts
- Check CloudWatch logs for the specific error
- Reprocess by moving messages from DLQ back to the main queue

**SES not receiving emails**
- Ensure the SES receipt rule set is activated (manual step post-deploy)
- Verify MX records point to SES for the `OnboardingDomain`
- Check the domain is verified in SES

---

## Scripts

| Script            | Command                      | Description                     |
|-------------------|------------------------------|---------------------------------|
| `npm run dev`     | `tsx watch src/index.ts`     | Dev server with hot-reload      |
| `npm run build`   | `tsc`                        | Compile TypeScript to `dist/`   |
| `npm start`       | `node dist/index.js`         | Run compiled production build   |
| `npm run lint`    | `eslint src/`                | Lint source files               |
| `npm run lint:fix`| `eslint src/ --fix`          | Auto-fix lint issues            |
| `npm test`        | `vitest run --passWithNoTests`| Run test suite                 |
| `npm run test:watch` | `vitest`                  | Tests in watch mode             |
| `npm run test:coverage` | `vitest run --coverage` | Tests with coverage report     |
| `npm run typecheck` | `tsc --noEmit`             | Type-check without emitting     |

---

## License

Private / Internal Use

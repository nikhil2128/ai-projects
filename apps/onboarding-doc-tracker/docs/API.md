# API Reference

Complete API specification for the Onboarding Document Tracker.

**Base URL:** `http://localhost:3005` (local dev) or your deployed endpoint.

## Authentication

All endpoints except `/health` require an API key passed via the `x-api-key` header.

```
x-api-key: your-secret-api-key
```

In development, if `API_KEY` is not set, authentication is bypassed. In production, `API_KEY` is required and all requests without a valid key receive a `401` response.

## Common Headers

| Header | Required | Description |
|--------|----------|-------------|
| `x-api-key` | Yes (except `/health`) | API key for authentication |
| `Content-Type` | Yes (POST/PUT) | Must be `application/json` |
| `x-request-id` | No | Optional correlation ID; auto-generated if not provided |

## Common Error Responses

All errors follow a consistent shape:

```json
{
  "error": "Human-readable error message"
}
```

| Status | Meaning |
|--------|---------|
| `400` | Bad request — validation failure or missing fields |
| `401` | Unauthorized — invalid or missing API key |
| `404` | Not found — resource does not exist |
| `409` | Conflict — duplicate resource (e.g. duplicate receiving email) |
| `413` | Payload too large — request body exceeds size limit |
| `429` | Too many requests — rate limit exceeded |
| `500` | Internal server error |

In production, `500` errors return a generic message (`"An internal error occurred"`) to prevent leaking implementation details. In development, the actual error message is returned.

---

## Endpoints

### Health Check

#### `GET /health`

Returns the service status. No authentication required.

**Response `200 OK`:**

```json
{
  "status": "ok",
  "service": "onboarding-doc-tracker",
  "timestamp": "2026-02-19T10:30:00.000Z"
}
```

---

### Tenant Management

#### `POST /api/tenants`

Create a new tenant. This atomically:
1. Creates a DynamoDB tenant record
2. Stores the Azure client secret in Secrets Manager
3. Creates a dedicated per-tenant DynamoDB tracking table

**Request Body:**

```json
{
  "companyName": "Acme Corp",
  "receivingEmail": "acme@docs.example.com",
  "hrEmail": "hr@acmecorp.com",
  "hrUserId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "azureTenantId": "11111111-2222-3333-4444-555555555555",
  "azureClientId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "azureClientSecret": "your-azure-client-secret",
  "oneDriveRootFolder": "Employee Onboarding",
  "sesFromEmail": "noreply@acmecorp.com"
}
```

**All fields are required.**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `companyName` | string | max 200 chars | Human-readable company name |
| `receivingEmail` | string | max 254 chars, valid email | Unique email address employees send documents to |
| `hrEmail` | string | max 254 chars, valid email | HR email address to receive notifications |
| `hrUserId` | string | max 200 chars | Microsoft Graph user object ID for the HR mailbox (OneDrive owner) |
| `azureTenantId` | string | max 100 chars | Azure AD tenant ID |
| `azureClientId` | string | max 100 chars | Azure AD application client ID |
| `azureClientSecret` | string | max 500 chars | Azure AD client secret (stored in Secrets Manager, not DynamoDB) |
| `oneDriveRootFolder` | string | max 500 chars | Root folder name in HR's OneDrive |
| `sesFromEmail` | string | max 254 chars, valid email | Verified SES sender address for notifications |

**Response `201 Created`:**

```json
{
  "tenantId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "companyName": "Acme Corp",
  "receivingEmail": "acme@docs.example.com",
  "hrEmail": "hr@acmecorp.com",
  "hrUserId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "azureTenantId": "11111111-2222-3333-4444-555555555555",
  "azureClientId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "azureClientSecret": "********",
  "oneDriveRootFolder": "Employee Onboarding",
  "sesFromEmail": "noreply@acmecorp.com",
  "status": "active",
  "createdAt": "2026-02-19T10:30:00.000Z",
  "updatedAt": "2026-02-19T10:30:00.000Z"
}
```

The `azureClientSecret` is always masked as `"********"` in responses.

**Error Responses:**

| Status | Condition |
|--------|-----------|
| `400` | Missing required fields or validation failure |
| `409` | A tenant with the same `receivingEmail` already exists |
| `500` | Internal error |

---

#### `GET /api/tenants`

List all tenants.

**Response `200 OK`:**

```json
[
  {
    "tenantId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "companyName": "Acme Corp",
    "receivingEmail": "acme@docs.example.com",
    "hrEmail": "hr@acmecorp.com",
    "hrUserId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "azureTenantId": "11111111-2222-3333-4444-555555555555",
    "azureClientId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "azureClientSecret": "********",
    "oneDriveRootFolder": "Employee Onboarding",
    "sesFromEmail": "noreply@acmecorp.com",
    "status": "active",
    "createdAt": "2026-02-19T10:30:00.000Z",
    "updatedAt": "2026-02-19T10:30:00.000Z"
  }
]
```

---

#### `GET /api/tenants/:id`

Get a single tenant by ID.

**Path Parameters:**

| Parameter | Type | Constraints |
|-----------|------|-------------|
| `id` | string | Valid UUID format |

**Response `200 OK`:** Same shape as a single tenant object above.

**Error Responses:**

| Status | Condition |
|--------|-----------|
| `400` | Invalid tenant ID format (not a valid UUID) |
| `404` | Tenant not found |

---

#### `PUT /api/tenants/:id`

Update a tenant. Only provided fields are updated; omitted fields retain their current values.

**Path Parameters:**

| Parameter | Type | Constraints |
|-----------|------|-------------|
| `id` | string | Valid UUID format |

**Request Body (all fields optional):**

```json
{
  "companyName": "Acme Corp (Renamed)",
  "hrEmail": "newhremail@acmecorp.com",
  "azureClientSecret": "rotated-secret-value"
}
```

If `azureClientSecret` is included, the secret in Secrets Manager is rotated atomically.

**Response `200 OK`:** Updated tenant object (same shape as create response).

**Error Responses:**

| Status | Condition |
|--------|-----------|
| `400` | Invalid tenant ID format or validation failure |
| `404` | Tenant not found |
| `409` | A different tenant already uses the new `receivingEmail` |

---

#### `DELETE /api/tenants/:id`

Delete a tenant. This atomically:
1. Deletes the Secrets Manager secret (with 7-day recovery window)
2. Deletes the DynamoDB tenant record
3. Deletes the per-tenant tracking table

**Path Parameters:**

| Parameter | Type | Constraints |
|-----------|------|-------------|
| `id` | string | Valid UUID format |

**Response `204 No Content`:** Empty body on success.

**Error Responses:**

| Status | Condition |
|--------|-----------|
| `400` | Invalid tenant ID format |
| `404` | Tenant not found |

---

### Manual Processing Trigger

#### `POST /trigger`

Manually trigger email processing for a specific S3 object. Useful for testing, re-processing, or operational recovery.

**Request Body:**

```json
{
  "key": "incoming/abc123def456"
}
```

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `key` | string | Must start with `incoming/` | S3 object key of the raw email |

**Response `200 OK` (success):**

```json
{
  "success": true,
  "messageId": "<unique-email-message-id>",
  "tenantId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "employeeName": "John Doe",
  "folderUrl": "https://onedrive.live.com/...",
  "documentsUploaded": [
    "john_doe_passport.pdf",
    "john_doe_driving_license.pdf"
  ]
}
```

**Response `200 OK` (partial success — some uploads failed):**

```json
{
  "success": true,
  "messageId": "<unique-email-message-id>",
  "tenantId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "employeeName": "John Doe",
  "folderUrl": "https://onedrive.live.com/...",
  "documentsUploaded": ["john_doe_passport.pdf"],
  "documentsFailed": [
    {
      "name": "john_doe_driving_license.pdf",
      "error": "Graph upload error 503: Service Unavailable"
    }
  ],
  "warnings": [
    "Upload failed for john_doe_driving_license.pdf: Graph upload error 503: Service Unavailable"
  ]
}
```

**Response `200 OK` (already processed — idempotent):**

```json
{
  "success": true,
  "messageId": "<unique-email-message-id>",
  "tenantId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "employeeName": "John Doe",
  "warnings": ["Already processed — skipped"]
}
```

**Response `200 OK` (failure):**

```json
{
  "success": false,
  "messageId": "incoming/abc123def456",
  "error": "No tenant registered for receiving email \"unknown@example.com\"",
  "failedAtStep": "tenant-resolution"
}
```

Possible `failedAtStep` values: `validation`, `tenant-resolution`, `upload`, `unknown`.

**Error Responses:**

| Status | Condition |
|--------|-----------|
| `400` | Missing `key` field or key doesn't start with `incoming/` |
| `500` | Unhandled processing error |

---

## Rate Limiting

All endpoints are rate-limited per IP address.

| Setting | Default | Env Variable |
|---------|---------|--------------|
| Window | 60 seconds | `RATE_LIMIT_WINDOW_MS` |
| Max requests | 60 per window | `RATE_LIMIT_MAX_REQUESTS` |

When the limit is exceeded, the API returns:

```
HTTP/1.1 429 Too Many Requests

{
  "error": "Too many requests, please try again later"
}
```

Standard rate limit headers are included in responses:
- `RateLimit-Limit`
- `RateLimit-Remaining`
- `RateLimit-Reset`

---

## Request Size Limits

| Limit | Default | Env Variable |
|-------|---------|--------------|
| Max body size | 1 MB (1,048,576 bytes) | `MAX_REQUEST_BODY_BYTES` |

Requests exceeding this limit receive a `413 Payload Too Large` response before the body is parsed.

---

## Examples

### cURL: Create a tenant

```bash
curl -X POST http://localhost:3005/api/tenants \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "companyName": "Acme Corp",
    "receivingEmail": "acme@docs.example.com",
    "hrEmail": "hr@acmecorp.com",
    "hrUserId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "azureTenantId": "11111111-2222-3333-4444-555555555555",
    "azureClientId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    "azureClientSecret": "your-azure-secret",
    "oneDriveRootFolder": "Employee Onboarding",
    "sesFromEmail": "noreply@acmecorp.com"
  }'
```

### cURL: List tenants

```bash
curl http://localhost:3005/api/tenants \
  -H "x-api-key: your-api-key"
```

### cURL: Trigger manual processing

```bash
curl -X POST http://localhost:3005/trigger \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"key": "incoming/abc123def456"}'
```

### cURL: Health check

```bash
curl http://localhost:3005/health
```

### cURL: Update tenant (rotate Azure secret)

```bash
curl -X PUT http://localhost:3005/api/tenants/f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"azureClientSecret": "new-rotated-secret"}'
```

### cURL: Delete tenant

```bash
curl -X DELETE http://localhost:3005/api/tenants/f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "x-api-key: your-api-key"
```

# CollabDocs Backend

Express + WebSocket backend for the CollabDocs collaborative document editor. Provides a REST API for authentication and document management, and a Yjs-aware WebSocket server for real-time collaboration.

## Table of Contents

- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
  - [Health Check](#health-check)
  - [Authentication](#authentication)
  - [Documents](#documents)
  - [Document Sharing](#document-sharing)
- [WebSocket Protocol](#websocket-protocol)
- [Authentication & Authorization](#authentication--authorization)
- [Data Layer](#data-layer)
  - [User Store](#user-store)
  - [Document Store](#document-store)
- [Middleware](#middleware)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Dependencies](#dependencies)

## Architecture

```
src/
├── index.ts              # Server bootstrap (Express + HTTP + WebSocket)
├── ws-server.ts          # Yjs WebSocket collaboration handler
├── routes/
│   ├── auth.ts           # /api/auth/* endpoints
│   └── documents.ts      # /api/documents/* endpoints
├── middleware/
│   └── auth.ts           # JWT auth middleware + token utilities
└── store/
    ├── user-store.ts     # User CRUD + password hashing
    └── document-store.ts # Document metadata + Yjs binary state

data/                     # Runtime persistence (auto-created)
├── users.json            # User records
├── documents.json        # Document metadata
└── ydocs/                # Binary Yjs document states ({docId}.bin)
```

### Request Flow

```
Client Request
     │
     ▼
Express Server (index.ts)
     │
     ├── GET /api/health ──► Health check response
     │
     ├── /api/auth/* ──► auth.ts routes
     │       │
     │       ├── POST /register ──► UserStore.createUser() ──► JWT token
     │       ├── POST /login ──► UserStore.validateCredentials() ──► JWT token
     │       ├── GET /me ──► [authMiddleware] ──► req.user
     │       └── GET /users/search ──► [authMiddleware] ──► UserStore.searchUsers()
     │
     ├── /api/documents/* ──► [authMiddleware] ──► documents.ts routes
     │       │
     │       ├── GET / ──► DocumentStore.listDocumentsForUser()
     │       ├── GET /:id ──► DocumentStore.getDocument()
     │       ├── POST / ──► DocumentStore.createDocument()
     │       ├── PATCH /:id ──► DocumentStore.updateDocument()
     │       ├── DELETE /:id ──► DocumentStore.deleteDocument()
     │       ├── POST /:id/share ──► DocumentStore.shareDocument()
     │       └── DELETE /:id/share/:userId ──► DocumentStore.unshareDocument()
     │
     └── WebSocket Upgrade (/collaboration/:docId?token=...)
             │
             ▼
        ws-server.ts
             │
             ├── JWT verification
             ├── Access control check
             ├── Yjs sync protocol
             ├── Awareness protocol
             └── State persistence
```

## Getting Started

```bash
# Install dependencies
npm install

# Start development server (auto-reload on changes)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The server starts at `http://localhost:3001` by default.

## Scripts

| Script           | Command                       | Description                              |
| ---------------- | ----------------------------- | ---------------------------------------- |
| `dev`            | `tsx watch src/index.ts`      | Development server with auto-reload      |
| `build`          | `tsc`                         | Compile TypeScript to `dist/`            |
| `start`          | `node dist/index.js`          | Run compiled production build            |
| `lint`           | `eslint src/`                 | Lint source files                        |
| `typecheck`      | `tsc --noEmit`                | Type check without emitting files        |
| `test`           | `vitest run`                  | Run tests once                           |
| `test:watch`     | `vitest`                      | Run tests in watch mode                  |
| `test:coverage`  | `vitest run --coverage`       | Run tests with coverage report           |

## Environment Variables

| Variable     | Default                                              | Description                         |
| ------------ | ---------------------------------------------------- | ----------------------------------- |
| `PORT`       | `3001`                                               | HTTP and WebSocket server port      |
| `HOST`       | `localhost`                                          | Server bind address                 |
| `JWT_SECRET` | `collab-doc-editor-dev-secret-change-in-production`  | Secret key for signing JWT tokens   |

> **Note:** Always set a strong, unique `JWT_SECRET` in production environments.

---

## API Reference

All API endpoints are prefixed with `/api`. Responses are JSON unless otherwise noted.

### Common Response Format

**Success responses** return the relevant data directly:

```json
{ "user": { "id": "...", "email": "...", "name": "..." }, "token": "..." }
```

**Error responses** follow this format:

```json
{ "error": "Human-readable error message" }
```

### Common HTTP Status Codes

| Code  | Meaning                                        |
| ----- | ---------------------------------------------- |
| `200` | Success                                        |
| `201` | Created                                        |
| `204` | No Content (successful deletion)               |
| `400` | Bad Request (validation error)                 |
| `401` | Unauthorized (missing or invalid token)        |
| `403` | Forbidden (no access to resource)              |
| `404` | Not Found                                      |
| `409` | Conflict (e.g., duplicate email)               |
| `500` | Internal Server Error                          |

---

### Health Check

#### `GET /api/health`

Returns server health status. No authentication required.

**Response `200`:**

```json
{
  "status": "ok",
  "uptime": 12345.678
}
```

| Field    | Type     | Description                          |
| -------- | -------- | ------------------------------------ |
| `status` | `string` | Always `"ok"`                        |
| `uptime` | `number` | Server uptime in seconds             |

---

### Authentication

#### `POST /api/auth/register`

Create a new user account and receive a JWT token.

**Request Body:**

```json
{
  "email": "user@example.com",
  "name": "Jane Doe",
  "password": "securepassword123"
}
```

| Field      | Type     | Required | Validation                        |
| ---------- | -------- | -------- | --------------------------------- |
| `email`    | `string` | Yes      | Must be a valid email format      |
| `name`     | `string` | Yes      | Non-empty                         |
| `password` | `string` | Yes      | Minimum 6 characters              |

**Response `201`:**

```json
{
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "user@example.com",
    "name": "Jane Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Errors:**

| Status | Condition                        |
| ------ | -------------------------------- |
| `400`  | Missing fields or invalid email  |
| `400`  | Password shorter than 6 chars    |
| `409`  | Email already registered         |

---

#### `POST /api/auth/login`

Authenticate with email and password.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

| Field      | Type     | Required |
| ---------- | -------- | -------- |
| `email`    | `string` | Yes      |
| `password` | `string` | Yes      |

**Response `200`:**

```json
{
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "user@example.com",
    "name": "Jane Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Errors:**

| Status | Condition                            |
| ------ | ------------------------------------ |
| `400`  | Missing email or password            |
| `401`  | Invalid email or password            |

---

#### `GET /api/auth/me`

Get the currently authenticated user's profile.

**Headers:**

```
Authorization: Bearer <token>
```

**Response `200`:**

```json
{
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "user@example.com",
    "name": "Jane Doe"
  }
}
```

**Errors:**

| Status | Condition                            |
| ------ | ------------------------------------ |
| `401`  | Missing, invalid, or expired token   |

---

#### `GET /api/auth/users/search`

Search for users by name or email. Useful for finding users to share documents with.

**Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

| Param     | Type     | Required | Description                                 |
| --------- | -------- | -------- | ------------------------------------------- |
| `q`       | `string` | Yes      | Search query (minimum 2 characters)         |
| `exclude` | `string` | No       | Comma-separated user IDs to exclude         |

> The currently authenticated user is automatically excluded from results.

**Response `200`:**

```json
[
  {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "email": "alice@example.com",
    "name": "Alice Smith"
  }
]
```

Returns up to **10 results**, sorted by relevance.

**Errors:**

| Status | Condition                          |
| ------ | ---------------------------------- |
| `400`  | Missing or too short query (`q`)   |
| `401`  | Unauthorized                       |

---

### Documents

All document endpoints require authentication via the `Authorization: Bearer <token>` header.

#### `GET /api/documents`

List all documents accessible to the current user (authored or shared).

**Response `200`:**

```json
[
  {
    "id": "doc-uuid-1",
    "title": "Project Notes",
    "authorId": "user-uuid-1",
    "sharedWith": ["user-uuid-2"],
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-16T14:22:00.000Z"
  }
]
```

Documents are sorted by `updatedAt` in descending order (most recently updated first).

---

#### `GET /api/documents/:id`

Get a single document with full details including author info and shared user profiles.

**URL Parameters:**

| Param | Type     | Description        |
| ----- | -------- | ------------------ |
| `id`  | `string` | Document UUID      |

**Response `200`:**

```json
{
  "id": "doc-uuid-1",
  "title": "Project Notes",
  "authorId": "user-uuid-1",
  "sharedWith": ["user-uuid-2"],
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-16T14:22:00.000Z",
  "author": {
    "id": "user-uuid-1",
    "email": "owner@example.com",
    "name": "Doc Owner"
  },
  "sharedWithUsers": [
    {
      "id": "user-uuid-2",
      "email": "alice@example.com",
      "name": "Alice Smith"
    }
  ],
  "isAuthor": true
}
```

| Field             | Type         | Description                                    |
| ----------------- | ------------ | ---------------------------------------------- |
| `author`          | `SafeUser`   | Author's profile                               |
| `sharedWithUsers` | `SafeUser[]` | Profiles of users the document is shared with  |
| `isAuthor`        | `boolean`    | Whether the requesting user is the author       |

**Errors:**

| Status | Condition                      |
| ------ | ------------------------------ |
| `403`  | User does not have access      |
| `404`  | Document not found             |

---

#### `POST /api/documents`

Create a new document. The authenticated user becomes the author.

**Request Body:**

```json
{
  "title": "My New Document"
}
```

| Field   | Type     | Required | Default              |
| ------- | -------- | -------- | -------------------- |
| `title` | `string` | No       | `"Untitled Document"` |

**Response `201`:**

```json
{
  "id": "new-doc-uuid",
  "title": "My New Document",
  "authorId": "user-uuid-1",
  "sharedWith": [],
  "createdAt": "2025-01-17T09:00:00.000Z",
  "updatedAt": "2025-01-17T09:00:00.000Z"
}
```

---

#### `PATCH /api/documents/:id`

Update a document's metadata (currently only the title).

**URL Parameters:**

| Param | Type     | Description        |
| ----- | -------- | ------------------ |
| `id`  | `string` | Document UUID      |

**Request Body:**

```json
{
  "title": "Updated Title"
}
```

| Field   | Type     | Required |
| ------- | -------- | -------- |
| `title` | `string` | No       |

**Response `200`:**

Returns the updated `DocumentMeta` object.

**Errors:**

| Status | Condition                      |
| ------ | ------------------------------ |
| `403`  | User does not have access      |
| `404`  | Document not found             |

---

#### `DELETE /api/documents/:id`

Delete a document. Only the document author can delete it.

**URL Parameters:**

| Param | Type     | Description        |
| ----- | -------- | ------------------ |
| `id`  | `string` | Document UUID      |

**Response `204`:** No content.

**Errors:**

| Status | Condition                      |
| ------ | ------------------------------ |
| `403`  | User is not the author         |
| `404`  | Document not found             |

> Deleting a document also removes its Yjs binary state file from `data/ydocs/`.

---

### Document Sharing

#### `POST /api/documents/:id/share`

Share a document with another user. Only the document author can share.

**URL Parameters:**

| Param | Type     | Description        |
| ----- | -------- | ------------------ |
| `id`  | `string` | Document UUID      |

**Request Body:**

```json
{
  "userId": "target-user-uuid"
}
```

| Field    | Type     | Required | Description                        |
| -------- | -------- | -------- | ---------------------------------- |
| `userId` | `string` | Yes      | ID of the user to share with       |

**Response `200`:**

Returns the updated document with populated `sharedWithUsers` array (same shape as `GET /api/documents/:id`).

**Errors:**

| Status | Condition                                   |
| ------ | ------------------------------------------- |
| `400`  | Missing `userId` or trying to self-share    |
| `403`  | User is not the author                      |
| `404`  | Document or target user not found           |

---

#### `DELETE /api/documents/:id/share/:userId`

Remove a user's access to a shared document. Only the document author can unshare.

**URL Parameters:**

| Param    | Type     | Description                         |
| -------- | -------- | ----------------------------------- |
| `id`     | `string` | Document UUID                       |
| `userId` | `string` | ID of the user to remove access for |

**Response `200`:**

Returns the updated document with populated `sharedWithUsers` array.

**Errors:**

| Status | Condition                      |
| ------ | ------------------------------ |
| `403`  | User is not the author         |
| `404`  | Document not found             |

---

## WebSocket Protocol

The WebSocket server handles real-time document collaboration using the **Yjs sync and awareness protocols**.

### Connection

**Endpoint:**

```
ws://localhost:3001/collaboration/{docId}?token={jwt}
```

| Param   | Location | Description                                |
| ------- | -------- | ------------------------------------------ |
| `docId` | Path     | The document ID to collaborate on          |
| `token` | Query    | JWT authentication token                   |

**Connection is rejected if:**
- Token is missing or invalid
- Token has expired
- User does not have access to the document (not author or in `sharedWith`)

### Message Types

All messages are binary (ArrayBuffer/Uint8Array) following the Yjs protocol format.

#### `MSG_SYNC` (type: 0)

Handles document synchronization using the Yjs sync protocol (`y-protocols/sync`).

| Sub-type      | Direction        | Purpose                                     |
| ------------- | ---------------- | ------------------------------------------- |
| Sync Step 1   | Server → Client  | Server sends its state vector on connect    |
| Sync Step 1   | Client → Server  | Client sends its state vector               |
| Sync Step 2   | Both directions  | Response with missing updates               |
| Update        | Both directions  | Incremental document updates                |

**Sync flow on connection:**

```
Client connects
     │
Server ──► Sync Step 1 (server's state vector) ──► Client
Client ──► Sync Step 1 (client's state vector) ──► Server
Server ──► Sync Step 2 (missing updates)        ──► Client
Client ──► Sync Step 2 (missing updates)        ──► Server
     │
Documents are now in sync
     │
Ongoing: Updates broadcast to all connected clients
```

#### `MSG_AWARENESS` (type: 1)

Handles user presence and cursor information using the Yjs awareness protocol (`y-protocols/awareness`).

**Awareness state structure:**

```json
{
  "user": {
    "name": "Jane Doe",
    "color": "#FF6B6B"
  }
}
```

Awareness updates are broadcast to all other clients connected to the same document. When a client disconnects, their awareness state is automatically cleaned up.

### State Persistence

- Document state is saved to `data/ydocs/{docId}.bin` as a binary Yjs snapshot
- Persistence happens:
  - On every document update (debounced)
  - When the last client disconnects from a document room
- On reconnection, the server loads the persisted state and sends it to the client via sync step 1

### Connection Lifecycle

```
1. Client opens WebSocket connection with JWT token
2. Server validates token and checks document access
3. Server creates/loads Yjs document for the room
4. Server sends sync step 1 to client
5. Client and server exchange sync steps to reach consistency
6. Both sides exchange incremental updates as edits occur
7. Awareness updates flow for cursor/presence information
8. On disconnect:
   a. Client's awareness state is removed
   b. If last client in room: persist state and clean up in-memory doc
```

---

## Authentication & Authorization

### JWT Token

- **Algorithm:** HS256 (HMAC-SHA256)
- **Expiration:** 7 days from issuance
- **Payload:** `{ userId: string, iat: number, exp: number }`
- **Implementation:** Custom JWT (no external library)

### Password Security

- **Algorithm:** PBKDF2 with SHA-512
- **Salt:** 16 random bytes (hex-encoded)
- **Iterations:** 10,000
- **Storage format:** `{salt}:{hash}` (hex strings)

### Access Control Matrix

| Action               | Author | Shared User | Other Users |
| -------------------- | ------ | ----------- | ----------- |
| View document        | Yes    | Yes         | No (403)    |
| Edit document        | Yes    | Yes         | No (403)    |
| Rename document      | Yes    | Yes         | No (403)    |
| Delete document      | Yes    | No (403)    | No (403)    |
| Share document       | Yes    | No (403)    | No (403)    |
| Unshare document     | Yes    | No (403)    | No (403)    |
| Connect via WS       | Yes    | Yes         | Rejected    |

---

## Data Layer

### User Store

**File:** `src/store/user-store.ts`  
**Persistence:** `data/users.json`

#### Data Model

```typescript
interface User {
  id: string;           // UUID v4
  email: string;        // Unique, case-insensitive
  name: string;
  passwordHash: string; // Format: "salt:hash" (PBKDF2-SHA512)
}

interface SafeUser {
  id: string;
  email: string;
  name: string;
  // passwordHash is excluded
}
```

#### Methods

| Method                                      | Returns              | Description                                   |
| ------------------------------------------- | -------------------- | --------------------------------------------- |
| `init()`                                    | `void`               | Load users from disk into memory              |
| `createUser(email, name, password)`         | `SafeUser`           | Create user with hashed password              |
| `findByEmail(email)`                        | `User \| undefined`  | Case-insensitive email lookup                 |
| `findById(id)`                              | `User \| undefined`  | Find user by UUID                             |
| `validateCredentials(email, password)`       | `SafeUser \| null`   | Verify email + password, return safe user     |
| `searchUsers(query, excludeIds)`            | `SafeUser[]`         | Search by name/email, max 10 results          |
| `getUsersByIds(ids)`                        | `SafeUser[]`         | Batch fetch users by ID array                 |

### Document Store

**File:** `src/store/document-store.ts`  
**Persistence:** `data/documents.json` (metadata) + `data/ydocs/{id}.bin` (Yjs state)

#### Data Model

```typescript
interface DocumentMeta {
  id: string;            // UUID v4
  title: string;
  authorId: string;      // User ID of the creator
  sharedWith: string[];  // Array of user IDs
  createdAt: string;     // ISO 8601 timestamp
  updatedAt: string;     // ISO 8601 timestamp
}
```

#### Methods

| Method                                      | Returns                    | Description                                    |
| ------------------------------------------- | -------------------------- | ---------------------------------------------- |
| `init()`                                    | `void`                     | Load documents from disk, create ydocs dir     |
| `listDocuments()`                           | `DocumentMeta[]`           | All documents, sorted by updatedAt desc        |
| `listDocumentsForUser(userId)`              | `DocumentMeta[]`           | Documents where user is author or shared       |
| `getDocument(id)`                           | `DocumentMeta \| undefined`| Find document by ID                            |
| `canAccess(docId, userId)`                  | `boolean`                  | Check if user is author or in sharedWith       |
| `isAuthor(docId, userId)`                   | `boolean`                  | Check if user is the author                    |
| `createDocument(title, authorId)`           | `DocumentMeta`             | Create document with UUID                      |
| `updateDocument(id, { title })`             | `DocumentMeta \| null`     | Update title and updatedAt                     |
| `shareDocument(docId, userId)`              | `DocumentMeta \| null`     | Add userId to sharedWith                       |
| `unshareDocument(docId, userId)`            | `DocumentMeta \| null`     | Remove userId from sharedWith                  |
| `deleteDocument(id)`                        | `boolean`                  | Delete metadata and Yjs binary file            |
| `getYDocState(docId)`                       | `Uint8Array \| null`       | Load binary Yjs state from disk                |
| `saveYDocState(docId, state)`               | `void`                     | Save binary Yjs state to disk                  |

---

## Middleware

### Auth Middleware

**File:** `src/middleware/auth.ts`

The `authMiddleware` function protects routes that require authentication.

**Behavior:**

1. Extracts the `Authorization` header
2. Validates the `Bearer <token>` format
3. Verifies the JWT signature and expiration
4. Loads the user from `UserStore`
5. Attaches the `SafeUser` to `req.user`
6. Calls `next()` on success

**Failure responses (all return `401`):**

| Condition                     | Error Message                    |
| ----------------------------- | -------------------------------- |
| No Authorization header       | `"Authorization header required"` |
| Not Bearer format             | `"Bearer token required"`        |
| Invalid/expired JWT           | `"Invalid or expired token"`     |
| User not found in store       | `"User not found"`               |

### Token Utilities

Exported from `src/middleware/auth.ts`:

```typescript
function generateToken(userId: string): string
// Creates a JWT with { userId, iat, exp } payload, 7-day expiry

function verifyToken(token: string): JwtPayload | null
// Validates signature and expiration, returns payload or null
```

---

## Error Handling

The API uses consistent error responses:

```json
{
  "error": "Descriptive error message"
}
```

- **Validation errors** (`400`): Describe what's wrong with the input
- **Auth errors** (`401`): Generic messages to prevent information leakage
- **Access errors** (`403`): Indicate the user lacks permission
- **Not found** (`404`): Resource does not exist
- **Conflicts** (`409`): Resource already exists (e.g., duplicate email)
- **Server errors** (`500`): Generic message with error logged server-side

---

## Testing

### Test Structure

```
src/__tests__/
├── routes/
│   ├── auth.test.ts           # Auth endpoint tests
│   └── documents.test.ts      # Document endpoint tests
├── middleware/
│   └── auth.test.ts           # JWT + middleware tests
├── store/
│   ├── user-store.test.ts     # User store tests
│   └── document-store.test.ts # Document store tests
├── ws-server.test.ts          # WebSocket server tests
└── e2e/
    └── collaboration.test.ts  # Multi-client collaboration E2E tests
```

### Running Tests

```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode (re-run on changes)
npm run test:coverage # Generate coverage report
```

### Coverage Thresholds

All coverage metrics must meet **90%** minimum:
- Statements: 90%
- Branches: 90%
- Functions: 90%
- Lines: 90%

### Test Patterns

- **Route tests**: Use `supertest` to test HTTP endpoints with mocked stores
- **Store tests**: Mock `fs` module to test file persistence logic
- **Middleware tests**: Test JWT generation, verification, and middleware behavior
- **WebSocket tests**: Create test server instances for WebSocket protocol testing
- **E2E tests**: Simulate multi-client scenarios with real WebSocket connections

---

## Dependencies

### Runtime

| Package       | Version  | Purpose                                    |
| ------------- | -------- | ------------------------------------------ |
| `express`     | ^4.21.2  | HTTP web framework                         |
| `cors`        | ^2.8.5   | Cross-Origin Resource Sharing middleware    |
| `ws`          | ^8.18.0  | WebSocket server                           |
| `yjs`         | ^13.6.22 | CRDT library for collaborative editing     |
| `y-protocols` | ^1.0.6   | Yjs sync and awareness protocols           |
| `lib0`        | ^0.2.99  | Binary encoding/decoding utilities         |
| `uuid`        | ^11.0.5  | UUID generation                            |
| `dotenv`      | ^16.4.7  | Environment variable loading               |

### Development

| Package               | Version  | Purpose                        |
| --------------------- | -------- | ------------------------------ |
| `typescript`          | ^5.7.3   | TypeScript compiler            |
| `tsx`                 | ^4.19.2  | TypeScript execution (dev)     |
| `vitest`              | ^4.0.18  | Test framework                 |
| `@vitest/coverage-v8` | ^4.0.18  | Code coverage provider         |
| `supertest`           | ^7.2.2   | HTTP assertion testing         |
| `@types/*`            | Various  | TypeScript type definitions    |

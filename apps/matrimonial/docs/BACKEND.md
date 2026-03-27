# Backend Documentation

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Directory Structure](#directory-structure)
- [Server Bootstrap](#server-bootstrap)
- [Middleware](#middleware)
- [Authentication](#authentication)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Data Store](#data-store)
- [Recommendation Engine](#recommendation-engine)
- [Scheduled Jobs](#scheduled-jobs)
- [Error Handling](#error-handling)
- [Configuration](#configuration)
- [Build & Development](#build--development)

---

## Overview

The backend is an **Express 4** REST API written in TypeScript, connecting to **PostgreSQL 16** via the `pg` driver. It follows a flat architecture where routes call a centralized data store directly — no separate controller or service layer. The store handles all database operations, schema management, recommendation scoring, and sample data seeding.

## Tech Stack

| Concern | Library | Version |
|---------|---------|---------|
| Runtime | Node.js | 22 |
| Framework | Express | 4.19 |
| Language | TypeScript | 5.6 |
| Database Driver | pg | 8.13 |
| Password Hashing | bcryptjs | 2.4 |
| UUID Generation | uuid | 9.0 |
| CORS | cors | 2.8 |
| Cron | node-cron | — |
| Dev Runner | tsx | 4.19 |

## Directory Structure

```
backend/
├── package.json
├── tsconfig.json
├── .env.example
│
└── src/
    ├── index.ts                  # Express app, middleware, cron, bootstrap
    │
    ├── routes/
    │   ├── auth.ts               # POST /register, POST /login, GET /me
    │   ├── profiles.ts           # Profile CRUD, browse, recommendations, interests
    │   ├── family.ts             # Family profile CRUD, profile sharing
    │   └── shortlist.ts          # Shortlist CRUD
    │
    ├── middleware/
    │   └── auth.ts               # Bearer token authentication
    │
    ├── data/
    │   ├── store.ts              # PostgreSQL store: schema, CRUD, browse, recommendations
    │   └── sampleData.ts         # Seed data for demo users and family profiles
    │
    └── utils/
        └── asyncHandler.ts       # Async route wrapper (catches rejections)
```

## Server Bootstrap

`src/index.ts` performs the following on startup:

1. Create Express app with global middleware (CORS, JSON parser)
2. Mount route modules under `/api`
3. Register health check endpoint
4. Optionally serve static SPA files (when `SERVE_STATIC` env is set)
5. Register global error handler
6. **`bootstrap()`**: Initialize the data store (creates schema, seeds data), schedule the daily recommendation cron job, and start listening

```
bootstrap()
  ├── store.initialize()    → create tables, indexes, seed sample data
  ├── scheduleRecommendationRefresh()   → node-cron daily at 00:00 UTC
  └── app.listen(PORT)
```

If bootstrap fails, the process exits with code 1.

---

## Middleware

### Global Middleware (applied to all routes)

| Middleware | Purpose |
|-----------|---------|
| `cors()` | Allows all origins (default CORS config) |
| `express.json()` | Parses JSON request bodies |

### Route-level Middleware

| Middleware | Applied To | Purpose |
|-----------|-----------|---------|
| `authenticateToken` | All `/api/profiles`, `/api/family`, `/api/shortlist` routes, and `GET /api/auth/me` | Validates Bearer token and injects user into request |

### Error Handling Middleware

A global 4-argument Express error handler catches unhandled errors, logs them, and returns a 500 response with `{ error: "Internal server error" }`.

---

## Authentication

### Registration

```
POST /api/auth/register
Body: { email, password, firstName?, lastName? }
```

1. Validates email and password (min 6 characters)
2. Checks for duplicate email (case-insensitive)
3. Hashes password with bcrypt (10 salt rounds)
4. Creates user record with UUID
5. Optionally creates a minimal profile with first/last name
6. Returns `{ token, user: { id, email } }`

### Login

```
POST /api/auth/login
Body: { email, password }
```

1. Looks up user by email (case-insensitive)
2. Compares password hash with bcrypt
3. Marks user as active (`last_active_at`)
4. Returns `{ token, user: { id, email } }`

### Token Format

The current implementation uses **Base64-encoded user ID** as the bearer token. This is a development convenience — the middleware includes a note to replace with JWT for production.

```
Token = Base64(userId)
```

### Token Verification (`middleware/auth.ts`)

1. Extract `Authorization: Bearer <token>` header
2. Base64-decode to get `userId`
3. Load user from database via `store.getUser(userId)`
4. If user not found → 401
5. Mark user active → set `req.userId` and `req.user`

---

## API Reference

### Health Check

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/api/health` | No | `{ status: "ok", timestamp: "ISO string" }` |

---

### Auth Routes (`/api/auth`)

| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| POST | `/auth/register` | No | `{ email, password, firstName?, lastName? }` | `{ token, user }` |
| POST | `/auth/login` | No | `{ email, password }` | `{ token, user }` |
| GET | `/auth/me` | Yes | — | `{ user, profile, familyProfile, hasProfile, hasFamilyProfile }` |

---

### Profile Routes (`/api/profiles`)

All routes require authentication.

| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | `/profiles/me` | — | `Profile` | Get authenticated user's profile |
| PUT | `/profiles/me` | `Partial<Profile>` | `Profile` | Upsert profile (merge with existing) |
| GET | `/profiles/browse` | Query params (see below) | `{ profiles, total, page, pageSize }` | Paginated browse with filters |
| GET | `/profiles/recommendations/daily` | — | `RecommendationResponse` | Daily personalized recommendations |
| GET | `/profiles/:userId` | — | `Profile` | Get any user's profile |
| POST | `/profiles/:userId/interest` | — | `Interest` | Send interest to user |
| GET | `/profiles/interests/list` | — | `{ sent: Interest[], received: Interest[] }` | List all interests |
| PATCH | `/profiles/interests/:interestId` | `{ status }` | `Interest` | Accept or decline interest |

#### Browse Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `gender` | string | Filter by gender |
| `minAge` | number | Minimum age |
| `maxAge` | number | Maximum age |
| `religion` | string | Filter by religion |
| `profession` | string | Filter by profession |
| `salaryRange` | string | Filter by salary range |
| `location` | string | Filter by location |
| `education` | string | Filter by education level |
| `maritalStatus` | string | Filter by marital status |
| `diet` | string | Filter by dietary preference |
| `motherTongue` | string | Filter by mother tongue |
| `search` | string | Full-text search (name, profession, location, bio) |
| `page` | number | Page number (default: 1) |
| `pageSize` | number | Results per page (default: 24, max: 48) |

---

### Family Routes (`/api/family`)

All routes require authentication.

| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | `/family/me` | — | `FamilyProfile` | Get own family profile |
| PUT | `/family/me` | `Partial<FamilyProfile>` | `FamilyProfile` | Upsert family profile |
| GET | `/family/user/:userId` | — | `FamilyProfile` | Get another user's family profile |
| POST | `/family/share` | `{ toUserId, sharedProfileUserId, message? }` | `SharedProfile` | Share a profile with a user |
| GET | `/family/shared` | — | `{ sent, received }` | List all profile shares |
| PATCH | `/family/shared/:id` | `{ status }` | `SharedProfile` | Update share status |

#### Share Statuses

- `pending` — Newly shared, not yet viewed
- `viewed` — Recipient has viewed the shared profile
- `interested` — Recipient is interested
- `declined` — Recipient declined

---

### Shortlist Routes (`/api/shortlist`)

All routes require authentication.

| Method | Path | Request | Response | Description |
|--------|------|---------|----------|-------------|
| GET | `/shortlist/` | — | `{ shortlist: Shortlist[] }` | Full shortlist with enriched profiles |
| GET | `/shortlist/ids` | — | `{ shortlistedUserIds: string[] }` | Lightweight ID-only list |
| POST | `/shortlist/:userId` | `{ note? }` | `Shortlist` | Add user to shortlist |
| DELETE | `/shortlist/:userId` | — | `{ success: boolean }` | Remove from shortlist |

---

## Database Schema

The schema is auto-created on startup via `store.initialize()`. All tables use UUIDs as primary keys.

### Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌───────────────────┐
│    users     │       │     profiles     │       │  family_profiles  │
├──────────────┤       ├──────────────────┤       ├───────────────────┤
│ id (PK)      │──────►│ user_id (PK, FK) │       │ user_id (PK, FK)  │
│ email        │       │ first_name       │       │ father_name       │
│ password_hash│       │ last_name        │       │ father_occupation │
│ created_at   │       │ gender           │       │ mother_name       │
│ last_active  │       │ date_of_birth    │       │ mother_occupation │
└──────┬───────┘       │ age              │       │ siblings          │
       │               │ religion         │       │ family_income     │
       │               │ mother_tongue    │       │ family_values     │
       │               │ height           │       │ about_family      │
       │               │ education        │       │ contact_person    │
       │               │ profession       │       │ contact_phone     │
       │               │ company          │       │ family_location   │
       │               │ salary_range     │       │ created_at        │
       │               │ location/state   │       │ updated_at        │
       │               │ country          │       └───────────────────┘
       │               │ bio              │
       │               │ interests[]      │
       │               │ photo_url        │
       │               │ marital_status   │
       │               │ family_type      │
       │               │ diet/smoking/    │
       │               │   drinking       │
       │               │ looking_for      │
       │               │ created/updated  │
       │               └──────────────────┘
       │
       │         ┌──────────────────┐
       ├────────►│    interests     │
       │         ├──────────────────┤
       │         │ id (PK)          │
       │         │ from_user_id (FK)│
       │         │ to_user_id (FK)  │
       │         │ status           │
       │         │ created_at       │
       │         │ UNIQUE(from,to)  │
       │         └──────────────────┘
       │
       │         ┌──────────────────────┐
       ├────────►│   shared_profiles    │
       │         ├──────────────────────┤
       │         │ id (PK)              │
       │         │ from_user_id (FK)    │
       │         │ to_user_id (FK)      │
       │         │ shared_profile_user  │
       │         │   _id (FK)           │
       │         │ message              │
       │         │ status               │
       │         │ created_at           │
       │         │ UNIQUE(from,to,      │
       │         │   shared_profile)    │
       │         └──────────────────────┘
       │
       │         ┌──────────────────────┐
       ├────────►│     shortlists       │
       │         ├──────────────────────┤
       │         │ id (PK)              │
       │         │ user_id (FK)         │
       │         │ shortlisted_user_id  │
       │         │   (FK)               │
       │         │ note                 │
       │         │ created_at           │
       │         │ UNIQUE(user,         │
       │         │   shortlisted)       │
       │         └──────────────────────┘
       │
       │         ┌───────────────────────────┐
       └────────►│   recommendation_batches  │
                 ├───────────────────────────┤
                 │ user_id (PK, FK)          │
                 │ generated_at              │
                 │ based_on_history          │
                 │ shortlisted_signals       │
                 │ interest_signals          │
                 │ recommendations (JSONB)   │
                 └───────────────────────────┘
```

### Indexes

| Table | Index | Type | Columns |
|-------|-------|------|---------|
| users | `idx_users_email_lower` | UNIQUE | `lower(email)` |
| profiles | `idx_profiles_gender_age` | B-tree | `gender, age` |
| profiles | `idx_profiles_religion` | B-tree | `religion` |
| profiles | `idx_profiles_mother_tongue` | B-tree | `mother_tongue` |
| profiles | `idx_profiles_salary_range` | B-tree | `salary_range` |
| profiles | `idx_profiles_location` | B-tree | `location` |
| profiles | `idx_profiles_state` | B-tree | `state` |
| profiles | `idx_profiles_education` | B-tree | `education` |
| profiles | `idx_profiles_marital_status` | B-tree | `marital_status` |
| profiles | `idx_profiles_diet` | B-tree | `diet` |
| profiles | `idx_profiles_updated_at` | B-tree | `updated_at DESC` |
| profiles | `idx_profiles_interests_gin` | GIN | `interests` |
| profiles | `idx_profiles_search_vector` | GIN | `profile_search_vector(...)` |

### Full-Text Search

A PostgreSQL function `profile_search_vector` computes a `tsvector` from the profile's first name, last name, profession, location, and bio. A GIN index on this expression enables efficient full-text search via the `search` parameter on the browse endpoint.

```sql
CREATE OR REPLACE FUNCTION profile_search_vector(
  fname text, lname text, prof text, loc text, bio_text text
) RETURNS tsvector
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT to_tsvector('simple',
    coalesce(fname,'') || ' ' || coalesce(lname,'') || ' ' ||
    coalesce(prof,'') || ' ' || coalesce(loc,'') || ' ' ||
    coalesce(bio_text,'')
  )
$$;
```

---

## Data Store

`src/data/store.ts` is the single data access abstraction (no ORM). It exposes a singleton `store` object with methods for:

### Core Operations

| Category | Methods |
|----------|---------|
| **Initialization** | `initialize()` — Create schema, run migrations, seed sample data |
| **Users** | `createUser()`, `getUser()`, `getUserByEmail()`, `markUserActive()` |
| **Profiles** | `getProfile()`, `upsertProfile()`, `normalizeProfileInput()` |
| **Browse** | `browseProfiles(userId, filters, page, pageSize)` — Dynamic SQL with filters, pagination, match scoring |
| **Family** | `getFamilyProfile()`, `upsertFamilyProfile()`, `normalizeFamilyProfileInput()` |
| **Interests** | `createInterest()`, `getInterests()`, `updateInterestStatus()` |
| **Shared Profiles** | `shareProfile()`, `getSharedProfiles()`, `updateSharedProfileStatus()` |
| **Shortlists** | `getShortlist()`, `getShortlistIds()`, `addToShortlist()`, `removeFromShortlist()` |
| **Recommendations** | `getOrGenerateRecommendations()`, `refreshRecommendationsForActiveUsers()` |

### Transaction Support

The store provides `withTransaction()` for multi-statement operations. It acquires a client from the pool, starts a transaction, executes the callback, and either commits or rolls back on error.

### Row Mapping

Each database row type has a corresponding `map*Row()` function that converts snake_case database columns to camelCase TypeScript interfaces.

---

## Recommendation Engine

The recommendation system generates personalized daily match batches using a weighted scoring algorithm.

### How It Works

```
1. Collect behavioral signals
   ├── Analyze user's shortlisted profiles
   └── Analyze user's sent interests

2. Build weight maps
   ├── religion preferences (from shortlist/interest history)
   ├── mother tongue preferences
   ├── location/state preferences
   ├── education preferences
   ├── profession preferences
   ├── salary range preferences
   ├── diet preferences
   ├── family type preferences
   ├── marital status preferences
   ├── interest tag preferences
   ├── preferred age (median)
   └── preferred height (median)

3. Score all candidate profiles
   ├── Weighted attribute matching
   ├── Age proximity bonus
   ├── Height proximity bonus
   ├── Interest overlap scoring
   └── Normalize to 0-100 match percentage

4. Sort by score, take top N

5. Cache in recommendation_batches table (JSONB)
```

### Signal Collection

The engine examines the user's shortlist and sent interests to understand their preferences. For each attribute (religion, location, education, etc.), it counts how often each value appears among the profiles the user has engaged with, building a frequency-weighted preference map.

### Scoring Dimensions

| Dimension | Scoring Method |
|-----------|---------------|
| Religion | Exact match against preference weights |
| Mother Tongue | Exact match against preference weights |
| Location | Exact match against preference weights |
| State | Exact match against preference weights |
| Education | Exact match against preference weights |
| Profession | Exact match against preference weights |
| Salary Range | Exact match against preference weights |
| Diet | Exact match against preference weights |
| Family Type | Exact match against preference weights |
| Marital Status | Exact match against preference weights |
| Age | Proximity to preferred age (closer = higher score) |
| Height | Proximity to preferred height (closer = higher score) |
| Interests | Overlap ratio between user's and candidate's interest arrays |

### Caching

Recommendation batches are stored in the `recommendation_batches` table with the user's ID as primary key. The batch includes metadata (generation timestamp, behavioral signals used, whether history was available) and the full recommendation list as JSONB.

When a user requests recommendations, the system checks for a cached batch from the current day. If found, it returns the cached results. Otherwise, it generates a fresh batch.

---

## Scheduled Jobs

### Daily Recommendation Refresh

A `node-cron` job runs daily at **00:00 UTC**:

```
Schedule: '0 0 * * *' (midnight UTC daily)
```

It calls `store.refreshRecommendationsForActiveUsers()` which regenerates recommendation batches for all recently active users, ensuring fresh matches are ready when they next log in.

---

## Error Handling

### Route-Level Validation

Routes perform manual validation and return appropriate HTTP status codes:

| Status | When |
|--------|------|
| 400 | Missing required fields, invalid input, self-shortlist attempt |
| 401 | Missing or invalid token |
| 404 | User, profile, interest, or shared profile not found |
| 409 | Duplicate email, duplicate interest |
| 500 | Unhandled exceptions (via error middleware) |

### Async Error Handling

The `asyncHandler` utility wraps async route handlers to catch promise rejections and forward them to Express's error middleware via `next(err)`.

```typescript
const asyncHandler = (fn: RequestHandler) =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
```

### Store-Level

Database operations that require atomicity use `withTransaction()`, which automatically rolls back on error. Other database errors propagate to the route layer and are caught by the global error handler.

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3100` | HTTP server port |
| `DATABASE_URL` | No | `postgres://postgres:postgres@localhost:5432/matrimonial` | PostgreSQL connection string |
| `DATABASE_SSL` | No | — | Set to `disable` to turn off SSL; otherwise uses `{ rejectUnauthorized: false }` in production |
| `DB_POOL_MAX` | No | `10` | Maximum connections in the PostgreSQL pool |
| `SERVE_STATIC` | No | — | Absolute path to static files directory (enables SPA serving) |
| `NODE_ENV` | No | — | Influences SSL behavior alongside `DATABASE_SSL` |

### `.env.example`

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/matrimonial
DATABASE_SSL=disable
DB_POOL_MAX=10
```

---

## Build & Development

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with tsx watch (hot-reload on save) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled JS from `dist/index.js` |
| `npm run lint` | Run ESLint on `src/` |
| `npm run typecheck` | Type-check without emitting |

### Module System

The backend uses **ES Modules** (`"type": "module"` in `package.json`). All internal imports use `.js` extensions (required for ESM with TypeScript's `NodeNext` module resolution).

### TypeScript Configuration

- **Target**: ESNext
- **Module**: ESNext
- **Output**: `dist/`
- **Strict mode**: Enabled

### Sample Data Seeding

On first startup (when no users exist), `store.initialize()` calls `seedSampleData()` which creates demo users with complete profiles and family profiles using data from `sampleData.ts`. This includes realistic names, professions, locations, photos (Unsplash URLs), and family details for immediate testing.

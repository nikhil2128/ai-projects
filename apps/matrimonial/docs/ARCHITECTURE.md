# Architecture Documentation

## Table of Contents

- [System Overview](#system-overview)
- [High-Level Architecture](#high-level-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Database Architecture](#database-architecture)
- [Recommendation System Architecture](#recommendation-system-architecture)
- [Authentication Flow](#authentication-flow)
- [Deployment Architecture](#deployment-architecture)
- [Monorepo Context](#monorepo-context)

---

## System Overview

SoulMatch is a three-tier web application:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Presentation  │     │   Application   │     │      Data       │
│                 │     │                 │     │                 │
│  React SPA      │────►│  Express API    │────►│  PostgreSQL 16  │
│  (Vite + TS)    │JSON │  (Node.js + TS) │ SQL │  (pg driver)    │
│                 │◄────│                 │◄────│                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
     Browser                  Server                 Database
```

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CLIENT BROWSER                              │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                      React Application                         │  │
│  │                                                                │  │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌─────────────┐  │  │
│  │  │   Pages  │  │Components │  │  Context  │  │  API Client │  │  │
│  │  │          │  │           │  │           │  │             │  │  │
│  │  │ Login    │  │ Layout    │  │ AuthCtx   │  │ auth.*()    │  │  │
│  │  │ Register │  │ Profile   │  │ ┌───────┐ │  │ profiles.*()│  │  │
│  │  │ Browse   │  │   Card    │  │ │ user  │ │  │ family.*()  │  │  │
│  │  │ Build    │  │ Profile   │  │ │ token │ │  │ shortlist   │  │  │
│  │  │   Profile│  │  Sections │  │ │profile│ │  │   .*()      │  │  │
│  │  │ My       │  │ Modal     │  │ └───────┘ │  │             │  │  │
│  │  │   Profile│  │ Shared    │  │           │  │ fetch()     │  │  │
│  │  │ Profile  │  │   UI      │  │           │  │ + Bearer    │  │  │
│  │  │   Detail │  │           │  │           │  │   Token     │  │  │
│  │  │ Family   │  │           │  │           │  │             │  │  │
│  │  │ Shortlist│  │           │  │           │  │  /api/*     │  │  │
│  │  │ Shared   │  │           │  │           │  │             │  │  │
│  │  │  Profiles│  │           │  │           │  │             │  │  │
│  │  └──────────┘  └───────────┘  └──────────┘  └──────┬──────┘  │  │
│  │                                                     │         │  │
│  │                React Router v6 (client-side)        │         │  │
│  └─────────────────────────────────────────────────────┼─────────┘  │
│                                                        │            │
└────────────────────────────────────────────────────────┼────────────┘
                                                         │
                    HTTP/JSON + Bearer Token              │
                                                         │
┌────────────────────────────────────────────────────────┼────────────┐
│                      VITE DEV PROXY (dev only)         │            │
│                      /api/* → localhost:3100            │            │
└────────────────────────────────────────────────────────┼────────────┘
                                                         │
┌────────────────────────────────────────────────────────▼────────────┐
│                        EXPRESS API SERVER (:3100)                    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Global Middleware                          │   │
│  │                    cors() → express.json()                   │   │
│  └──────────────────────────────┬───────────────────────────────┘   │
│                                 │                                    │
│  ┌──────────────────────────────▼───────────────────────────────┐   │
│  │                      Route Layer                              │   │
│  │                                                               │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │   │
│  │  │  /api/auth   │  │/api/profiles │  │   /api/family      │  │   │
│  │  │             │  │              │  │   /api/shortlist   │  │   │
│  │  │ register    │  │ me (GET/PUT) │  │                    │  │   │
│  │  │ login       │  │ browse       │  │ me (GET/PUT)       │  │   │
│  │  │ me          │  │ recommend    │  │ user/:id           │  │   │
│  │  │             │  │ :userId      │  │ share              │  │   │
│  │  │             │  │ interest     │  │ shared             │  │   │
│  │  └──────┬──────┘  └──────┬───────┘  └────────┬───────────┘  │   │
│  │         │                │                    │              │   │
│  └─────────┼────────────────┼────────────────────┼──────────────┘   │
│            │                │                    │                   │
│  ┌─────────▼────────────────▼────────────────────▼──────────────┐   │
│  │                    Auth Middleware                             │   │
│  │            authenticateToken (Bearer → userId)                │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                       │
│  ┌──────────────────────────▼───────────────────────────────────┐   │
│  │                     Data Store (store.ts)                     │   │
│  │                                                               │   │
│  │  ┌───────────┐ ┌──────────┐ ┌────────────┐ ┌─────────────┐  │   │
│  │  │   Users   │ │ Profiles │ │   Browse   │ │ Recommend-  │  │   │
│  │  │   CRUD    │ │  CRUD    │ │  + Search  │ │   ations    │  │   │
│  │  └───────────┘ └──────────┘ └────────────┘ └─────────────┘  │   │
│  │  ┌───────────┐ ┌──────────┐ ┌────────────┐ ┌─────────────┐  │   │
│  │  │ Interests │ │  Family  │ │  Shortlist │ │   Seeding   │  │   │
│  │  │   CRUD    │ │  CRUD    │ │   CRUD     │ │ + Migrate   │  │   │
│  │  └───────────┘ └──────────┘ └────────────┘ └─────────────┘  │   │
│  │                                                               │   │
│  │              pg.Pool → withTransaction()                      │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                       │
│  ┌──────────────────────────▼───────────────────────────────────┐   │
│  │                  node-cron (Daily Job)                        │   │
│  │           Schedule: '0 0 * * *' (midnight UTC)               │   │
│  │           refreshRecommendationsForActiveUsers()              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                          SQL (pg Pool)
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                        POSTGRESQL 16                                 │
│                                                                      │
│   ┌──────────┐  ┌──────────┐  ┌────────────────┐  ┌────────────┐   │
│   │  users   │  │ profiles │  │ family_profiles │  │ interests  │   │
│   └──────────┘  └──────────┘  └────────────────┘  └────────────┘   │
│   ┌──────────────────┐  ┌────────────┐  ┌────────────────────────┐  │
│   │ shared_profiles  │  │ shortlists │  │ recommendation_batches │  │
│   └──────────────────┘  └────────────┘  └────────────────────────┘  │
│                                                                      │
│   Features: Full-text search (tsvector + GIN), B-tree + GIN indexes │
│             JSONB storage for recommendation batches                 │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Component Tree

```
<BrowserRouter>
  <AuthProvider>                          ← Global auth state
    <AppRoutes>
      │
      ├── /login       → <Login />        ← Public
      ├── /register    → <Register />     ← Public
      │
      └── <ProtectedRoute>                ← Auth guard
            <Layout>                      ← Navbar + footer
              │
              ├── /browse         → <Browse />
              │                       ├── <RecommendationsSection />
              │                       └── <ProfileCard /> (grid)
              │
              ├── /build-profile  → <BuildProfile />
              │                       └── <StepIndicator />
              │
              ├── /my-profile     → <MyProfile />
              │                       ├── <ProfileAvatar />
              │                       ├── <ProfileHighlights />
              │                       ├── <ProfileAttributeSections />
              │                       ├── <ProfileNarrativeSections />
              │                       └── <FamilyProfileContent />
              │
              ├── /profile/:id    → <ProfileDetail />
              │                       ├── <ProfileAvatar />
              │                       ├── <ProfileHighlights />
              │                       ├── <ProfileAttributeSections />
              │                       ├── <ProfileNarrativeSections />
              │                       ├── <FamilyProfileContent />
              │                       └── <ShareModal />
              │
              ├── /family-profile → <FamilyProfile />
              │                       └── <FamilyProfileView />
              │
              ├── /shortlist      → <Shortlist />
              │                       ├── <ProfileCard />
              │                       └── <CompareView />
              │
              └── /shared-profiles→ <SharedProfiles />
                                      └── <SharedProfileCard />
            </Layout>
          </ProtectedRoute>
    </AppRoutes>
  </AuthProvider>
</BrowserRouter>
```

### State Flow

```
┌─────────────────────────────────────────────────────┐
│                   AuthProvider                        │
│                                                       │
│  ┌──────────────────────────────────────────────┐    │
│  │            AuthContext State                   │    │
│  │  user, profile, familyProfile, token, loading │    │
│  └───────────────────┬──────────────────────────┘    │
│                      │ useAuth()                      │
│  ┌───────────────────▼──────────────────────────┐    │
│  │              Page Components                  │    │
│  │                                               │    │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────┐  │    │
│  │  │ useState  │  │useEffect │  │useCallback │  │    │
│  │  │ (local)   │  │(fetch)   │  │(handlers)  │  │    │
│  │  └──────────┘  └──────────┘  └────────────┘  │    │
│  │                      │                        │    │
│  │              ┌───────▼──────┐                 │    │
│  │              │   api.*()    │                 │    │
│  │              │ (HTTP calls) │                 │    │
│  │              └──────────────┘                 │    │
│  └───────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## Backend Architecture

### Request Processing Pipeline

```
Incoming Request
       │
       ▼
┌──────────────┐
│    cors()    │  ← Allow all origins
└──────┬───────┘
       │
       ▼
┌──────────────┐
│express.json()│  ← Parse JSON body
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│ Route Match  │────►│  /api/auth   │  ← register, login (no auth)
└──────┬───────┘     └──────────────┘
       │
       ▼
┌──────────────────┐
│authenticateToken │  ← Decode Bearer token → userId
└──────┬───────────┘
       │
       ▼
┌──────────────┐
│ asyncHandler │  ← Catch async errors → next(err)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│Route Handler │  ← Validate input, call store.*()
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  store.*()   │  ← SQL via pg Pool, return mapped objects
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Response    │  ← JSON response with status code
└──────────────┘
       │
   (on error)
       │
       ▼
┌──────────────┐
│Error Handler │  ← Log + return 500
└──────────────┘
```

### Store Architecture

```
store.ts (singleton)
│
├── Pool (pg)
│   ├── Connection pooling (DB_POOL_MAX connections)
│   └── SSL configuration (DATABASE_SSL)
│
├── Schema Management
│   ├── SCHEMA_SQL (CREATE TABLE IF NOT EXISTS ...)
│   ├── Index creation
│   └── Function creation (profile_search_vector)
│
├── Row Mappers
│   ├── mapUserRow()      → User
│   ├── mapProfileRow()   → Profile
│   ├── mapFamilyRow()    → FamilyProfile
│   ├── mapInterestRow()  → Interest
│   ├── mapSharedRow()    → SharedProfile
│   └── mapShortlistRow() → Shortlist
│
├── CRUD Operations
│   ├── Users: create, get, getByEmail, markActive
│   ├── Profiles: get, upsert, normalize
│   ├── Family: get, upsert, normalize
│   ├── Interests: create, list, updateStatus
│   ├── Shared: share, list, updateStatus
│   └── Shortlists: list, ids, add, remove
│
├── Browse Engine
│   ├── Dynamic SQL generation
│   ├── 11 filter dimensions
│   ├── Full-text search (tsvector)
│   ├── Match percentage scoring
│   └── Pagination (page, pageSize)
│
├── Recommendation Engine
│   ├── Signal collection (shortlist + interests)
│   ├── Weight map construction
│   ├── Multi-dimensional scoring
│   ├── Batch caching (JSONB)
│   └── Daily refresh for active users
│
├── Transaction Support
│   └── withTransaction(callback)
│
└── Seed Data
    └── seedSampleData() → demo users + profiles + families
```

---

## Data Flow Diagrams

### User Registration & Profile Creation

```
User                    Frontend                    Backend                   Database
 │                         │                          │                          │
 │  Fill register form     │                          │                          │
 ├────────────────────────►│                          │                          │
 │                         │  POST /auth/register     │                          │
 │                         ├─────────────────────────►│                          │
 │                         │                          │  INSERT INTO users       │
 │                         │                          ├─────────────────────────►│
 │                         │                          │◄─────────────────────────┤
 │                         │  { token, user }         │                          │
 │                         │◄─────────────────────────┤                          │
 │                         │                          │                          │
 │                         │  Store token in          │                          │
 │                         │  localStorage            │                          │
 │                         │                          │                          │
 │  Navigate to            │                          │                          │
 │  /build-profile         │                          │                          │
 │                         │                          │                          │
 │  Fill 4-step wizard     │                          │                          │
 ├────────────────────────►│                          │                          │
 │                         │  PUT /profiles/me        │                          │
 │                         ├─────────────────────────►│                          │
 │                         │                          │  UPSERT profiles         │
 │                         │                          ├─────────────────────────►│
 │                         │                          │◄─────────────────────────┤
 │                         │  Profile                 │                          │
 │                         │◄─────────────────────────┤                          │
 │                         │                          │                          │
 │  Navigate to /browse    │                          │                          │
 │◄────────────────────────┤                          │                          │
```

### Browse & Recommendation Flow

```
User                    Frontend                    Backend                   Database
 │                         │                          │                          │
 │  Open /browse           │                          │                          │
 ├────────────────────────►│                          │                          │
 │                         │                          │                          │
 │                         │  GET /profiles/          │                          │
 │                         │    recommendations/daily │                          │
 │                         ├─────────────────────────►│                          │
 │                         │                          │  Check cached batch      │
 │                         │                          ├─────────────────────────►│
 │                         │                          │                          │
 │                         │                          │  (if stale/missing)      │
 │                         │                          │  Collect signals         │
 │                         │                          ├─────────────────────────►│
 │                         │                          │  Build weight maps       │
 │                         │                          │  Score all candidates    │
 │                         │                          │  Cache batch (JSONB)     │
 │                         │                          ├─────────────────────────►│
 │                         │                          │                          │
 │                         │  RecommendationResponse  │                          │
 │                         │◄─────────────────────────┤                          │
 │                         │                          │                          │
 │  Render recommendations │                          │                          │
 │◄────────────────────────┤                          │                          │
 │                         │                          │                          │
 │                         │  GET /profiles/browse    │                          │
 │                         │  ?gender=&religion=...   │                          │
 │                         ├─────────────────────────►│                          │
 │                         │                          │  Dynamic SQL + filters   │
 │                         │                          │  + full-text search      │
 │                         │                          │  + match % scoring       │
 │                         │                          ├─────────────────────────►│
 │                         │                          │◄─────────────────────────┤
 │                         │  BrowseResponse          │                          │
 │                         │◄─────────────────────────┤                          │
 │  Render profile grid    │                          │                          │
 │◄────────────────────────┤                          │                          │
```

### Interest & Shortlist Flow

```
User                    Frontend                    Backend                   Database
 │                         │                          │                          │
 │  Click "Send Interest"  │                          │                          │
 ├────────────────────────►│                          │                          │
 │                         │  POST /profiles/         │                          │
 │                         │    :userId/interest      │                          │
 │                         ├─────────────────────────►│                          │
 │                         │                          │  INSERT interests        │
 │                         │                          │  (unique constraint)     │
 │                         │                          ├─────────────────────────►│
 │                         │  Interest                │                          │
 │                         │◄─────────────────────────┤                          │
 │  Show success           │                          │                          │
 │◄────────────────────────┤                          │                          │
 │                         │                          │                          │
 │  Click "Add to          │                          │                          │
 │   Shortlist"            │                          │                          │
 ├────────────────────────►│                          │                          │
 │                         │  POST /shortlist/:userId │                          │
 │                         ├─────────────────────────►│                          │
 │                         │                          │  UPSERT shortlists      │
 │                         │                          ├─────────────────────────►│
 │                         │  Shortlist               │                          │
 │                         │◄─────────────────────────┤                          │
 │  Toggle shortlist icon  │                          │                          │
 │◄────────────────────────┤                          │                          │
```

### Profile Sharing Flow

```
User A                  Frontend                    Backend                   Database
 │                         │                          │                          │
 │  View Profile X         │                          │                          │
 │  Click "Share"          │                          │                          │
 ├────────────────────────►│                          │                          │
 │                         │  Open ShareModal         │                          │
 │                         │  Search for User B       │                          │
 │                         │  GET /profiles/browse    │                          │
 │                         ├─────────────────────────►│                          │
 │                         │  BrowseResponse          │                          │
 │                         │◄─────────────────────────┤                          │
 │  Select User B          │                          │                          │
 │  Add message            │                          │                          │
 │  Click "Share"          │                          │                          │
 ├────────────────────────►│                          │                          │
 │                         │  POST /family/share      │                          │
 │                         │  { toUserId: B,          │                          │
 │                         │    sharedProfileUserId:X,│                          │
 │                         │    message: "..." }      │                          │
 │                         ├─────────────────────────►│                          │
 │                         │                          │  INSERT shared_profiles  │
 │                         │                          ├─────────────────────────►│
 │                         │  SharedProfile           │                          │
 │                         │◄─────────────────────────┤                          │
 │  Show confirmation      │                          │                          │
 │◄────────────────────────┤                          │                          │
 │                         │                          │                          │
 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
 │                         │                          │                          │
User B                  Frontend                    Backend                   Database
 │                         │                          │                          │
 │  Open /shared-profiles  │                          │                          │
 ├────────────────────────►│                          │                          │
 │                         │  GET /family/shared      │                          │
 │                         ├─────────────────────────►│                          │
 │                         │  { sent, received }      │                          │
 │                         │◄─────────────────────────┤                          │
 │  See Profile X from A   │                          │                          │
 │  Click "Interested"     │                          │                          │
 ├────────────────────────►│                          │                          │
 │                         │  PATCH /family/shared/:id│                          │
 │                         │  { status: "interested" }│                          │
 │                         ├─────────────────────────►│                          │
 │                         │  SharedProfile           │                          │
 │                         │◄─────────────────────────┤                          │
```

---

## Database Architecture

### Table Relationships

```
                    ┌────────────────────┐
                    │       users        │
                    │────────────────────│
                    │ id (UUID, PK)      │
                    │ email (UNIQUE)     │
                    │ password_hash      │
                    │ created_at         │
                    │ last_active_at     │
                    └─────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
     ┌────────▼───────┐  ┌───▼──────────┐  ┌─▼──────────────────┐
     │   profiles     │  │family_profiles│  │recommendation_batch│
     │────────────────│  │──────────────│  │────────────────────│
     │ user_id (PK,FK)│  │user_id(PK,FK)│  │ user_id (PK, FK)  │
     │ 25+ fields     │  │ 12 fields    │  │ recommendations   │
     │ interests[]    │  │              │  │   (JSONB)         │
     │ search_vector  │  │              │  │ signal metadata   │
     └────────┬───────┘  └──────────────┘  └────────────────────┘
              │
              │  (referenced by user_id)
              │
   ┌──────────┼──────────┬─────────────────┐
   │          │          │                 │
┌──▼───────┐ ┌▼────────┐ ┌▼──────────────┐
│interests │ │shortlists│ │shared_profiles│
│──────────│ │──────────│ │──────────────│
│from_user │ │user_id   │ │from_user_id  │
│to_user   │ │shortlist │ │to_user_id    │
│status    │ │ _user_id │ │shared_profile│
│          │ │note      │ │ _user_id     │
│UNIQUE    │ │UNIQUE    │ │message,status│
│(from,to) │ │(user,    │ │UNIQUE(triple)│
│          │ │shortlist)│ │              │
└──────────┘ └──────────┘ └──────────────┘
```

### Index Strategy

The database uses a multi-dimensional index strategy optimized for the browse and search workloads:

```
profiles table indexes:
│
├── B-tree indexes (equality filters)
│   ├── (gender, age)    ← compound for common filter pair
│   ├── (religion)
│   ├── (mother_tongue)
│   ├── (salary_range)
│   ├── (location)
│   ├── (state)
│   ├── (education)
│   ├── (marital_status)
│   ├── (diet)
│   └── (updated_at DESC) ← sorting by recency
│
├── GIN indexes (array and text search)
│   ├── interests (array containment queries)
│   └── profile_search_vector (full-text search)
│
└── Unique indexes
    └── users.lower(email) (case-insensitive uniqueness)
```

---

## Recommendation System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  RECOMMENDATION ENGINE                           │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  1. SIGNAL COLLECTION                                     │  │
│  │                                                           │  │
│  │  ┌──────────────┐     ┌──────────────┐                   │  │
│  │  │  Shortlisted  │     │    Sent      │                   │  │
│  │  │  Profiles     │     │  Interests   │                   │  │
│  │  │  (positive    │     │  (explicit   │                   │  │
│  │  │   signal)     │     │   signal)    │                   │  │
│  │  └──────┬────────┘     └──────┬───────┘                   │  │
│  │         └──────────┬──────────┘                           │  │
│  └────────────────────┼──────────────────────────────────────┘  │
│                       │                                          │
│  ┌────────────────────▼──────────────────────────────────────┐  │
│  │  2. WEIGHT MAP CONSTRUCTION                               │  │
│  │                                                           │  │
│  │  For each attribute, count frequency across signals:      │  │
│  │                                                           │  │
│  │  ┌────────────┐ ┌─────────────┐ ┌──────────────────┐     │  │
│  │  │  Religion   │ │Mother Tongue│ │Location / State  │     │  │
│  │  │  weights    │ │  weights    │ │   weights        │     │  │
│  │  └────────────┘ └─────────────┘ └──────────────────┘     │  │
│  │  ┌────────────┐ ┌─────────────┐ ┌──────────────────┐     │  │
│  │  │ Education  │ │ Profession  │ │  Salary Range    │     │  │
│  │  │  weights   │ │  weights    │ │   weights        │     │  │
│  │  └────────────┘ └─────────────┘ └──────────────────┘     │  │
│  │  ┌────────────┐ ┌─────────────┐ ┌──────────────────┐     │  │
│  │  │   Diet     │ │ Family Type │ │ Marital Status   │     │  │
│  │  │  weights   │ │  weights    │ │  weights         │     │  │
│  │  └────────────┘ └─────────────┘ └──────────────────┘     │  │
│  │  ┌────────────┐ ┌─────────────┐                           │  │
│  │  │ Interest   │ │Preferred Age│                           │  │
│  │  │ tag weights│ │  & Height   │                           │  │
│  │  └────────────┘ └─────────────┘                           │  │
│  └────────────────────┬──────────────────────────────────────┘  │
│                       │                                          │
│  ┌────────────────────▼──────────────────────────────────────┐  │
│  │  3. CANDIDATE SCORING                                     │  │
│  │                                                           │  │
│  │  For each candidate profile (excluding self):             │  │
│  │                                                           │  │
│  │  score = Σ (attribute_match × weight) +                   │  │
│  │          age_proximity_bonus +                             │  │
│  │          height_proximity_bonus +                          │  │
│  │          interest_overlap_ratio                            │  │
│  │                                                           │  │
│  │  matchPercentage = normalize(score, 0, 100)               │  │
│  │  reasons[] = ["Matching religion", "Similar age", ...]    │  │
│  └────────────────────┬──────────────────────────────────────┘  │
│                       │                                          │
│  ┌────────────────────▼──────────────────────────────────────┐  │
│  │  4. RESULT & CACHING                                      │  │
│  │                                                           │  │
│  │  Sort by score DESC → Take top N                          │  │
│  │  Store as JSONB in recommendation_batches                 │  │
│  │  Include: generatedAt, basedOnHistory, signalCounts       │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│  Client  │                    │  Server  │                    │ Database │
└────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │  ─── REGISTRATION ───         │                               │
     │                               │                               │
     │  POST /auth/register          │                               │
     │  { email, password }          │                               │
     ├──────────────────────────────►│                               │
     │                               │  Validate email + password    │
     │                               │  Hash password (bcrypt)       │
     │                               │  Generate UUID                │
     │                               │  INSERT user                  │
     │                               ├──────────────────────────────►│
     │                               │◄──────────────────────────────┤
     │                               │  Generate token               │
     │                               │  token = Base64(userId)       │
     │  { token, user }              │                               │
     │◄──────────────────────────────┤                               │
     │                               │                               │
     │  localStorage.setItem         │                               │
     │    ('token', token)           │                               │
     │                               │                               │
     │  ─── APP RELOAD ───           │                               │
     │                               │                               │
     │  token = localStorage         │                               │
     │    .getItem('token')          │                               │
     │                               │                               │
     │  GET /auth/me                 │                               │
     │  Authorization: Bearer <tok>  │                               │
     ├──────────────────────────────►│                               │
     │                               │  Base64 decode → userId       │
     │                               │  SELECT user WHERE id=userId  │
     │                               ├──────────────────────────────►│
     │                               │◄──────────────────────────────┤
     │                               │  Fetch profile + family       │
     │                               ├──────────────────────────────►│
     │                               │◄──────────────────────────────┤
     │  { user, profile,             │                               │
     │    familyProfile,             │                               │
     │    hasProfile,                │                               │
     │    hasFamilyProfile }         │                               │
     │◄──────────────────────────────┤                               │
     │                               │                               │
     │  ─── PROTECTED REQUEST ───    │                               │
     │                               │                               │
     │  GET /profiles/browse         │                               │
     │  Authorization: Bearer <tok>  │                               │
     ├──────────────────────────────►│                               │
     │                               │  authenticateToken()          │
     │                               │  Decode → userId              │
     │                               │  Load user                    │
     │                               │  Mark active                  │
     │                               │  Set req.userId               │
     │                               │  → Route handler              │
     │                               ├──────────────────────────────►│
     │  Response                     │                               │
     │◄──────────────────────────────┤                               │
     │                               │                               │
     │  ─── LOGOUT ───               │                               │
     │                               │                               │
     │  localStorage.removeItem      │                               │
     │    ('token')                  │                               │
     │  Clear AuthContext state      │                               │
     │  Redirect to /login           │                               │
```

---

## Deployment Architecture

### Local Development

```
┌──────────────────────────────────────────────┐
│              Developer Machine               │
│                                              │
│  ┌────────────────┐  ┌───────────────────┐  │
│  │   Vite (:5173) │  │ Express (:3100)   │  │
│  │   Frontend     │  │ Backend           │  │
│  │                │  │                   │  │
│  │  /api/* ───────┼─►│                   │  │
│  │  (proxy)       │  │                   │  │
│  └────────────────┘  └────────┬──────────┘  │
│                               │              │
│                    ┌──────────▼──────────┐   │
│                    │ PostgreSQL (:5432)  │   │
│                    │ (local or Docker)   │   │
│                    └────────────────────┘   │
└──────────────────────────────────────────────┘
```

### Docker Compose (Local)

```
┌──────────────────────────────────────────────────────┐
│                   Docker Network                      │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   frontend   │  │   backend    │  │     db     │ │
│  │  (:5180)     │  │  (:3100)     │  │  (:5432)   │ │
│  │              │  │              │  │            │ │
│  │  Vite +      │  │  Express +   │  │ Postgres   │ │
│  │  React       │  │  tsx watch   │  │ 16-alpine  │ │
│  │              │  │              │  │            │ │
│  │  depends_on: │  │  depends_on: │  │ Volume:    │ │
│  │   backend    │  │   db         │  │  pgdata    │ │
│  │              │  │  (healthy)   │  │            │ │
│  │  Volume:     │  │              │  │            │ │
│  │  ./frontend  │  │  Volume:     │  │            │ │
│  │              │  │  ./backend/  │  │            │ │
│  │              │  │    src       │  │            │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Production (GCP Cloud Run)

```
┌──────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                       │
│                                                               │
│  ┌────────────┐    ┌──────────────────────────────────────┐  │
│  │  Cloud     │    │          Cloud Run Service           │  │
│  │  Build     │───►│                                      │  │
│  │            │    │  ┌──────────────────────────────┐    │  │
│  │ cloudbuild │    │  │     Docker Container         │    │  │
│  │  .yaml     │    │  │                              │    │  │
│  └────────────┘    │  │  Express (:PORT)             │    │  │
│                    │  │  ├── API routes               │    │  │
│  ┌────────────┐    │  │  └── Static SPA (SERVE_STATIC)│   │  │
│  │  Secret    │    │  │                              │    │  │
│  │  Manager   │───►│  └──────────────┬───────────────┘    │  │
│  │            │    │                 │                     │  │
│  │ DB creds   │    └─────────────────┼─────────────────────┘  │
│  └────────────┘                      │                        │
│                                      │ SQL                    │
│                    ┌─────────────────▼─────────────────────┐  │
│                    │          Cloud SQL                     │  │
│                    │        PostgreSQL 16                   │  │
│                    │                                       │  │
│                    │  Managed instance with:               │  │
│                    │  • Automated backups                  │  │
│                    │  • High availability                  │  │
│                    │  • SSL connections                    │  │
│                    └───────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                    Terraform                            │   │
│  │  main.tf     → Cloud Run service + IAM                 │   │
│  │  sql.tf      → Cloud SQL instance + database           │   │
│  │  secrets.tf  → Secret Manager for DB credentials       │   │
│  │  iam.tf      → Service account + bindings              │   │
│  │  outputs.tf  → Service URL + connection info           │   │
│  └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## Monorepo Context

SoulMatch lives within a larger Nx-managed monorepo:

```
ai-projects/                       (npm workspaces + Nx)
├── nx.json                         (Nx config: caching, task graph)
├── tsconfig.base.json              (@libs/* path mapping)
├── package.json                    (workspaces: apps/*, apps/*/*, libs/*)
│
├── libs/
│   └── logger/                     (shared logger — not used by matrimonial)
│
└── apps/
    ├── matrimonial/                ← THIS APP
    │   ├── frontend/
    │   └── backend/
    │
    ├── ecommerce/                  (other apps in the monorepo)
    ├── collab-doc-editor/
    ├── photo-share/
    └── ... (21 total apps)
```

The matrimonial app is **self-contained** — it does not import any shared `@libs/*` packages. It can be developed, built, and deployed independently while still benefiting from Nx's task orchestration and caching at the monorepo level.

# PhotoShare

An Instagram-like photo sharing platform built to handle **2 billion monthly active users**. Features photo sharing with filters, social graph, emoji reactions, geo-based recommendations, and a scalable microservices-ready architecture.

## Features

- **Authentication** — JWT access + refresh tokens, rate-limited auth endpoints, bcrypt (12 rounds), automated profile screening
- **Follow/Unfollow** — Neo4j graph database for social relationships, cached following lists
- **Photo Sharing** — S3 object storage with CDN, automatic WebP conversion, multi-size thumbnails (150/480/1080px)
- **Photo Filters** — Apply filters (grayscale, sepia, warm, cool, vintage, etc.) before sharing
- **Feed** — Hybrid fan-out (write for normal users, read for celebrities), cursor-based infinite scroll
- **Emoji Reactions** — Cached reaction counts, denormalized counters, optimistic UI updates
- **User Profiles** — Cached profiles with follower/following counts
- **User Search** — Elasticsearch with edge n-gram autocomplete, fallback to DB
- **Discover Nearby** — Haversine + bounding-box geo filtering, mutual connection scoring, cached results
- **Async Processing** — BullMQ job queues for feed fan-out, image moderation, metadata extraction

## Architecture (2B MAU Scale)

```
                         ┌─────────────┐
                         │   CloudFront │
                         │     CDN      │
                         └──────┬───────┘
                                │
                    ┌───────────┼───────────┐
                    │     Load Balancer     │
                    │    (NGINX Ingress)    │
                    └───────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                  │
     ┌────────▼───────┐ ┌──────▼──────┐ ┌────────▼───────┐
     │  API Server 1  │ │ API Server N│ │  Next.js SSR   │
     │   (NestJS)     │ │  (NestJS)   │ │  (Frontend)    │
     │  HPA: 10-500   │ │             │ │                │
     └────┬───┬───┬───┘ └──────┬──────┘ └────────────────┘
          │   │   │            │
    ┌─────┘   │   └─────┐     │
    │         │         │     │
┌───▼───┐ ┌──▼──┐ ┌────▼─────▼───┐
│ Postgr│ │Redis│ │    Neo4j      │
│  SQL  │ │     │ │  (Social      │
│Primary│ │Cache│ │   Graph)      │
│+Repli │ │+Queue│ │              │
│ cas   │ │     │ │              │
└───────┘ └─────┘ └──────────────┘
    │
┌───▼────┐  ┌──────────┐  ┌───────────┐
│ S3/    │  │ Elastic  │  │Prometheus │
│ MinIO  │  │ search   │  │+ Grafana  │
└────────┘  └──────────┘  └───────────┘
```

## Tech Stack

| Layer           | Technology                                            |
|-----------------|-------------------------------------------------------|
| Backend         | NestJS 10, TypeORM, PostgreSQL (PostGIS), Passport JWT|
| Frontend        | Next.js 14 (App Router), Tailwind CSS                 |
| Social Graph    | Neo4j 5 (follow relationships, mutual connections)    |
| Cache & Queue   | Redis 7 (ioredis), BullMQ (job queues)                |
| Object Storage  | S3 / MinIO (images + thumbnails via sharp)            |
| Search          | Elasticsearch 8 (edge n-gram, suggestions)            |
| Monitoring      | Prometheus + Grafana, prom-client metrics              |
| Security        | Helmet, @nestjs/throttler, compression, CORS          |
| Containerization| Docker multi-stage builds                             |
| Orchestration   | Kubernetes (HPA, PDB, topology spread)                |
| Language        | TypeScript (both frontend and backend)                |

## Getting Started

### Option 1: Full Stack (Docker Compose)

```bash
# Start all infrastructure
docker compose up -d

# Start backend
cd backend
cp .env.example .env
npm install
npm run dev

# Start frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Option 2: Lightweight (SQLite, no Docker)

The app auto-detects and falls back to SQLite if `DATABASE_URL` is not set.

```bash
cd backend
npm install
npm run dev        # runs on http://localhost:3000

cd ../frontend
npm install
npm run dev        # runs on http://localhost:3001
```

### Infrastructure Services

| Service        | Port  | URL                          |
|----------------|-------|------------------------------|
| Backend API    | 3000  | http://localhost:3000        |
| Swagger Docs   | 3000  | http://localhost:3000/api/docs|
| Frontend       | 3001  | http://localhost:3001        |
| Health Check   | 3000  | http://localhost:3000/api/health |
| Metrics        | 3000  | http://localhost:3000/api/metrics |
| PostgreSQL     | 5432  | localhost:5432               |
| Redis          | 6379  | localhost:6379               |
| Neo4j Browser  | 7474  | http://localhost:7474        |
| MinIO Console  | 9001  | http://localhost:9001        |
| Elasticsearch  | 9200  | http://localhost:9200        |
| Prometheus     | 9090  | http://localhost:9090        |
| Grafana        | 3002  | http://localhost:3002        |

## API Endpoints

| Method | Endpoint                         | Description                | Rate Limit     |
|--------|----------------------------------|----------------------------|----------------|
| POST   | `/api/auth/register`             | Register a new user        | 5/hour         |
| POST   | `/api/auth/login`                | Login                      | 10/min         |
| POST   | `/api/auth/refresh`              | Refresh access token       | 30/min         |
| GET    | `/api/auth/me`                   | Get current user           | default        |
| GET    | `/api/users/:username`           | Get user profile (cached)  | default        |
| GET    | `/api/users/search?q=`           | Search users (Elasticsearch)| default       |
| GET    | `/api/users/suggest?q=`          | Autocomplete users         | default        |
| PATCH  | `/api/users/location`            | Update location            | default        |
| POST   | `/api/follows/:username`         | Follow a user              | default        |
| DELETE | `/api/follows/:username`         | Unfollow a user            | default        |
| POST   | `/api/posts`                     | Create post (S3 upload)    | 10/min         |
| GET    | `/api/posts/feed?cursor=&limit=` | Infinite scroll feed       | default        |
| GET    | `/api/posts/feed?page=`          | Paginated feed (legacy)    | default        |
| GET    | `/api/posts/user/:username`      | Get user's posts           | default        |
| DELETE | `/api/posts/:id`                 | Delete own post            | default        |
| POST   | `/api/posts/:postId/reactions`   | Toggle emoji reaction      | default        |
| GET    | `/api/posts/:postId/reactions`   | Get post reactions (cached)| default        |
| GET    | `/api/recommendations/nearby`    | Nearby users (cached 2min) | default        |
| GET    | `/api/health`                    | Full health check          | —              |
| GET    | `/api/health/live`               | Liveness probe             | —              |
| GET    | `/api/health/ready`              | Readiness probe            | —              |
| GET    | `/api/metrics`                   | Prometheus metrics         | —              |

## Scale Design Decisions

### Database (PostgreSQL + PostGIS)
- **Partitioned tables** for posts and reactions (monthly range partitions)
- **PostGIS spatial indexes** for O(log n) geo-queries instead of O(n) haversine scans
- **Trigram indexes** for fast LIKE/fuzzy search fallback
- **Materialized views** for reaction count aggregation
- **Connection pooling** (50 max, 5 min) with statement timeouts
- **Read replicas** for read-heavy workloads (profiles, feeds, search)

### Caching (Redis)
- **User profiles** cached 2 minutes, invalidated on follow/unfollow
- **Reaction counts** cached 5 minutes per post, invalidated on toggle
- **Following ID lists** cached 5 minutes, invalidated on follow/unfollow
- **Recommendation results** cached 2 minutes per user+radius
- **Feed post IDs** cached via fan-out on write (up to 1000 per user)

### Feed Generation (Hybrid Fan-out)
- **Fan-out on write** for users with < 10K followers: push post ID to all followers' cached feeds via BullMQ
- **Fan-out on read** for celebrities (> 10K followers): merge at read time to avoid hot-partition writes
- **Cursor-based pagination** for consistent results under high write volume (no skipped/duplicate posts)

### Image Pipeline (S3 + Sharp)
- **WebP conversion** at 85% quality — 30-50% smaller than JPEG
- **Three thumbnail sizes** generated in parallel: 150px (grid), 480px (feed), 1080px (detail)
- **Immutable cache headers** (`max-age=31536000, immutable`) for CDN edge caching
- **Async processing** for content moderation and metadata extraction via BullMQ

### Search (Elasticsearch)
- **Edge n-gram analyzer** for instant-as-you-type search
- **5 shards, 1 replica** for horizontal scaling
- **Completion suggester** for sub-10ms autocomplete
- **Graceful fallback** to database LIKE query if Elasticsearch is unavailable

### Social Graph (Neo4j)
- **FOLLOWS relationships** with timestamp for ordered traversal
- **Mutual connection counting** via graph pattern matching
- **Batched queries** to minimize round-trips (single transaction for following + mutuals)

### Security
- **Helmet** security headers
- **Rate limiting** per endpoint (5 registrations/hour, 10 logins/min, 10 posts/min)
- **Short-lived access tokens** (15 min) + refresh token rotation (7 day)
- **Bcrypt 12 rounds** for password hashing
- **Input validation** with class-validator whitelist mode
- **Automated profile verification** at signup with risk scoring (email quality, bot patterns, IP velocity)
- **Low-friction trust model**: legit users are auto-approved, suspicious accounts are hidden or restricted pending review

### Monitoring
- **Prometheus metrics**: HTTP request duration/count, cache hit/miss rates, image upload duration, feed load duration, posts created
- **Health checks**: liveness (`/live`), readiness (`/ready`), full (`/health`) with DB + Redis checks
- **Grafana dashboards** for visualization

### Kubernetes Deployment
- **HPA**: 10-500 replicas based on CPU (60%), memory (75%), and HTTP RPS (1000/pod)
- **PodDisruptionBudget**: minimum 75% availability during rollouts
- **Topology spread**: pods distributed across availability zones
- **Rolling updates**: maxUnavailable=1, maxSurge=3
- **Startup/liveness/readiness probes** for zero-downtime deployments
- **Multi-stage Docker builds** for minimal image size (~150MB)

## Project Structure

```
apps/photo-share/
├── docker-compose.yml          # Full infrastructure stack
├── k8s/                        # Kubernetes manifests
│   ├── backend-deployment.yaml # API deployment + HPA + PDB
│   ├── ingress.yaml            # NGINX ingress with TLS
│   └── configmap.yaml          # Environment configuration
├── backend/
│   ├── Dockerfile              # Multi-stage production build
│   ├── infra/
│   │   ├── init-db.sql         # PostgreSQL schema with partitions
│   │   └── prometheus.yml      # Prometheus scrape config
│   └── src/
│       ├── auth/               # JWT auth with refresh tokens
│       ├── users/              # Profile management + search
│       ├── posts/              # Photo upload (S3) + feed
│       ├── reactions/          # Emoji reactions with caching
│       ├── follows/            # Social graph (Neo4j)
│       ├── recommendations/    # Geo-based discovery with caching
│       ├── cache/              # Redis caching layer
│       ├── storage/            # S3 upload + thumbnail generation
│       ├── search/             # Elasticsearch integration
│       ├── queue/              # BullMQ processors (fan-out, images)
│       ├── health/             # Health check endpoints
│       ├── metrics/            # Prometheus metrics
│       └── neo4j/              # Neo4j driver wrapper
└── frontend/
    ├── Dockerfile              # Multi-stage Next.js build
    └── src/
        ├── app/                # Pages with infinite scroll
        ├── components/         # Lazy-loaded images, optimistic UI
        └── lib/                # API client with auto-refresh
```

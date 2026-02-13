# Image Annotation & Collaboration Platform — Architecture

## Overview

A real-time collaborative image annotation system designed for large manufacturing
companies (500+ employees). Engineers, procurement, and factory workers can share
photos, annotate defects with circles, and discuss issues in threaded conversations
— similar to Google Docs commenting.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client Layer                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │   React SPA (Vite + TypeScript + Tailwind)                   │  │
│  │   ┌──────────┐  ┌──────────────┐  ┌──────────────────────┐  │  │
│  │   │  Auth &   │  │   Image      │  │  Annotation Canvas   │  │  │
│  │   │  Routing  │  │   Gallery    │  │  + Thread Panel      │  │  │
│  │   └──────────┘  └──────────────┘  └──────────────────────┘  │  │
│  └───────────────────────────┬───────────────────────────────────┘  │
│                              │ HTTPS + WSS                          │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│                         API Gateway / LB                            │
│                    (Nginx / AWS ALB in production)                   │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────┐
│                        Application Layer                            │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │   Node.js + Express + TypeScript                             │  │
│  │   ┌────────────┐  ┌────────────┐  ┌───────────────────────┐ │  │
│  │   │  REST API   │  │  WebSocket │  │  File Processing      │ │  │
│  │   │  Routes     │  │  (Socket.IO│  │  (Sharp for thumbnails│ │  │
│  │   │            │  │   server)  │  │   & validation)       │ │  │
│  │   └────────────┘  └────────────┘  └───────────────────────┘ │  │
│  │   ┌────────────┐  ┌────────────┐  ┌───────────────────────┐ │  │
│  │   │  Auth      │  │  Rate      │  │  Input Validation     │ │  │
│  │   │  (JWT+     │  │  Limiting  │  │  (Zod schemas)        │ │  │
│  │   │   bcrypt)  │  │            │  │                       │ │  │
│  │   └────────────┘  └────────────┘  └───────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────┴────────┐  ┌─────────┴─────────┐  ┌────────┴─────────┐
│   PostgreSQL   │  │   File Storage    │  │   Redis          │
│   (Prisma ORM) │  │   (Local/S3)      │  │   (Sessions,     │
│                │  │                   │  │    Socket.IO      │
│  - users       │  │  - originals/     │  │    adapter,       │
│  - images      │  │  - thumbnails/    │  │    rate limits)   │
│  - annotations │  │                   │  │                   │
│  - comments    │  │                   │  │                   │
└────────────────┘  └───────────────────┘  └──────────────────┘
```

---

## Entity-Relationship Diagram

```
┌──────────────────────┐
│        users         │
├──────────────────────┤
│ id          UUID  PK │
│ email       VARCHAR  │─ UNIQUE
│ password    VARCHAR  │
│ name        VARCHAR  │
│ role        ENUM     │─ ENGINEER | PROCUREMENT | FACTORY_WORKER | ADMIN
│ department  VARCHAR  │
│ avatar_url  VARCHAR? │
│ created_at  TIMESTAMP│
│ updated_at  TIMESTAMP│
└──────────┬───────────┘
           │
           │ 1:N (uploader)
           ▼
┌──────────────────────────┐
│         images           │
├──────────────────────────┤
│ id            UUID    PK │
│ title         VARCHAR    │
│ description   TEXT?      │
│ filename      VARCHAR    │─ stored filename (UUID-based)
│ original_name VARCHAR    │─ user's original filename
│ mime_type     VARCHAR    │─ image/png, image/jpeg
│ file_size     INTEGER    │─ bytes
│ width         INTEGER    │
│ height        INTEGER    │
│ storage_key   VARCHAR    │─ path in storage
│ thumbnail_key VARCHAR    │─ path to thumbnail
│ uploader_id   UUID    FK │──→ users.id
│ created_at    TIMESTAMP  │
│ updated_at    TIMESTAMP  │
└──────────┬───────────────┘
           │
           │ 1:N
           ▼
┌──────────────────────────────┐
│        annotations           │
├──────────────────────────────┤
│ id          UUID          PK │
│ image_id    UUID          FK │──→ images.id (CASCADE DELETE)
│ author_id   UUID          FK │──→ users.id
│ center_x    FLOAT            │─ % of image width  (0-100)
│ center_y    FLOAT            │─ % of image height (0-100)
│ radius      FLOAT            │─ % of image width  (0-100)
│ color       VARCHAR          │─ hex color, default #FF0000
│ label       VARCHAR?         │─ short label on canvas
│ status      ENUM             │─ OPEN | RESOLVED | DISMISSED
│ created_at  TIMESTAMP        │
│ updated_at  TIMESTAMP        │
└──────────┬───────────────────┘
           │
           │ 1:N
           ▼
┌──────────────────────────────┐
│         comments             │
├──────────────────────────────┤
│ id            UUID        PK │
│ annotation_id UUID        FK │──→ annotations.id (CASCADE DELETE)
│ author_id     UUID        FK │──→ users.id
│ body          TEXT            │─ comment content (supports markdown)
│ created_at    TIMESTAMP      │
│ updated_at    TIMESTAMP      │
└──────────────────────────────┘
```

### Key Design Decisions

- **Percentage-based coordinates**: Annotation positions use percentages (0–100)
  rather than pixel values so they remain correct at any zoom level or viewport size.
- **Cascade deletes**: Deleting an image removes all annotations; deleting an
  annotation removes all its comments.
- **Flat comment threading**: Comments are ordered by `created_at` within an
  annotation (similar to Google Docs), rather than deeply nested trees. This
  keeps the UI simpler and queries faster.

---

## API Endpoints

| Method | Path                                     | Description                    | Auth |
|--------|------------------------------------------|--------------------------------|------|
| POST   | `/api/auth/register`                     | Register a new user            | No   |
| POST   | `/api/auth/login`                        | Login, returns JWT             | No   |
| GET    | `/api/auth/me`                           | Get current user profile       | Yes  |
| GET    | `/api/images`                            | List images (paginated)        | Yes  |
| POST   | `/api/images`                            | Upload image (multipart)       | Yes  |
| GET    | `/api/images/:id`                        | Get image details + annotations| Yes  |
| DELETE | `/api/images/:id`                        | Delete image (owner/admin)     | Yes  |
| GET    | `/api/images/:id/file`                   | Serve original image file      | Yes  |
| GET    | `/api/images/:id/thumbnail`              | Serve thumbnail                | Yes  |
| GET    | `/api/images/:imageId/annotations`       | List annotations for image     | Yes  |
| POST   | `/api/images/:imageId/annotations`       | Create annotation              | Yes  |
| PATCH  | `/api/annotations/:id`                   | Update annotation status/pos   | Yes  |
| DELETE | `/api/annotations/:id`                   | Delete annotation              | Yes  |
| GET    | `/api/annotations/:annotationId/comments`| List comments in thread        | Yes  |
| POST   | `/api/annotations/:annotationId/comments`| Add comment to thread          | Yes  |
| DELETE | `/api/comments/:id`                      | Delete comment (owner/admin)   | Yes  |

---

## WebSocket Events

| Event                  | Direction       | Payload                          |
|------------------------|-----------------|----------------------------------|
| `annotation:created`   | Server → Client | Full annotation object           |
| `annotation:updated`   | Server → Client | Updated annotation fields        |
| `annotation:deleted`   | Server → Client | `{ annotationId }`               |
| `comment:created`      | Server → Client | Full comment object              |
| `comment:deleted`      | Server → Client | `{ commentId, annotationId }`    |
| `join:image`           | Client → Server | `{ imageId }` — subscribe to room|
| `leave:image`          | Client → Server | `{ imageId }` — unsubscribe      |

---

## Security Considerations

1. **Authentication**: JWT tokens with short expiry (15 min access + 7d refresh).
   Passwords hashed with bcrypt (12 rounds).
2. **Authorization**: Role-based access control. Admins can manage all content;
   users can only delete their own images/annotations/comments.
3. **Input Validation**: All inputs validated with Zod schemas before processing.
4. **File Validation**: Only PNG/JPEG accepted. MIME type verified via magic bytes
   (not just extension). Max file size: 20MB.
5. **Rate Limiting**: Per-IP and per-user rate limits on auth endpoints and uploads.
6. **CORS**: Strict origin allowlist in production.
7. **Helmet**: HTTP security headers via helmet middleware.
8. **SQL Injection**: Mitigated by Prisma's parameterized queries.

---

## Performance Considerations

1. **Thumbnails**: Generated server-side with Sharp on upload (300px wide).
   Gallery shows thumbnails; full images loaded on demand.
2. **Pagination**: Cursor-based pagination for images and comments.
3. **Database Indexes**: On `images.uploader_id`, `annotations.image_id`,
   `comments.annotation_id`, `users.email`.
4. **Eager Loading**: Annotations loaded with image detail to avoid N+1 queries.
5. **WebSocket Rooms**: Clients join per-image rooms so broadcasts are scoped.
6. **Static File Caching**: Images served with `Cache-Control` and `ETag` headers.

---

## Scalability Path

1. **Horizontal Scaling**: Stateless API servers behind a load balancer.
   Socket.IO uses Redis adapter for multi-instance pub/sub.
2. **File Storage**: Abstract storage interface allows swapping local disk
   for AWS S3 / GCS in production.
3. **CDN**: Serve images through CloudFront/Cloudflare for edge caching.
4. **Database**: Read replicas for query scaling; connection pooling with PgBouncer.
5. **Background Jobs**: Move thumbnail generation to a job queue (Bull/BullMQ)
   for large uploads at scale.
6. **Microservices**: The image processing and notification systems can be
   extracted into separate services if load requires it.

---

## Tech Stack

| Component       | Technology                         |
|-----------------|-------------------------------------|
| Language        | TypeScript (strict mode)            |
| Backend Runtime | Node.js 20+                         |
| Web Framework   | Express 4                           |
| ORM             | Prisma 5                            |
| Database        | PostgreSQL 15+                      |
| File Processing | Sharp                               |
| Auth            | jsonwebtoken + bcrypt               |
| Validation      | Zod                                 |
| Real-time       | Socket.IO 4                         |
| Frontend        | React 18 + Vite 5                   |
| Styling         | Tailwind CSS 3                      |
| State Mgmt      | React Context + hooks               |
| Testing         | Vitest + Supertest                  |
| Linting         | ESLint + Prettier                   |

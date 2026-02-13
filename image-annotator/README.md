# AnnotateQC — Collaborative Image Annotation Platform

A real-time collaborative image annotation system built for manufacturing quality
control. Workers photograph defects, circle them on-screen, and discuss with
engineers and procurement in threaded comments — similar to Google Docs.

## Features

- **Image upload & gallery** — Upload PNG/JPEG photos with thumbnails and metadata
- **Circle annotations** — Click-and-drag to draw circles on images (coordinates stored as percentages for zoom independence)
- **Threaded comments** — Google Docs-style discussion threads on each annotation
- **Real-time collaboration** — Socket.IO pushes annotation and comment updates instantly to all viewers
- **Role-based access** — Admin, Engineer, Procurement, Factory Worker roles
- **Status tracking** — Mark annotations as Open / Resolved / Dismissed

## Tech Stack

| Layer      | Technology                                   |
|------------|----------------------------------------------|
| Backend    | Node.js, Express, TypeScript, Prisma, Zod    |
| Database   | PostgreSQL                                   |
| Real-time  | Socket.IO                                    |
| Frontend   | React 18, Vite, Tailwind CSS, TypeScript     |
| Auth       | JWT + bcrypt                                 |
| Testing    | Vitest + Supertest                           |

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full system design, ER diagram, API
reference, and scalability considerations.

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm or yarn

## Quick Start

### 1. Database Setup

```bash
# Start PostgreSQL (example with Docker)
docker run --name annotate-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=image_annotator -p 5432:5432 -d postgres:15

# Or use an existing PostgreSQL instance
```

### 2. Backend

```bash
cd backend

# Install dependencies
npm install

# Copy environment config
cp .env.example .env
# Edit .env with your database URL if needed

# Generate Prisma client & run migrations
npx prisma generate
npx prisma db push

# Seed demo users
npm run db:seed

# Start development server
npm run dev
# → Backend running on http://localhost:3001
```

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# → Frontend running on http://localhost:5173
```

### 4. Login

Use one of the seeded demo accounts (password: `password123`):

| Email                    | Role           |
|--------------------------|----------------|
| worker@factory.com       | Factory Worker |
| engineer@factory.com     | Engineer       |
| procurement@factory.com  | Procurement    |
| admin@factory.com        | Admin          |

## Usage Workflow

1. **Upload** — A factory worker takes a photo of a defective part and uploads it
2. **Annotate** — Click "Annotate", then click-and-drag on the image to draw a circle around the defect
3. **Comment** — Type a question like "Is this scratch acceptable?" in the thread panel
4. **Respond** — An engineer views the same image and replies in the thread
5. **Resolve** — Once decided, change the annotation status to Resolved or Dismissed

## API Endpoints

| Method | Endpoint                                 | Description                 |
|--------|------------------------------------------|-----------------------------|
| POST   | `/api/auth/register`                     | Register user               |
| POST   | `/api/auth/login`                        | Login → JWT                 |
| GET    | `/api/auth/me`                           | Current user profile        |
| GET    | `/api/images`                            | List images (paginated)     |
| POST   | `/api/images`                            | Upload image (multipart)    |
| GET    | `/api/images/:id`                        | Image + annotations detail  |
| DELETE | `/api/images/:id`                        | Delete image                |
| POST   | `/api/images/:imageId/annotations`       | Create annotation           |
| PATCH  | `/api/annotations/:id`                   | Update annotation           |
| DELETE | `/api/annotations/:id`                   | Delete annotation           |
| POST   | `/api/annotations/:annotationId/comments`| Add comment                 |
| DELETE | `/api/comments/:id`                      | Delete comment              |

## Testing

```bash
cd backend
npm test
```

## Project Structure

```
image-annotator/
├── ARCHITECTURE.md          # System design & ER diagram
├── README.md
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Demo data
│   └── src/
│       ├── index.ts         # Express + Socket.IO server
│       ├── config.ts        # Environment configuration
│       ├── middleware/       # Auth, upload, error handling
│       ├── routes/          # REST API routes
│       ├── services/        # Business logic
│       ├── socket/          # WebSocket handlers
│       └── __tests__/       # Unit tests
└── frontend/
    └── src/
        ├── api/             # HTTP client
        ├── components/      # UI components
        │   ├── AnnotationCanvas.tsx  # SVG overlay for annotations
        │   ├── ThreadPanel.tsx       # Comment threads
        │   └── Layout.tsx
        ├── context/         # Auth context
        ├── hooks/           # useSocket hook
        ├── pages/           # Route pages
        └── types/           # TypeScript interfaces
```

## Security

- JWT auth with short-lived tokens
- bcrypt password hashing (12 rounds)
- Zod input validation on all endpoints
- MIME-type file validation (not just extension)
- Rate limiting on auth and API endpoints
- Helmet HTTP security headers
- CORS origin allowlist
- Parameterized queries via Prisma (SQL injection prevention)

## Scalability Considerations

- Horizontal API scaling behind load balancer
- Socket.IO Redis adapter for multi-instance pub/sub
- S3-compatible storage abstraction for cloud migration
- CDN integration point for image serving
- Database connection pooling (PgBouncer)
- Background job queue for thumbnail generation at scale

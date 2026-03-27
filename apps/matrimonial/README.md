# SoulMatch — Matrimonial Platform

A full-stack matrimonial web application for finding compatible life partners through intelligent recommendations, advanced filtering, shortlisting, and family-to-family profile sharing.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development](#development)
- [Docker Setup](#docker-setup)
- [Deployment](#deployment)
- [Documentation](#documentation)

## Overview

SoulMatch is a single-page application with a REST API backend. Users register, build detailed profiles (personal + family), browse other profiles with advanced filters, receive daily AI-scored recommendations, manage a shortlist with side-by-side comparison, exchange interests, and share profiles between families.

### Key Features

| Feature | Description |
|---------|-------------|
| **User Authentication** | Email/password registration and login with token-based auth |
| **Multi-step Profile Builder** | Guided wizard covering personal, education/career, lifestyle, and interests |
| **Family Profiles** | Separate family profile with parent details, siblings, income, values |
| **Smart Browse** | Paginated grid with 11 filter dimensions and full-text search |
| **Daily Recommendations** | Weighted scoring engine generates personalized matches using behavioral signals |
| **Shortlist & Compare** | Save profiles, add notes, and compare two profiles side-by-side |
| **Interest System** | Send, accept, or decline interest with real-time status tracking |
| **Profile Sharing** | Share profiles between families with message and status workflow |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                         │
│                                                                 │
│  ┌───────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────┐  │
│  │   React   │  │  Router  │  │  Context   │  │   API Client │  │
│  │   18 SPA  │  │   v6     │  │ (AuthCtx)  │  │  (fetch)     │  │
│  └─────┬─────┘  └────┬─────┘  └─────┬──────┘  └──────┬───────┘  │
│        └──────────────┴──────────────┴─────────────────┘         │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP (JSON)
                               │ Bearer Token
                     ┌─────────▼──────────┐
                     │   Vite Dev Proxy   │  (dev only: /api → :3100)
                     └─────────┬──────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                     Backend (Express API)                        │
│                                                                  │
│  ┌──────────┐  ┌──────────────────────────────────────────────┐  │
│  │   CORS   │  │              Route Layer                     │  │
│  │   JSON   │  │  /api/auth    /api/profiles   /api/family    │  │
│  │  Parser  │  │                               /api/shortlist │  │
│  └────┬─────┘  └──────────────┬───────────────────────────────┘  │
│       │        ┌──────────────▼───────────────┐                  │
│       │        │    Auth Middleware (Bearer)   │                  │
│       │        └──────────────┬───────────────┘                  │
│       │        ┌──────────────▼───────────────┐                  │
│       │        │       Data Store (store.ts)   │                  │
│       │        │  ┌─────────────────────────┐  │                  │
│       │        │  │ CRUD • Browse • Scoring │  │                  │
│       │        │  │ Transactions • Seeding  │  │                  │
│       │        │  └─────────┬───────────────┘  │                  │
│       │        └────────────┼──────────────────┘                  │
│       │        ┌────────────▼──────────────────┐                  │
│       │        │      node-cron (daily @00:00) │                  │
│       │        │  Recommendation Refresh Job   │                  │
│       │        └───────────────────────────────┘                  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ SQL (pg Pool)
                     ┌─────────▼──────────┐
                     │   PostgreSQL 16    │
                     │                    │
                     │  users             │
                     │  profiles          │
                     │  family_profiles   │
                     │  interests         │
                     │  shared_profiles   │
                     │  shortlists        │
                     │  recommendation_   │
                     │    batches         │
                     └────────────────────┘
```

For a detailed architecture breakdown, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript 5, Vite 6, React Router 6, Tailwind CSS 3 |
| **Backend** | Node.js 22, Express 4, TypeScript 5, pg (PostgreSQL driver) |
| **Database** | PostgreSQL 16 with full-text search (tsvector/GIN indexes) |
| **Auth** | bcryptjs password hashing, Bearer token authentication |
| **Styling** | Tailwind CSS with custom theme (Inter + Playfair Display fonts) |
| **Icons** | lucide-react |
| **Dev Tools** | Vite dev server with proxy, tsx watch, concurrently |
| **Deployment** | Docker, Docker Compose, GCP Cloud Run, Terraform |

## Project Structure

```
apps/matrimonial/
├── package.json              # Root orchestrator (concurrently runs both)
├── docker-compose.yml        # Local dev: Postgres + backend + frontend
├── Dockerfile                # Production multi-stage build
├── Dockerfile.dev            # Development container
├── dev.sh                    # Docker helper script
│
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── main.tsx          # App entry point
│   │   ├── App.tsx           # Router + AuthProvider + route definitions
│   │   ├── api.ts            # HTTP client (fetch wrapper)
│   │   ├── types.ts          # TypeScript interfaces + constants
│   │   ├── index.css         # Tailwind layers + custom components
│   │   ├── context/          # AuthContext (global state)
│   │   ├── pages/            # 9 route-level screens
│   │   └── components/       # Reusable UI components
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── backend/                  # Express REST API
│   ├── src/
│   │   ├── index.ts          # Server bootstrap, middleware, cron
│   │   ├── routes/           # auth, profiles, family, shortlist
│   │   ├── middleware/       # Token authentication
│   │   ├── data/             # Store (PostgreSQL) + sample data
│   │   └── utils/            # asyncHandler
│   ├── .env.example
│   └── tsconfig.json
│
└── deploy/                   # Infrastructure
    ├── deploy.sh
    ├── cloudbuild.yaml
    └── terraform/            # GCP Cloud Run + Cloud SQL
```

## Getting Started

### Prerequisites

- **Node.js** >= 22
- **npm** >= 11
- **PostgreSQL** 16+ (or Docker)

### Quick Start (with Docker)

```bash
# Start Postgres, backend, and frontend
npm run docker:up

# Frontend: http://localhost:5180
# Backend:  http://localhost:3100
# Postgres: localhost:5432
```

### Quick Start (without Docker)

1. **Start PostgreSQL** and create the `matrimonial` database:

```bash
createdb matrimonial
```

2. **Install dependencies:**

```bash
npm install --prefix backend
npm install --prefix frontend
```

3. **Configure the backend** — copy and edit `.env.example`:

```bash
cp backend/.env.example backend/.env
```

Default values:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/matrimonial
DATABASE_SSL=disable
DB_POOL_MAX=10
```

4. **Run both services:**

```bash
npm run dev
```

This starts the backend on `http://localhost:3100` and the frontend on `http://localhost:5173`. The Vite dev server proxies `/api` requests to the backend.

The database schema is auto-created on startup, and sample data is seeded automatically.

## Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend + frontend concurrently |
| `npm run dev:backend` | Start backend only (tsx watch) |
| `npm run dev:frontend` | Start frontend only (Vite) |
| `npm run build` | Build both for production |
| `npm run lint` | Lint both codebases |
| `npm run typecheck` | Type-check both codebases |

## Docker Setup

| Command | Description |
|---------|-------------|
| `npm run docker:up` | Start all services |
| `npm run docker:down` | Stop all services |
| `npm run docker:logs` | Tail container logs |
| `npm run docker:reset` | Reset volumes and rebuild |

### Services

| Service | Port | Description |
|---------|------|-------------|
| `db` | 5432 | PostgreSQL 16 Alpine |
| `backend` | 3100 | Express API (hot-reload via volume mount) |
| `frontend` | 5180 | Vite dev server |

## Deployment

The app is deployable to **Google Cloud Platform** using Cloud Run and Cloud SQL.

```bash
npm run deploy:init    # terraform init
npm run deploy:plan    # preview changes
npm run deploy:apply   # provision infrastructure
npm run deploy         # deploy application
```

Infrastructure is defined in Terraform under `deploy/terraform/` and includes Cloud Run service, Cloud SQL (PostgreSQL), IAM bindings, and secret management.

## Documentation

| Document | Description |
|----------|-------------|
| [docs/FRONTEND.md](docs/FRONTEND.md) | Frontend architecture, components, routing, state management |
| [docs/BACKEND.md](docs/BACKEND.md) | Backend architecture, API reference, database schema, auth |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture diagrams, data flow, deployment topology |

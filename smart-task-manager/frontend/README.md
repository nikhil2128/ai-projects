# Smart Task Manager — Frontend

A modern, responsive web application built with **Next.js 14** and **Tailwind CSS** for managing projects and tasks. Features a split-panel authentication flow, a project dashboard, task boards with filtering, and real-time status management.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
  - [Authentication Flow](#authentication-flow)
  - [State Management](#state-management)
  - [API Integration](#api-integration)
  - [Routing](#routing)
- [Component Reference](#component-reference)
  - [Pages](#pages)
  - [Shared Components](#shared-components)
  - [Library Modules](#library-modules)
- [Deployment](#deployment)
- [Scripts Reference](#scripts-reference)

---

## Overview

The Smart Task Manager frontend is a single-page application that provides:

- **User Authentication** — Login and registration with JWT-based session management
- **Project Dashboard** — Create, edit, and manage projects with team collaboration
- **Task Management** — Full task lifecycle with status transitions, priority levels, assignment, and due dates
- **Filtering & Search** — Filter tasks by status, priority, and search query
- **My Tasks View** — Aggregated view of all tasks assigned to the current user, grouped by project
- **Responsive Design** — Fully responsive UI that works on desktop, tablet, and mobile

## Tech Stack

| Technology | Purpose |
|---|---|
| [Next.js](https://nextjs.org/) v14 | React framework with App Router |
| [React](https://react.dev/) v18 | UI component library |
| [TypeScript](https://www.typescriptlang.org/) v5 | Type-safe JavaScript |
| [Tailwind CSS](https://tailwindcss.com/) v3 | Utility-first CSS framework |
| [next/font](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) | Font optimization (Inter) |

## Features

### Authentication
- Split-panel login and registration pages with branding
- JWT token management via localStorage
- Automatic session restoration on page load
- Protected routes with authentication guards

### Projects
- Project listing with card-based grid layout
- Create and edit projects via modal forms
- Delete projects with confirmation dialogs
- View task and member counts per project
- Archived project indicators

### Tasks
- Task cards with quick-advance status buttons
- Status badges (To Do, In Progress, In Review, Done, Cancelled)
- Priority badges with directional icons (Low, Medium, High, Urgent)
- Assignee avatars with initials
- Overdue date highlighting
- Create/edit tasks with full form (title, description, priority, status, due date, assignee)
- Filter by status, priority, and search text
- Status summary cards with click-to-filter

### My Tasks
- Cross-project aggregated view of assigned tasks
- Grouped by project with links to project detail
- Status filter pills with task counts

---

## Getting Started

### Prerequisites

- **Node.js** v18+ (recommended v20+)
- **npm** v9+
- A running instance of the [Smart Task Manager Backend](../backend/README.md) API

### Installation

```bash
# Navigate to the frontend directory
cd smart-task-manager/frontend

# Install dependencies
npm install
```

### Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.local.example .env.local
```

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:3000` |

### Running the Application

```bash
# Development mode (with hot reload on port 3001)
npm run dev

# Production build
npm run build
npm run start

# Lint the codebase
npm run lint
```

The application will be available at `http://localhost:3001`.

> **Note:** Make sure the backend API is running on `http://localhost:3000` (or the URL configured in `NEXT_PUBLIC_API_URL`).

---

## Project Structure

```
frontend/
├── app/                                 # Next.js App Router pages
│   ├── layout.tsx                       # Root layout (HTML, fonts, AuthProvider)
│   ├── page.tsx                         # Entry point (redirects based on auth)
│   ├── globals.css                      # Global styles and Tailwind imports
│   ├── login/
│   │   └── page.tsx                     # Login page with split-panel layout
│   ├── register/
│   │   └── page.tsx                     # Registration page with split-panel layout
│   └── dashboard/
│       ├── layout.tsx                   # Dashboard layout (auth guard, navbar)
│       ├── page.tsx                     # Redirects to /dashboard/projects
│       ├── projects/
│       │   ├── page.tsx                 # Project listing page
│       │   └── [id]/
│       │       └── page.tsx             # Project detail page (tasks, filters)
│       └── my-tasks/
│           └── page.tsx                 # User's assigned tasks page
├── components/                          # Reusable UI components
│   ├── ConfirmDialog.tsx                # Destructive action confirmation modal
│   ├── EmptyState.tsx                   # Placeholder for empty content areas
│   ├── LoadingSpinner.tsx               # Animated loading indicator
│   ├── Modal.tsx                        # Base modal overlay component
│   ├── Navbar.tsx                       # Top navigation bar with user menu
│   ├── PriorityBadge.tsx                # Task priority label with icon
│   ├── ProjectCard.tsx                  # Project summary card
│   ├── ProjectFormModal.tsx             # Create/edit project form modal
│   ├── StatusBadge.tsx                  # Task status pill badge
│   ├── TaskCard.tsx                     # Task display card with actions
│   └── TaskFormModal.tsx                # Create/edit task form modal
├── lib/                                 # Core utilities and services
│   ├── api.ts                           # HTTP client for backend API
│   ├── auth.tsx                         # Authentication context and provider
│   └── types.ts                         # TypeScript type definitions
├── .env.local.example                   # Environment variable template
├── next.config.mjs                      # Next.js configuration
├── tailwind.config.ts                   # Tailwind CSS configuration
├── postcss.config.mjs                   # PostCSS configuration
├── tsconfig.json                        # TypeScript configuration
└── package.json                         # Dependencies and scripts
```

## Architecture

### Authentication Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Login/     │────>│  AuthProvider │────>│ localStorage    │
│  Register   │     │  (Context)   │     │ (accessToken)   │
│  Page       │     └──────────────┘     └─────────────────┘
└─────────────┘            │
                           │ setUser()
                           ▼
                    ┌──────────────┐
                    │  Dashboard   │
                    │  Pages       │
                    └──────────────┘
```

1. User submits credentials on the Login or Register page
2. The `AuthProvider` calls the backend API and receives a JWT token
3. The token is stored in `localStorage` and the user state is updated
4. Protected pages check `useAuth()` — if no user, redirect to `/login`
5. On page refresh, `AuthProvider` checks localStorage for a token and validates it with the backend

### State Management

The application uses **React Context** for authentication state and **local component state** (via `useState`) for page-specific data. There is no external state management library.

| State | Location | Scope |
|---|---|---|
| Authentication (user, token) | `AuthProvider` context | Global |
| Project list | `ProjectsPage` component | Page |
| Task list | `ProjectDetailPage` / `MyTasksPage` | Page |
| Form data | Modal components | Component |
| Filters (status, priority, search) | Page components | Page |

### API Integration

The `lib/api.ts` module provides a typed HTTP client:

- **`authApi`** — Login, register, get profile
- **`projectsApi`** — CRUD projects, add/remove members
- **`tasksApi`** — CRUD tasks, assign/unassign

All requests automatically include the JWT Bearer token from `localStorage`. Error responses are parsed and thrown as `ApiError` instances with HTTP status codes.

### Routing

| Route | Page | Auth Required |
|---|---|---|
| `/` | Home (redirect) | No |
| `/login` | Login form | No |
| `/register` | Registration form | No |
| `/dashboard` | Redirect to projects | Yes |
| `/dashboard/projects` | Project listing | Yes |
| `/dashboard/projects/:id` | Project detail & tasks | Yes |
| `/dashboard/my-tasks` | User's assigned tasks | Yes |

---

## Component Reference

### Pages

| Page | File | Description |
|---|---|---|
| `HomePage` | `app/page.tsx` | Entry point — redirects based on auth status |
| `LoginPage` | `app/login/page.tsx` | Split-panel login with branding |
| `RegisterPage` | `app/register/page.tsx` | Split-panel registration with branding |
| `DashboardLayout` | `app/dashboard/layout.tsx` | Auth guard wrapper with navbar |
| `ProjectsPage` | `app/dashboard/projects/page.tsx` | Project grid with CRUD modals |
| `ProjectDetailPage` | `app/dashboard/projects/[id]/page.tsx` | Task list with filters and status cards |
| `MyTasksPage` | `app/dashboard/my-tasks/page.tsx` | Assigned tasks grouped by project |

### Shared Components

| Component | File | Description |
|---|---|---|
| `Navbar` | `components/Navbar.tsx` | Top navigation with brand, links, and user dropdown |
| `Modal` | `components/Modal.tsx` | Reusable overlay dialog with Escape/click-outside close |
| `ConfirmDialog` | `components/ConfirmDialog.tsx` | Destructive action confirmation (extends Modal) |
| `LoadingSpinner` | `components/LoadingSpinner.tsx` | Animated spinner in sm/md/lg sizes |
| `EmptyState` | `components/EmptyState.tsx` | Empty content placeholder with icon and CTA |
| `ProjectCard` | `components/ProjectCard.tsx` | Project summary with hover actions |
| `ProjectFormModal` | `components/ProjectFormModal.tsx` | Create/edit project form |
| `TaskCard` | `components/TaskCard.tsx` | Task display with quick-advance and metadata |
| `TaskFormModal` | `components/TaskFormModal.tsx` | Create/edit task form with full options |
| `StatusBadge` | `components/StatusBadge.tsx` | Colored pill badge for task status |
| `PriorityBadge` | `components/PriorityBadge.tsx` | Colored label with arrow for priority |

### Library Modules

| Module | File | Description |
|---|---|---|
| Types | `lib/types.ts` | Enums, interfaces, and DTOs matching the backend API |
| API Client | `lib/api.ts` | HTTP client with auth, error handling, and typed methods |
| Auth Context | `lib/auth.tsx` | Authentication provider, `useAuth()` hook |

---

## Deployment

### Production Build

```bash
# Build the optimized production bundle
npm run build

# Start the production server
npm run start
```

### Static Export (Optional)

If you need a static export (e.g., for CDN hosting):

```bash
# Add to next.config.mjs:
# output: 'export'

npm run build
```

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NEXT_PUBLIC_API_URL=https://api.your-domain.com
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY package*.json ./
ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm", "start"]
```

### Production Checklist

1. **Set `NEXT_PUBLIC_API_URL`** to the production backend URL
2. **Verify CORS** — Ensure the backend allows requests from the frontend's domain
3. **Use HTTPS** — Serve over TLS for security
4. **Set up a CDN** — Use Vercel, Cloudflare, or a similar service for static assets
5. **Configure caching** — Enable appropriate Cache-Control headers

### Vercel Deployment

The easiest deployment path for Next.js:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in the Vercel dashboard
# NEXT_PUBLIC_API_URL = https://api.your-domain.com
```

---

## Scripts Reference

| Script | Description |
|---|---|
| `npm run dev` | Start dev server on port 3001 with hot reload |
| `npm run build` | Build the production bundle |
| `npm run start` | Start the production server |
| `npm run lint` | Lint the codebase with ESLint |

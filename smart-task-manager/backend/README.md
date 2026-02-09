# Smart Task Manager — Backend

A robust RESTful API built with **NestJS** for managing projects, tasks, and team collaboration. Features JWT-based authentication, role-based access control, and comprehensive Swagger documentation.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
  - [Authentication](#authentication)
  - [Projects](#projects)
  - [Tasks](#tasks)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Deployment](#deployment)
- [Scripts Reference](#scripts-reference)

---

## Overview

The Smart Task Manager backend provides a complete API for:

- **User Authentication** — Register, login, and profile management with JWT tokens
- **Project Management** — Create, update, delete projects and manage team members
- **Task Tracking** — Full task lifecycle with status, priority, assignment, and due dates
- **Role-Based Access Control** — Admin and user roles with project-level owner/member permissions

## Tech Stack

| Technology | Purpose |
|---|---|
| [NestJS](https://nestjs.com/) v10 | Server framework |
| [TypeORM](https://typeorm.io/) v0.3 | Database ORM |
| [PostgreSQL](https://www.postgresql.org/) | Production database |
| [Passport](http://www.passportjs.org/) + JWT | Authentication |
| [bcrypt](https://github.com/kelektiv/node.bcrypt.js) | Password hashing |
| [class-validator](https://github.com/typestack/class-validator) | Request validation |
| [class-transformer](https://github.com/typestack/class-transformer) | Response serialization |
| [Swagger / OpenAPI](https://swagger.io/) v7 | API documentation |
| [Jest](https://jestjs.io/) v30 | Unit & E2E testing |
| [SuperTest](https://github.com/ladjs/supertest) | HTTP assertion library |

## Architecture

The backend follows the **NestJS modular architecture** pattern:

```
AppModule (root)
├── AuthModule        — JWT authentication, login, registration
│   ├── AuthController
│   ├── AuthService
│   ├── JwtStrategy
│   └── JwtAuthGuard
├── UsersModule       — User data management
│   ├── UsersService
│   └── User Entity
├── ProjectsModule    — Project CRUD & member management
│   ├── ProjectsController
│   ├── ProjectsService
│   ├── Project Entity
│   └── ProjectMember Entity
├── TasksModule       — Task CRUD, assignment & tracking
│   ├── TasksController
│   ├── TasksService
│   └── Task Entity
└── Common            — Shared guards, decorators, enums
    ├── RolesGuard
    ├── @CurrentUser() decorator
    ├── @Roles() decorator
    └── Enums (Role, ProjectRole, TaskStatus, TaskPriority)
```

### Data Model

```
┌──────────┐     ┌────────────────┐     ┌──────────┐
│  Users   │────<│ ProjectMembers │>────│ Projects │
│          │     │   (role)       │     │          │
└──────────┘     └────────────────┘     └──────────┘
     │                                       │
     │              ┌──────────┐             │
     └──────────────│  Tasks   │─────────────┘
       (creator,    │ (status, │  (belongs to)
        assignee)   │ priority,│
                    │ dueDate) │
                    └──────────┘
```

## Getting Started

### Prerequisites

- **Node.js** v18+ (recommended v20+)
- **npm** v9+
- **PostgreSQL** v14+ (for production; SQLite is used for testing)

### Installation

```bash
# Clone the repository and navigate to the backend directory
cd smart-task-manager/backend

# Install dependencies
npm install
```

### Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USERNAME` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `DB_DATABASE` | Database name | `smart_task_manager` |
| `JWT_SECRET` | Secret key for JWT signing | *(must change in production)* |
| `JWT_EXPIRATION` | Token expiration duration | `7d` |
| `PORT` | Server port | `3000` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:3001` |
| `NODE_ENV` | Environment mode | `development` |

### Database Setup

```bash
# Create the PostgreSQL database
createdb smart_task_manager

# The schema auto-synchronizes in development mode (NODE_ENV !== 'production')
# For production, use migrations:
npm run migration:generate -- -n InitialMigration
npm run migration:run
```

### Running the Application

```bash
# Development mode (with hot reload)
npm run start:dev

# Production build
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

The API will be available at `http://localhost:3000` and Swagger docs at `http://localhost:3000/api/docs`.

---

## API Documentation

Interactive Swagger documentation is available at **`/api/docs`** when the server is running.

### Authentication

All protected endpoints require a JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/auth/register` | Register a new user account | No |
| `POST` | `/auth/login` | Login with email and password | No |
| `GET` | `/auth/profile` | Get current user profile | Yes |

#### POST /auth/register

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "StrongP@ss1",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user"
}
```

**Responses:**
| Status | Description |
|---|---|
| `201` | User created. Returns `{ user, accessToken }` |
| `400` | Validation error |
| `409` | Email already exists |

#### POST /auth/login

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "StrongP@ss1"
}
```

**Responses:**
| Status | Description |
|---|---|
| `200` | Login successful. Returns `{ user, accessToken }` |
| `400` | Validation error |
| `401` | Invalid credentials or deactivated account |

#### GET /auth/profile

**Responses:**
| Status | Description |
|---|---|
| `200` | Returns user profile (without password) |
| `401` | Missing or invalid JWT token |

---

### Projects

All project endpoints require authentication.

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/projects` | Create a new project | Yes |
| `GET` | `/projects` | List all accessible projects | Yes |
| `GET` | `/projects/:id` | Get a project by ID | Yes |
| `PATCH` | `/projects/:id` | Update a project (owner/admin) | Yes |
| `DELETE` | `/projects/:id` | Delete a project (owner/admin) | Yes |
| `POST` | `/projects/:id/members` | Add a project member (owner/admin) | Yes |
| `DELETE` | `/projects/:id/members/:userId` | Remove a member (owner/admin) | Yes |

#### POST /projects

**Request Body:**
```json
{
  "name": "My Awesome Project",
  "description": "A project for tracking tasks"
}
```

**Responses:**
| Status | Description |
|---|---|
| `201` | Project created with owner as first member |
| `400` | Validation error |
| `401` | Unauthorized |

#### PATCH /projects/:id

**Request Body (all fields optional):**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "isActive": false
}
```

**Responses:**
| Status | Description |
|---|---|
| `200` | Project updated |
| `403` | Only owner can update |
| `404` | Project not found |

#### POST /projects/:id/members

**Request Body:**
```json
{
  "userId": "uuid-of-user",
  "role": "member"
}
```

**Responses:**
| Status | Description |
|---|---|
| `201` | Member added or role updated |
| `403` | Only owner can add members |
| `404` | Project not found |

---

### Tasks

All task endpoints require authentication and project membership.

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/tasks` | Create a new task | Yes |
| `GET` | `/tasks/my` | Get tasks assigned to current user | Yes |
| `GET` | `/tasks/project/:projectId` | Get all tasks for a project | Yes |
| `GET` | `/tasks/:id` | Get a task by ID | Yes |
| `PATCH` | `/tasks/:id` | Update a task | Yes |
| `PATCH` | `/tasks/:id/assign/:assigneeId` | Assign a task to a user | Yes |
| `PATCH` | `/tasks/:id/unassign` | Remove task assignment | Yes |
| `DELETE` | `/tasks/:id` | Delete a task (creator/owner/admin) | Yes |

#### POST /tasks

**Request Body:**
```json
{
  "title": "Implement login feature",
  "description": "Add JWT-based authentication",
  "projectId": "uuid-of-project",
  "priority": "high",
  "dueDate": "2026-03-15T00:00:00.000Z",
  "assigneeId": "uuid-of-assignee"
}
```

**Responses:**
| Status | Description |
|---|---|
| `201` | Task created |
| `400` | Validation error |
| `403` | User or assignee lacks project access |

#### PATCH /tasks/:id

**Request Body (all fields optional):**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "status": "in_progress",
  "priority": "urgent",
  "dueDate": "2026-04-01T00:00:00.000Z",
  "assigneeId": "uuid-of-assignee"
}
```

**Responses:**
| Status | Description |
|---|---|
| `200` | Task updated |
| `403` | User lacks project access or new assignee is not a member |
| `404` | Task not found |

### Enums

**TaskStatus:** `todo`, `in_progress`, `in_review`, `done`, `cancelled`

**TaskPriority:** `low`, `medium`, `high`, `urgent`

**Role:** `admin`, `user`

**ProjectRole:** `owner`, `member`

---

## Project Structure

```
backend/
├── src/
│   ├── main.ts                          # Application entry point & bootstrap
│   ├── app.module.ts                    # Root module configuration
│   ├── auth/                            # Authentication module
│   │   ├── auth.module.ts               # Module definition
│   │   ├── auth.controller.ts           # Auth HTTP endpoints
│   │   ├── auth.service.ts              # Auth business logic
│   │   ├── dto/
│   │   │   ├── login.dto.ts             # Login request validation
│   │   │   └── register.dto.ts          # Registration request validation
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts        # JWT authentication guard
│   │   └── strategies/
│   │       └── jwt.strategy.ts          # Passport JWT strategy
│   ├── users/                           # Users module
│   │   ├── users.module.ts
│   │   ├── users.service.ts             # User CRUD & password validation
│   │   └── entities/
│   │       └── user.entity.ts           # User database entity
│   ├── projects/                        # Projects module
│   │   ├── projects.module.ts
│   │   ├── projects.controller.ts       # Project HTTP endpoints
│   │   ├── projects.service.ts          # Project business logic
│   │   ├── dto/
│   │   │   ├── create-project.dto.ts
│   │   │   ├── update-project.dto.ts
│   │   │   └── add-member.dto.ts
│   │   └── entities/
│   │       ├── project.entity.ts        # Project database entity
│   │       └── project-member.entity.ts # Project membership join entity
│   ├── tasks/                           # Tasks module
│   │   ├── tasks.module.ts
│   │   ├── tasks.controller.ts          # Task HTTP endpoints
│   │   ├── tasks.service.ts             # Task business logic
│   │   ├── dto/
│   │   │   ├── create-task.dto.ts
│   │   │   └── update-task.dto.ts
│   │   └── entities/
│   │       └── task.entity.ts           # Task database entity
│   └── common/                          # Shared utilities
│       ├── decorators/
│       │   ├── current-user.decorator.ts  # @CurrentUser() param decorator
│       │   └── roles.decorator.ts         # @Roles() metadata decorator
│       ├── enums/
│       │   ├── index.ts                   # Barrel exports
│       │   ├── role.enum.ts               # Admin/User roles
│       │   ├── project-role.enum.ts       # Owner/Member roles
│       │   ├── task-status.enum.ts        # Task lifecycle statuses
│       │   └── task-priority.enum.ts      # Task priority levels
│       └── guards/
│           └── roles.guard.ts             # RBAC guard
├── test/                                # End-to-end tests
│   ├── auth.e2e-spec.ts
│   ├── projects.e2e-spec.ts
│   ├── tasks.e2e-spec.ts
│   └── test-utils.ts                   # Test helper utilities
├── .env.example                         # Environment variable template
├── package.json
├── tsconfig.json
├── jest.config.ts                       # Unit test configuration
└── jest.e2e.config.ts                   # E2E test configuration
```

## Testing

The project includes both unit tests and end-to-end (E2E) tests.

```bash
# Run unit tests
npm test

# Run unit tests in watch mode
npm run test:watch

# Run unit tests with coverage report
npm run test:cov

# Run E2E tests (uses in-memory SQLite)
npm run test:e2e

# Run all tests
npm run test:all

# CI-optimized test run
npm run test:ci
```

### Test Architecture

- **Unit Tests** (`*.spec.ts`) — Test individual services, controllers, guards, and decorators in isolation using mocks
- **E2E Tests** (`test/*.e2e-spec.ts`) — Test complete HTTP request/response cycles using an in-memory SQLite database via `better-sqlite3`
- **Test Utils** (`test/test-utils.ts`) — Shared setup helpers for bootstrapping the NestJS testing module

## Deployment

### Production Build

```bash
# Build the TypeScript source
npm run build

# Start from compiled output
npm run start:prod
```

### Production Checklist

1. **Set `NODE_ENV=production`** — Disables auto-sync and SQL logging
2. **Use strong `JWT_SECRET`** — Generate a cryptographically secure random string
3. **Run database migrations** — Do not rely on `synchronize: true` in production
4. **Configure CORS** — Set `FRONTEND_URL` to your production frontend domain
5. **Use HTTPS** — Ensure the API is served over TLS
6. **Set up a reverse proxy** — Use Nginx or a cloud load balancer

### Docker (Optional)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main"]
```

## Scripts Reference

| Script | Description |
|---|---|
| `npm run start:dev` | Start in development mode with hot reload |
| `npm run start:debug` | Start with Node.js debugger attached |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start:prod` | Start the production build |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:cov` | Run tests with coverage |
| `npm run lint` | Lint and auto-fix source files |
| `npm run lint:check` | Check for lint errors without fixing |
| `npm run format` | Format source files with Prettier |
| `npm run format:check` | Check formatting without changes |
| `npm run migration:generate` | Generate a new TypeORM migration |
| `npm run migration:run` | Run pending migrations |
| `npm run migration:revert` | Revert the last migration |

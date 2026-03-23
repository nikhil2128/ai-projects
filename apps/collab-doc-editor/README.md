# CollabDocs - Collaborative Document Editor

A real-time collaborative document editor built with TypeScript. Multiple users can edit the same document simultaneously with live cursor tracking, user presence awareness, and conflict-free synchronization powered by Yjs CRDTs.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Further Documentation](#further-documentation)

## Architecture Overview

```
┌──────────────────────────────┐       ┌──────────────────────────────────┐
│         Frontend             │       │           Backend                │
│  (React + TipTap + Yjs)     │       │    (Express + WebSocket + Yjs)   │
│                              │       │                                  │
│  ┌────────────────────────┐  │  HTTP │  ┌────────────────────────────┐  │
│  │   React Router         │  │◄─────►│  │  REST API (Express)        │  │
│  │   - LoginPage          │  │  REST │  │  - /api/auth/*             │  │
│  │   - RegisterPage       │  │       │  │  - /api/documents/*        │  │
│  │   - HomePage           │  │       │  │  - /api/health             │  │
│  │   - EditorPage         │  │       │  └────────────────────────────┘  │
│  └────────────────────────┘  │       │                                  │
│                              │       │  ┌────────────────────────────┐  │
│  ┌────────────────────────┐  │  WS   │  │  WebSocket Server          │  │
│  │   TipTap Editor        │  │◄─────►│  │  - Yjs Sync Protocol       │  │
│  │   + Yjs Collaboration  │  │       │  │  - Awareness Protocol      │  │
│  │   + y-websocket        │  │       │  │  - Binary State Persist    │  │
│  └────────────────────────┘  │       │  └────────────────────────────┘  │
│                              │       │                                  │
│  ┌────────────────────────┐  │       │  ┌────────────────────────────┐  │
│  │   AuthContext           │  │       │  │  Data Layer                │  │
│  │   (JWT + localStorage)  │  │       │  │  - users.json              │  │
│  └────────────────────────┘  │       │  │  - documents.json           │  │
│                              │       │  │  - ydocs/*.bin              │  │
└──────────────────────────────┘       └──────────────────────────────────┘
```

### Data Flow

1. **Authentication**: Clients authenticate via REST API and receive a JWT token.
2. **Document Management**: CRUD operations on documents happen over REST.
3. **Real-time Collaboration**: Once editing, clients connect via WebSocket using the Yjs sync protocol. All edits are propagated as CRDT updates and merged conflict-free.
4. **Persistence**: Document binary state (Yjs) is saved to disk on updates and when the last client disconnects.

## Features

- **Real-time collaborative editing** with multiple simultaneous users
- **Live cursor positions and selections** of other users with name labels
- **Rich text formatting**: headings, bold, italic, underline, strikethrough, lists, code blocks, blockquote, highlights, and more
- **User authentication**: register, login, JWT-based session management
- **Document management**: create, rename, delete documents
- **Document sharing**: share documents with other users by searching for them
- **User presence awareness**: see who's online in a document
- **Customizable display names and colors** per user
- **Persistent document storage**: file-based JSON + binary Yjs state
- **Connection status indicator**: connected, syncing, disconnected states
- **Auto-reconnection** on network issues
- **Responsive modern UI** with a clean design system
- **Access control**: only authors can delete or share documents

## Tech Stack

| Layer       | Technology                                      |
| ----------- | ----------------------------------------------- |
| Frontend    | React 19, TypeScript, TipTap 2, Vite 6         |
| Editor      | TipTap (ProseMirror) + Yjs Collaboration        |
| Real-time   | Yjs CRDT + y-websocket + y-protocols            |
| Backend     | Express 4, TypeScript, ws (WebSocket)           |
| Auth        | Custom JWT (HS256) + PBKDF2-SHA512 passwords    |
| Persistence | File-based (JSON metadata + binary Yjs state)   |
| Testing     | Vitest, Testing Library, Supertest              |
| Icons       | Lucide React                                    |
| Styling     | Pure CSS with CSS custom properties              |

## Getting Started

### Prerequisites

- **Node.js** 18 or higher
- **npm** (comes with Node.js)

### 1. Clone and Install

```bash
# Install backend dependencies
cd apps/collab-doc-editor/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Start the Backend

```bash
cd backend
npm run dev
```

The backend starts at `http://localhost:3001`. It serves both the REST API and the WebSocket server.

### 3. Start the Frontend

```bash
cd frontend
npm run dev
```

The frontend starts at `http://localhost:5173`. Vite proxies `/api` and `/collaboration` requests to the backend automatically.

### 4. Try It Out

1. Open `http://localhost:5173` in your browser
2. Register a new account
3. Create a new document from the home page
4. Open the same document URL in another browser tab/window (or incognito with a different account)
5. Start typing - changes appear in real-time across all tabs
6. Notice live cursors and user presence indicators

## Project Structure

```
apps/collab-doc-editor/
├── backend/                    # Express + WebSocket backend
│   ├── src/
│   │   ├── index.ts            # Server entry point (HTTP + WS)
│   │   ├── ws-server.ts        # Yjs WebSocket collaboration server
│   │   ├── routes/
│   │   │   ├── auth.ts         # Authentication endpoints
│   │   │   └── documents.ts    # Document CRUD + sharing endpoints
│   │   ├── middleware/
│   │   │   └── auth.ts         # JWT authentication middleware
│   │   ├── store/
│   │   │   ├── user-store.ts   # User data persistence
│   │   │   └── document-store.ts # Document metadata + Yjs state persistence
│   │   └── __tests__/          # Unit, integration, and E2E tests
│   ├── data/                   # Runtime data (auto-created)
│   │   ├── users.json
│   │   ├── documents.json
│   │   └── ydocs/              # Binary Yjs document states
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
│
├── frontend/                   # React + TipTap frontend
│   ├── src/
│   │   ├── main.tsx            # React entry point
│   │   ├── App.tsx             # Router + route guards
│   │   ├── components/         # Reusable UI components
│   │   │   ├── CollaborativeEditor.tsx
│   │   │   ├── EditorToolbar.tsx
│   │   │   ├── ConnectionStatus.tsx
│   │   │   ├── UserPresence.tsx
│   │   │   └── ShareDialog.tsx
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx  # Global auth state provider
│   │   ├── hooks/
│   │   │   └── useCollaboration.ts  # Yjs + WebSocket hook
│   │   ├── pages/              # Route page components
│   │   │   ├── HomePage.tsx
│   │   │   ├── EditorPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── services/
│   │   │   └── api.ts          # REST API client
│   │   └── styles/
│   │       └── index.css       # Global CSS + design tokens
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── vitest.config.ts
│
└── README.md                   # This file
```

## How It Works

### Yjs CRDT (Conflict-free Replicated Data Types)

Yjs uses CRDTs to enable real-time collaboration without a central authority for conflict resolution. Each client maintains a local copy of the document, and changes are automatically merged without conflicts, even when users edit the same paragraph simultaneously.

Key concepts:
- **Y.Doc**: The shared document that contains collaborative data types
- **Y.XmlFragment**: Used by TipTap to store the rich-text document structure
- **Awareness**: A protocol for sharing ephemeral state (cursors, selections, user info) between clients

### WebSocket Sync Protocol

The backend runs a custom Yjs-aware WebSocket server that:

1. **Authenticates** clients via JWT token in the connection query string
2. **Checks access control** to ensure the user can access the requested document
3. **Sends initial sync** (sync step 1) to bring the client up to date
4. **Broadcasts updates** to all connected clients in the same document room
5. **Handles awareness** updates (cursor positions, user info)
6. **Persists state** to disk on document changes and when the last client disconnects

### TipTap Integration

TipTap provides the rich text editing experience. Its `Collaboration` extension binds to the Yjs document, and `CollaborationCursor` displays remote users' cursors and selections in real-time.

### Authentication Flow

```
Register/Login ──► Server returns JWT ──► Stored in localStorage
                                              │
        ┌─────────────────────────────────────┘
        ▼
  REST requests: Authorization: Bearer <token>
  WebSocket:     ?token=<token> query parameter
        │
        ▼
  Server validates JWT ──► Attaches user to request
```

## Environment Variables

### Backend

| Variable     | Default                                              | Description              |
| ------------ | ---------------------------------------------------- | ------------------------ |
| `PORT`       | `3001`                                               | HTTP/WS server port      |
| `HOST`       | `localhost`                                          | Server bind address      |
| `JWT_SECRET` | `collab-doc-editor-dev-secret-change-in-production`  | JWT signing secret       |

### Frontend

The frontend uses Vite's dev server proxy configuration. No environment variables are required for local development. The proxy is configured in `vite.config.ts`:

- `/api/*` is proxied to `http://localhost:3001`
- `/collaboration` WebSocket connections are proxied to `ws://localhost:3001`

## Testing

Both frontend and backend use **Vitest** as the test framework with **90% coverage thresholds**.

### Backend Tests

```bash
cd backend
npm test              # Run tests once
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

Test categories:
- **Unit tests**: Store operations, JWT middleware, password hashing
- **Integration tests**: HTTP route handlers with mocked stores
- **E2E tests**: Multi-client WebSocket collaboration scenarios

### Frontend Tests

```bash
cd frontend
npm test              # Run tests once
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

Test categories:
- **Component tests**: React component rendering and interaction
- **Context tests**: AuthContext state management
- **Hook tests**: `useCollaboration` hook behavior
- **Service tests**: API client functions
- **Page tests**: Full page rendering with mocked dependencies

### Other Quality Commands

```bash
npm run lint          # ESLint (both frontend & backend)
npm run typecheck     # TypeScript type checking
```

## Further Documentation

For detailed documentation on each part of the application:

- **[Backend Documentation](./backend/README.md)** - API reference, middleware, stores, WebSocket protocol
- **[Frontend Documentation](./frontend/README.md)** - Components, hooks, state management, routing

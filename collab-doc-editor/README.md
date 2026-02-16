# CollabDocs - Collaborative Document Editor

A real-time collaborative document editor similar to Google Docs, built with TypeScript. Multiple users can edit the same document simultaneously with live cursor tracking and conflict-free synchronization.

## Architecture

- **Frontend**: React + TipTap (ProseMirror) + Yjs + Vite
- **Backend**: Express + Custom Yjs WebSocket Server
- **Sync Algorithm**: Yjs CRDT (Conflict-free Replicated Data Types)
- **Transport**: WebSocket (via y-websocket protocol)

## Features

- Real-time collaborative editing with multiple simultaneous users
- Live cursor positions and selections of other users
- Rich text formatting (headings, bold, italic, underline, lists, code blocks, etc.)
- Document management (create, rename, delete)
- User presence awareness (see who's online)
- Customizable user names and colors
- Persistent document storage
- Connection status indicator
- Auto-reconnection on network issues
- Responsive modern UI

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

The backend server starts at `http://localhost:3001`.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at `http://localhost:5173` and proxies API/WebSocket requests to the backend.

### Testing Collaboration

1. Start both backend and frontend servers
2. Open `http://localhost:5173` in your browser
3. Create a new document
4. Open the same URL in another browser tab or window
5. Both tabs will be editing the same document in real-time
6. You'll see each user's cursor and selections live

## Project Structure

```
collab-doc-editor/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express + WebSocket server entry
│   │   ├── ws-server.ts          # Yjs WebSocket collaboration handler
│   │   ├── routes/
│   │   │   └── documents.ts      # REST API for document CRUD
│   │   └── store/
│   │       └── document-store.ts # File-based document persistence
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx              # React entry point
│   │   ├── App.tsx               # Router setup
│   │   ├── components/
│   │   │   ├── CollaborativeEditor.tsx  # TipTap + Yjs editor
│   │   │   ├── EditorToolbar.tsx        # Rich text formatting toolbar
│   │   │   ├── UserPresence.tsx         # User avatars & online panel
│   │   │   └── ConnectionStatus.tsx     # WebSocket connection indicator
│   │   ├── hooks/
│   │   │   └── useCollaboration.ts      # Yjs + WebSocket provider hook
│   │   ├── pages/
│   │   │   ├── HomePage.tsx      # Document list / dashboard
│   │   │   └── EditorPage.tsx    # Document editor view
│   │   ├── services/
│   │   │   └── api.ts            # REST API client
│   │   └── styles/
│   │       └── index.css         # Global styles
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
└── README.md
```

## How It Works

### Yjs CRDT

Yjs uses Conflict-free Replicated Data Types (CRDTs) to enable real-time collaboration without a central authority for conflict resolution. Each client maintains a local copy of the document, and changes are automatically merged without conflicts - even when users are editing the same paragraph simultaneously.

### WebSocket Sync

The backend runs a custom Yjs-aware WebSocket server that:
1. Manages document state in memory
2. Broadcasts updates to all connected clients
3. Persists document state to disk
4. Handles awareness (cursor positions, user info)

### TipTap Integration

TipTap provides the rich text editing experience, with its `Collaboration` and `CollaborationCursor` extensions connecting directly to the Yjs document and awareness protocol.

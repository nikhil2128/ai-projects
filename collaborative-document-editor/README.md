# Collaborative Document Editor

A standalone full-stack TypeScript project for real-time collaborative text editing (Google Docs style basics).

## Tech Stack

- Frontend: Vite + TypeScript + Yjs + y-websocket
- Backend: Node.js + TypeScript + Express + WebSocket (`ws`) + Yjs

## Features

- Multiple users editing the same document simultaneously
- Conflict-free real-time collaboration using CRDT (Yjs)
- Shared room model (`room-id`) so users can collaborate by joining the same room
- Live presence list using awareness updates

## Project Structure

```text
collaborative-document-editor/
  backend/
  frontend/
```

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start backend:

```bash
npm run dev:backend
```

3. Start frontend (new terminal):

```bash
npm run dev:frontend
```

4. Open the frontend URL (default `http://localhost:5173`), then open the same room in multiple browser tabs/windows.

## Environment

- Frontend supports optional `VITE_COLLAB_SERVER_URL` (default `ws://localhost:1234`)
- Backend supports optional `PORT` (default `1234`)

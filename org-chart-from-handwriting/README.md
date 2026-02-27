# Org Chart From Handwriting

A web app that converts a handwritten organization-structure screenshot into a polished, downloadable org chart.

## What it does

- Upload a screenshot image (PNG/JPEG/WebP)
- Uses a vision model to understand people, roles, and reporting lines
- Renders an interactive org chart preview
- Exports the generated chart as PNG

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, OpenAI vision API
- **Frontend**: React, Vite, TypeScript, React Flow, Dagre

## Project Structure

```
org-chart-from-handwriting/
├── backend/
│   ├── src/
│   │   ├── index.ts
│   │   ├── prompt.ts
│   │   └── schema.ts
│   └── .env.example
└── frontend/
    └── src/
        ├── App.tsx
        ├── layout.ts
        ├── main.tsx
        ├── styles.css
        └── types.ts
```

## Setup

### 1) Backend

```bash
cd backend
npm install
cp .env.example .env
```

Set these env vars in `backend/.env`:

- `OPENAI_API_KEY` (required)
- `OPENAI_MODEL` (optional, default: `gpt-4.1-mini`)
- `OPENAI_BASE_URL` (optional for OpenAI-compatible providers)
- `PORT` (optional, default: `3001`)
- `CORS_ORIGIN` (optional, default: `http://localhost:5173`)

Run backend:

```bash
npm run dev
```

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Optional frontend env:

- `VITE_API_URL` (default: `http://localhost:3001`)

## API

### `POST /api/org-chart/from-image`

`multipart/form-data` with field name: `image`

Success response:

```json
{
  "chart": {
    "organizationName": "Acme Corp",
    "nodes": [{ "id": "ceo", "name": "Alex", "role": "CEO" }],
    "edges": [],
    "confidence": "medium",
    "assumptions": []
  },
  "model": "gpt-4.1-mini"
}
```

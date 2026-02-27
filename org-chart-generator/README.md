# OrgVision — AI Org Chart Generator

Upload a screenshot of a handwritten organization chart, and OrgVision uses GPT-4o Vision to parse the structure and render a beautiful, downloadable org chart.

## Features

- Drag-and-drop image upload (PNG, JPG, WEBP)
- AI-powered handwriting recognition via OpenAI GPT-4o
- Beautiful hierarchical org chart with color-coded tiers
- Download as PNG (2x resolution) or SVG
- Responsive design with smooth animations

## Quick Start

```bash
# Install dependencies
npm install

# Copy env and add your OpenAI API key
cp .env.example .env
# Edit .env and set OPENAI_API_KEY

# Start development servers (frontend + backend)
npm run dev
```

The app runs at **http://localhost:5173** with the API server on port 3001.

## Tech Stack

| Layer    | Technology                        |
| -------- | --------------------------------- |
| Frontend | React 18 + TypeScript + Vite      |
| Styling  | Tailwind CSS                      |
| Backend  | Express + TypeScript              |
| AI       | OpenAI GPT-4o Vision              |
| Export   | html-to-image (PNG/SVG)           |

## Environment Variables

| Variable         | Description           |
| ---------------- | --------------------- |
| `OPENAI_API_KEY` | Your OpenAI API key   |
| `PORT`           | Backend port (default 3001) |

# AI Projects Monorepo

A collection of independent projects, each with its own tech stack, lint/test configuration, and deployment pipeline.

## Projects

| Project | Description | Backend | Frontend | Deploy Target |
|---------|-------------|---------|----------|---------------|
| [buggy-task-system](./buggy-task-system/) | Task management API (for debugging practice) | Express.js | — | Docker |
| [csv-merger](./csv-merger/) | CSV file merging and analysis tool | Express.js | React + Vite | Docker |
| [image-annotator](./image-annotator/) | Collaborative image annotation platform | Express.js + Prisma | React + Vite | AWS (ECS + S3/CloudFront) |
| [invoice-processor](./invoice-processor/) | Async invoice PDF extraction API | NestJS + TypeORM | React + Vite | Docker |
| [org-chart-from-handwriting](./org-chart-from-handwriting/) | Handwritten org screenshot to polished downloadable org chart | Express.js | React + Vite | Docker |
| [smart-task-manager](./smart-task-manager/) | Full-stack project & task management | NestJS + TypeORM | Next.js | Docker |

## Repository Structure

```
ai-projects/
├── .github/workflows/       # CI/CD pipelines (per-project)
├── .husky/                   # Git hooks (project-aware)
├── buggy-task-system/        # Independent project
├── csv-merger/               # Independent project
├── image-annotator/          # Independent project
├── invoice-processor/        # Independent project
├── org-chart-from-handwriting/ # Independent project
├── smart-task-manager/       # Independent project
├── Makefile                  # Root-level orchestration
└── README.md
```

## How It Works

Each project is **fully independent** — it has its own:

- **Dependencies** (`package.json` + `package-lock.json`)
- **Lint configuration** (ESLint, Prettier)
- **Test setup** (Jest or Vitest)
- **Build pipeline** (TypeScript, Vite, Next.js, NestJS CLI)
- **Dockerfile** for containerized deployment
- **CI workflow** (GitHub Actions, triggered only when that project changes)
- **Deploy workflow** (GitHub Actions, project-specific)

## Quick Start

### Using Make (recommended)

```bash
# Lint a specific project
make lint p=csv-merger/backend

# Test a specific project
make test p=image-annotator/backend

# Build a specific project
make build p=invoice-processor

# Lint all projects
make lint-all

# Test all projects
make test-all

# Build Docker image for a project
make docker-build p=csv-merger/backend
```

### Directly via npm

```bash
cd csv-merger/backend
npm install
npm run lint
npm test
npm run build
```

## CI/CD

Each project has its own GitHub Actions workflows:

- **CI** (`ci-{project}.yml`) — runs on PR/push, filters by changed paths
- **Deploy** (`deploy-{project}.yml`) — deploys to test/prod environments

Changes to `csv-merger/` will **only** trigger `ci-csv-merger.yml` — other projects are unaffected.

## Adding a New Project

1. Create a new directory at the root
2. Initialize with `npm init` and add standard scripts: `lint`, `test`, `build`, `typecheck`, `dev`
3. Add an ESLint config (`eslint.config.mjs`)
4. Add a `Dockerfile`
5. Copy and adapt a CI workflow from `.github/workflows/`
6. Update this README

# AI Projects Monorepo (Nx)

This monorepo is orchestrated by [Nx](https://nx.dev/) so multiple independent projects can be developed, tested, built, and deployed consistently with caching and affected-only execution.

## What Nx Adds

- A single task runner across all projects (`nx run`, `nx run-many`, `nx affected`)
- Better local/CI performance via task caching
- A dependency graph for understanding project relationships
- A clean path for shared libraries under `libs/`
- Easier onboarding for new projects that follow workspace conventions

## Projects

| Project | Description | Packages |
|---------|-------------|----------|
| [alphabet-tracer](apps/alphabet-tracer) | Multi-app learning platform for kids with per-app reward tracking | single package |
| [buggy-task-system](apps/buggy-task-system) | Intentional complex concurrency bug for debugging practice | single package |
| [click-analytics](apps/click-analytics) | High-throughput click analytics with Redis Streams and ClickHouse | root + admin-portal |
| [collab-doc-editor](apps/collab-doc-editor) | Real-time collaborative document editor with Yjs CRDTs | backend, frontend |
| [content-cms](apps/content-cms) | Content management system | single package |
| [csv-merger](apps/csv-merger) | Upload, analyze, and merge multiple CSV files into a single output | backend, frontend |
| [data-export-service](apps/data-export-service) | Serverless CSV export — paginated API fetch, S3 upload, and email delivery | single package |
| [ecommerce](apps/ecommerce) | E-commerce application with React frontend and microservice backend | root + backend, frontend |
| [floor-plan-3d](apps/floor-plan-3d) | 3D floor plan visualization | backend, frontend |
| [image-annotator](apps/image-annotator) | Collaborative image annotation for manufacturing quality control | backend, frontend |
| [invoice-processor](apps/invoice-processor) | Production-ready invoice processing API with async PDF extraction | root + ui |
| [matrimonial](apps/matrimonial) | Matrimonial platform with advanced matching and family profile sharing | root + backend, frontend |
| [onboarding-doc-tracker](apps/onboarding-doc-tracker) | Monitors HR emails for onboarding docs, uploads to OneDrive, and notifies HR | single package |
| [org-chart-generator](apps/org-chart-generator) | AI-powered org chart generation from handwritten screenshots via GPT-4o Vision | single package |
| [photo-share](apps/photo-share) | Instagram-like photo sharing platform with filters and geo-recommendations | backend, frontend |
| [ppt-analyzer](apps/ppt-analyzer) | PowerPoint presentation analyzer | root + backend, frontend |
| [product-listing](apps/product-listing) | Product listing application | single package |
| [smart-task-manager](apps/smart-task-manager) | Smart task management application | backend, frontend |
| [training-content-generator](apps/training-content-generator) | Turn source material into employee training assets and questionnaires | single package |
| [url-shortener](apps/url-shortener) | Production-ready, cost-optimized URL shortening service with Fastify and SQLite | single package |
| [video-merger](apps/video-merger) | Merges timestamped video chunks from S3, filling gaps with black frames | single package |

### Shared Libraries

| Library | Description |
|---------|-------------|
| [logger](libs/logger) | Shared logging utility |

## Workspace Layout

```text
ai-projects/
├── Makefile                # Convenience commands mapped to Nx
├── nx.json                 # Nx workspace config + target defaults
├── package.json            # Root workspace + Nx scripts
├── apps/                   # Product apps and services
├── tsconfig.base.json      # Shared TS base config / shared lib alias
├── libs/                   # Cross-project shared libraries
└── .github/                # Monorepo CI/CD workflows
```

## Quick Start

```bash
# Install root + workspace dependencies
make install-all

# List projects discovered by Nx
make projects

# Run tasks on all projects
make lint-all
make test-all
make build-all
make typecheck-all

# Run task for one project (path or project name)
make lint p=apps/csv-merger/backend
make test p=smart-task-backend

# Run only changed projects
make affected-lint
make affected-test
make affected-build
```

## Useful Nx Commands

```bash
# Show project graph
make graph

# Direct Nx usage
npm run nx -- show projects
npm run nx -- run-many -t build --all
npm run nx -- affected -t test
```

## Shared Libraries

Create shared code in `libs/` and consume it from apps/services.

```bash
npx nx g @nx/js:library libs/<lib-name>
```

The workspace includes a default alias pattern in `tsconfig.base.json`:

- `@libs/*` -> `libs/*/src/index.ts`

## Adding a New Project

1. Create a new package with `package.json` and scripts (`dev`, `build`, `lint`, `test`, `typecheck`).
2. Place applications under `apps/<project>` and nested packages under `apps/<project>/<package>`.
3. Place shared libraries directly under `libs/<lib-name>`.
4. Run `make install-all`.
5. Verify discovery with `make projects`.
6. Prefer the root GitHub Actions workflow in `.github/workflows/ci.yml` for validation and keep deploy workflows project-specific.

> **Note:** The Husky pre-commit hook automatically discovers all `package.json` files under `apps/` and `libs/`, so no manual registration is needed when adding new projects.

## Deployment Strategy

For CI/CD, use the root Nx workflow for affected-only validation and keep project-specific deploy jobs for environment-specific release steps. This gives fast validation while preserving independent deployment pipelines.

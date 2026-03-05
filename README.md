# AI Projects Monorepo (Nx)

This monorepo is now orchestrated by [Nx](https://nx.dev/) so multiple independent projects can be developed, tested, built, and deployed consistently with caching and affected-only execution.

## What Nx Adds

- A single task runner across all projects (`nx run`, `nx run-many`, `nx affected`)
- Better local/CI performance via task caching
- A dependency graph for understanding project relationships
- A clean path for shared libraries under `libs/`
- Easier onboarding for new projects that follow workspace conventions

## Workspace Layout

```
ai-projects/
├── Makefile                # Convenience commands mapped to Nx
├── nx.json                 # Nx workspace config + target defaults
├── package.json            # Root workspace + Nx scripts
├── tsconfig.base.json      # Shared TS base config / shared lib alias
├── libs/                   # Cross-project shared libraries
└── <projects...>           # Existing independent apps/services
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
make lint p=csv-merger/backend
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
npx nx g @nx/js:library libs/shared/<lib-name>
```

The workspace includes a default alias pattern in `tsconfig.base.json`:

- `@shared/*` -> `libs/shared/*/src/index.ts`

## Adding a New Project

1. Create a new package with `package.json` and scripts (`dev`, `build`, `lint`, `test`, `typecheck`).
2. Place it at root (`new-project/`) or one level nested (`domain/new-project/`) to match workspace globs.
3. Run `make install-all`.
4. Verify discovery with `make projects`.
5. Add/adjust CI workflows to use Nx (`nx affected` where possible).

## Deployment Strategy

For CI/CD, prefer `nx affected` for selective builds/tests and keep per-project deploy jobs. This gives fast validation while preserving independent deployment pipelines.

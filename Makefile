# ============================================================
# Root Makefile — Nx orchestration for all projects
# ============================================================
#
# Usage:
#   make lint p=csv-merger/backend       # Run lint for one project path
#   make lint p=csv-merger-backend       # Run lint for one project name
#   make test-all                        # Test all projects
#   make affected-build                  # Build only changed projects
#   make graph                           # Open Nx dependency graph
# ============================================================

.PHONY: help install install-all projects graph \
	lint test build typecheck dev \
	lint-all test-all build-all typecheck-all dev-all \
	affected-lint affected-test affected-build affected-typecheck \
	docker-build

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

projects: ## List all Nx projects
	npm run nx -- show projects

graph: ## Open Nx dependency graph
	npm run nx -- graph

# ── Single-project commands (use p= as project path or name) ─

install: ## Install dependencies for one project (p=<project-path-or-name>)
	@if [ -z "$(p)" ]; then echo "Usage: make install p=<project-path-or-name>"; exit 1; fi
	@if [ -d "$(p)" ]; then \
		cd $(p) && npm install; \
	else \
		npm install --workspace "$(p)"; \
	fi

lint: ## Lint one project (p=<project-path-or-name>)
	@if [ -z "$(p)" ]; then echo "Usage: make lint p=<project-path-or-name>"; exit 1; fi
	@project=$$(node -e "const fs=require('fs');const path=require('path');const input=process.argv[1];const pkgPath=path.join(process.cwd(), input, 'package.json');if(fs.existsSync(pkgPath)){process.stdout.write(JSON.parse(fs.readFileSync(pkgPath,'utf8')).name||input);}else{process.stdout.write(input);} " "$(p)"); \
	npm run nx -- run $$project:lint

test: ## Test one project (p=<project-path-or-name>)
	@if [ -z "$(p)" ]; then echo "Usage: make test p=<project-path-or-name>"; exit 1; fi
	@project=$$(node -e "const fs=require('fs');const path=require('path');const input=process.argv[1];const pkgPath=path.join(process.cwd(), input, 'package.json');if(fs.existsSync(pkgPath)){process.stdout.write(JSON.parse(fs.readFileSync(pkgPath,'utf8')).name||input);}else{process.stdout.write(input);} " "$(p)"); \
	npm run nx -- run $$project:test

build: ## Build one project (p=<project-path-or-name>)
	@if [ -z "$(p)" ]; then echo "Usage: make build p=<project-path-or-name>"; exit 1; fi
	@project=$$(node -e "const fs=require('fs');const path=require('path');const input=process.argv[1];const pkgPath=path.join(process.cwd(), input, 'package.json');if(fs.existsSync(pkgPath)){process.stdout.write(JSON.parse(fs.readFileSync(pkgPath,'utf8')).name||input);}else{process.stdout.write(input);} " "$(p)"); \
	npm run nx -- run $$project:build

typecheck: ## Type-check one project (p=<project-path-or-name>)
	@if [ -z "$(p)" ]; then echo "Usage: make typecheck p=<project-path-or-name>"; exit 1; fi
	@project=$$(node -e "const fs=require('fs');const path=require('path');const input=process.argv[1];const pkgPath=path.join(process.cwd(), input, 'package.json');if(fs.existsSync(pkgPath)){process.stdout.write(JSON.parse(fs.readFileSync(pkgPath,'utf8')).name||input);}else{process.stdout.write(input);} " "$(p)"); \
	npm run nx -- run $$project:typecheck

dev: ## Start dev for one project (p=<project-path-or-name>)
	@if [ -z "$(p)" ]; then echo "Usage: make dev p=<project-path-or-name>"; exit 1; fi
	@project=$$(node -e "const fs=require('fs');const path=require('path');const input=process.argv[1];const pkgPath=path.join(process.cwd(), input, 'package.json');if(fs.existsSync(pkgPath)){process.stdout.write(JSON.parse(fs.readFileSync(pkgPath,'utf8')).name||input);}else{process.stdout.write(input);} " "$(p)"); \
	npm run nx -- run $$project:dev

docker-build: ## Build Docker image for a project path (p=<project-path>)
	@if [ -z "$(p)" ]; then echo "Usage: make docker-build p=<project-path>"; exit 1; fi
	docker build -t $$(echo $(p) | tr '/' '-') $(p)

# ── Aggregate commands ────────────────────────────────────────

install-all: ## Install dependencies for root + all workspaces
	npm install --workspaces --include-workspace-root

lint-all: ## Lint all projects
	npm run nx -- run-many -t lint --all

test-all: ## Test all projects
	npm run nx -- run-many -t test --all

build-all: ## Build all projects
	npm run nx -- run-many -t build --all

typecheck-all: ## Type-check all projects
	npm run nx -- run-many -t typecheck --all

dev-all: ## Start dev targets for all projects
	npm run nx -- run-many -t dev --all --parallel=5

affected-lint: ## Lint only changed projects
	npm run nx -- affected -t lint

affected-test: ## Test only changed projects
	npm run nx -- affected -t test

affected-build: ## Build only changed projects
	npm run nx -- affected -t build

affected-typecheck: ## Type-check only changed projects
	npm run nx -- affected -t typecheck

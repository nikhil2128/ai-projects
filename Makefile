# ============================================================
# Root Makefile — Orchestrate independent projects
# ============================================================
#
# Usage:
#   make lint p=csv-merger/backend      # Lint a specific project
#   make test p=image-annotator/backend # Test a specific project
#   make build p=invoice-processor      # Build a specific project
#   make lint-all                       # Lint every project
#   make test-all                       # Test every project
#   make docker-build p=csv-merger/backend  # Build Docker image
# ============================================================

# All independently deployable project targets (each with their own package.json)
PROJECTS := \
	buggy-task-system \
	csv-merger/backend \
	csv-merger/frontend \
	image-annotator/backend \
	image-annotator/frontend \
	invoice-processor \
	invoice-processor/ui \
	onboarding-doc-tracker \
	photo-share/backend \
	photo-share/frontend \
	smart-task-manager/backend \
	smart-task-manager/frontend \
	video-merger

.PHONY: install lint test build typecheck dev lint-all test-all build-all typecheck-all docker-build help

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Single-project commands (use p= to specify project) ──────

install: ## Install dependencies for project (p=<project>)
	@if [ -z "$(p)" ]; then echo "Usage: make install p=<project>"; exit 1; fi
	cd $(p) && npm install

lint: ## Lint a project (p=<project>)
	@if [ -z "$(p)" ]; then echo "Usage: make lint p=<project>"; exit 1; fi
	cd $(p) && npm run lint

test: ## Test a project (p=<project>)
	@if [ -z "$(p)" ]; then echo "Usage: make test p=<project>"; exit 1; fi
	cd $(p) && npm test

build: ## Build a project (p=<project>)
	@if [ -z "$(p)" ]; then echo "Usage: make build p=<project>"; exit 1; fi
	cd $(p) && npm run build

typecheck: ## Type-check a project (p=<project>)
	@if [ -z "$(p)" ]; then echo "Usage: make typecheck p=<project>"; exit 1; fi
	cd $(p) && npm run typecheck

dev: ## Start dev server for a project (p=<project>)
	@if [ -z "$(p)" ]; then echo "Usage: make dev p=<project>"; exit 1; fi
	cd $(p) && npm run dev

docker-build: ## Build Docker image for a project (p=<project>)
	@if [ -z "$(p)" ]; then echo "Usage: make docker-build p=<project>"; exit 1; fi
	docker build -t $$(echo $(p) | tr '/' '-') $(p)

# ── Aggregate commands (all projects) ────────────────────────

install-all: ## Install dependencies for all projects
	@for proj in $(PROJECTS); do \
		echo "\n══ Installing $$proj ══"; \
		(cd $$proj && npm install) || true; \
	done

lint-all: ## Lint all projects
	@failed=""; \
	for proj in $(PROJECTS); do \
		echo "\n══ Linting $$proj ══"; \
		(cd $$proj && npm run lint) || failed="$$failed $$proj"; \
	done; \
	if [ -n "$$failed" ]; then \
		echo "\n✘ Lint failed for:$$failed"; exit 1; \
	else \
		echo "\n✔ All projects passed lint"; \
	fi

test-all: ## Test all projects
	@failed=""; \
	for proj in $(PROJECTS); do \
		echo "\n══ Testing $$proj ══"; \
		(cd $$proj && npm test) || failed="$$failed $$proj"; \
	done; \
	if [ -n "$$failed" ]; then \
		echo "\n✘ Tests failed for:$$failed"; exit 1; \
	else \
		echo "\n✔ All projects passed tests"; \
	fi

build-all: ## Build all projects
	@failed=""; \
	for proj in $(PROJECTS); do \
		echo "\n══ Building $$proj ══"; \
		(cd $$proj && npm run build) || failed="$$failed $$proj"; \
	done; \
	if [ -n "$$failed" ]; then \
		echo "\n✘ Build failed for:$$failed"; exit 1; \
	else \
		echo "\n✔ All projects built successfully"; \
	fi

typecheck-all: ## Type-check all projects
	@failed=""; \
	for proj in $(PROJECTS); do \
		echo "\n══ Type-checking $$proj ══"; \
		(cd $$proj && npm run typecheck) || failed="$$failed $$proj"; \
	done; \
	if [ -n "$$failed" ]; then \
		echo "\n✘ Type-check failed for:$$failed"; exit 1; \
	else \
		echo "\n✔ All projects passed type-check"; \
	fi

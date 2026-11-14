.DEFAULT_GOAL := help

.PHONY: help install install-pipeline install-web dev-web lint format test check build clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: install-pipeline install-web ## Install pipeline and web dependencies

install-pipeline: ## Install the Python environment with uv
	cd pipeline && uv sync

install-web: ## Install web dependencies
	cd web && npm install

dev-web: ## Run the Vite dev server on :5173
	cd web && npm run dev

lint: ## Lint the pipeline and type-check the web app
	cd pipeline && uvx ruff check . && uvx ruff format --check .
	cd web && npm run lint

format: ## Format the pipeline code
	cd pipeline && uvx ruff format . && uvx ruff check --fix .

test: ## Run the pipeline checks (the grid's self-check)
	cd pipeline && python3 -m caramulo.grid

check: lint test build ## Run everything CI runs

build: ## Build the production web bundle
	cd web && npm run build

clean: ## Remove build artefacts and caches
	rm -rf web/dist web/.vite pipeline/.ruff_cache
	find . -name "__pycache__" -type d -not -path "*/node_modules/*" -prune -exec rm -rf {} +

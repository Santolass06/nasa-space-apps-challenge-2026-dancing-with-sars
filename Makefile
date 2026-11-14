.DEFAULT_GOAL := help
PY := python3
VENV := backend/.venv
BIN := $(VENV)/bin

.PHONY: help install install-backend install-frontend dev dev-backend dev-frontend \
        test lint format check build clean docker

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: install-backend install-frontend ## Install backend and frontend dependencies

install-backend: ## Create the venv and install Python dependencies
	$(PY) -m venv $(VENV)
	$(BIN)/pip install --upgrade pip
	$(BIN)/pip install -e "backend[dev]"

install-frontend: ## Install frontend dependencies
	cd frontend && npm install

dev: ## Run backend and frontend together
	$(MAKE) -j2 dev-backend dev-frontend

dev-backend: ## Run the FastAPI dev server on :8000
	cd backend && .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend: ## Run the Vite dev server on :5173
	cd frontend && npm run dev

test: ## Run backend tests
	cd backend && .venv/bin/pytest -q

lint: ## Lint backend and frontend
	cd backend && .venv/bin/ruff check app tests
	cd frontend && npm run lint --if-present

format: ## Format backend code
	cd backend && .venv/bin/ruff format app tests
	cd backend && .venv/bin/ruff check --fix app tests

check: lint test ## Run everything CI runs
	cd frontend && npm run build

build: ## Build the production frontend bundle
	cd frontend && npm run build

clean: ## Remove build artefacts and caches
	rm -rf frontend/dist frontend/.vite backend/.pytest_cache backend/.ruff_cache
	find . -name "__pycache__" -type d -prune -exec rm -rf {} +

docker: ## Build and run the stack with Docker Compose
	docker compose up --build

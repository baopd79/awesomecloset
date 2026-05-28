.PHONY: dev worker redis test test-unit test-int lint fmt check install

# ── Dev ──────────────────────────────────────────────────────────────────────

dev:
	uv run uvicorn backend.main:app --reload --port 8000 --loop asyncio

worker:
	uv run arq backend.workers.main.WorkerSettings

redis:
	docker compose up -d redis

# ── Test ─────────────────────────────────────────────────────────────────────

test:
	uv run pytest

test-unit:
	uv run pytest tests/ -k "not integration" -q

test-int:
	uv run pytest tests/ -k "integration" -q

# ── Lint & Format ─────────────────────────────────────────────────────────────

lint:
	uv run ruff check .

fmt:
	uv run ruff format .

check:
	uv run ruff check . && uv run ruff format --check .

# ── Install ───────────────────────────────────────────────────────────────────

install:
	uv sync --all-groups

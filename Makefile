.PHONY: dev worker redis test test-unit test-int lint fmt check install migrate

# ── Dev ──────────────────────────────────────────────────────────────────────

dev:
	uv run uvicorn backend.main:app --reload --port 8000 --loop asyncio

worker:
	uv run arq backend.workers.main.WorkerSettings --verbose

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

lint-check:
	uv run ruff check .
lint-fix:
	uv run ruff check . --fix

fmt-check:
	uv run ruff format --check .
fmt-fix:
	uv run ruff format .

check:
	uv run ruff check . && uv run ruff format --check .

# ── Install ───────────────────────────────────────────────────────────────────

install:
	uv sync --all-groups

# ── Migrations ────────────────────────────────────────────────────────────────
# Apply supabase/migrations to a target DB. Point SUPABASE_DB_URL at the dev or
# prod project's direct connection string (see docs/DEPLOY.md). Two projects →
# run once per project. Example:
#   SUPABASE_DB_URL="postgresql://...dev..."  make migrate
#   SUPABASE_DB_URL="postgresql://...prod..." make migrate
migrate:
	@test -n "$(SUPABASE_DB_URL)" || (echo "Set SUPABASE_DB_URL to the target project's connection string" && exit 1)
	supabase db push --db-url "$(SUPABASE_DB_URL)"

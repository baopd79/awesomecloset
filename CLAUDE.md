# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install deps
make install          # uv sync --all-groups

# Dev
make dev              # FastAPI on :8000 (--reload)
make worker           # ARQ worker process
make redis            # start Redis via docker compose

# Test
make test             # all tests
make test-unit        # pytest -k "not integration"
make test-int         # pytest -k "integration"
uv run pytest tests/items/test_service.py::test_name  # single test

# Lint & format
make check            # ruff check + format check (no fixes)
make lint-fix         # ruff check --fix
make fmt-fix          # ruff format
```

## Architecture

**Stack**: FastAPI (Python 3.12) + Supabase (Postgres, Auth, Storage) + ARQ/Redis (background jobs) + React Native/Expo (mobile, not yet started).

**Deployment**: Two processes from the same codebase — API server (`backend.main:app`) and ARQ worker (`backend.workers.main.WorkerSettings`).

**Feature status**: `items` is the only implemented feature. `suggest`, `outfits`, and `analytics` are empty stubs planned for post-MVP. `design_handoff_awesomecloset/` contains JSX prototypes and mockups (not wired to the backend).

### Backend Feature Layout

Each feature is a self-contained folder: `backend/<feature>/{models, repository, service, router, schemas}.py`

```
Router → Service → Repository → Model
```

- **Router**: HTTP boundary, schema validation, composition root. Assembles dependencies in `_make_service()`.
- **Service**: Business logic, owns transaction boundaries. Raises `AppException`, no HTTP knowledge.
- **Repository**: All DB queries. Never exposes its session.
- **Model**: SQLModel `table=True` definition.

**Import direction**: `feature/* → core/*` only. `core/` never imports from feature modules (circular import risk).

### Dependency Injection

Shared aliases live in `core/dependencies.py`:
```python
CurrentUserDep = Annotated[str, Depends(get_current_user_id)]
SessionDep     = Annotated[AsyncSession, Depends(get_db)]
ArqDep         = Annotated[ArqRedis, Depends(get_arq)]
```

Feature-specific service aliases are defined in the router (which is the composition root):
```python
def _make_service(session: SessionDep, arq: ArqDep) -> ItemService:
    return ItemService(session, ItemRepository(session), SupabaseStorageClient(...), arq)

ServiceDep = Annotated[ItemService, Depends(_make_service)]
```

Endpoints use `Annotated` aliases, never inline `= Depends(...)`. Use `Annotated[UploadFile, File()]` (not `file: UploadFile = File(...)`) to avoid Python default-parameter ordering issues.

### Transaction Management

Service calls `transaction(self._session)` directly. Repository never manages transactions.

```python
async with transaction(self._session):
    item = await self._repo.create(item)
# non-reversible side effects AFTER commit:
await self._arq.enqueue_job("process_item", str(item.id))
```

If enqueue fails after commit → update status to `failed` + save error so user can retry. If storage upload happens before DB commit → clean up storage best-effort on DB failure (nested try/except, don't mask the DB exception).

Do not use `async with session.begin()` — conflicts with asyncpg autobegin.

### AI Processing Pipeline

Upload returns `202 Accepted` immediately. Processing runs in the ARQ worker:
1. `removing_bg` — rembg (local, u2net model) with remove.bg API as fallback
2. `tagging` — Gemini Flash multimodal (`backend/workers/ai_pipeline.py`)
3. `ready`

Each step updates `processing_status`. Errors write to `processing_error`. Frontend subscribes via Supabase Realtime. ARQ job IDs are deterministic (`process_item:{item_id}`) — safe to re-enqueue (deduplicates). Worker re-enqueues orphaned items on startup (`on_startup` in `WorkerSettings`).

Storage paths follow the pattern `{user_id}/{item_id}/{filename}` (e.g. `original.jpg`, `processed.png`, `thumbnail.jpg`). Thumbnails are 400×400 JPEG composited on white, used as Gemini input to avoid sending full-size images.

### Auth

JWT verification uses ES256 via JWKS (`JWKSClient` in `core/auth.py`). Keys are fetched at startup from Supabase's `/.well-known/jwks.json`, cached by `kid`, and auto-refreshed on unknown `kid` (handles key rotation). `JWKSClient` is stored in `app.state.jwks`.

### SQLModel Conventions

- All `Enum` columns: `SAEnum(..., name="...", create_type=False)` — types are created in migrations, not by SQLAlchemy.
- All timestamps: `DateTime(timezone=True)` with `_utcnow()` (returns `datetime.now(UTC)`). `onupdate=_utcnow` only on `updated_at`, not `deleted_at`/`archived_at`.
- Foreign keys: declared only in SQL migrations, not in `Field()` — `Field(foreign_key=...)` raises `NoReferencedTableError` at boot.
- `ARRAY`, `JSONB` columns require explicit `sa_column=Column(...)`.
- Use `str | None` not `Optional[str]`.

### External Clients

All external services have an ABC interface (`StorageClient`, `BackgroundRemovalClient`) — implementations are injected, not instantiated inside services. This keeps unit tests clean (mock the ABC, not the implementation).

### Error Handling

Services raise `AppException(code="...", status=<int>, **extra)`. A global handler in `main.py` converts these to JSON responses. Routers do not catch `AppException`.

### HTTP Conventions

- Partial updates use `PATCH`, not `PUT`.
- All endpoints declare `response_model`.
- Use status code constants: `status.HTTP_202_ACCEPTED`, `status.HTTP_204_NO_CONTENT`, etc.
- `POST /api/suggest/outfit` returns `403 CLOSET_NOT_READY` (with `items_count` and `items_required: 15`) when the closet has fewer than 15 items — gate enforced at the service layer.

### Logging & Rate Limiting

Structured logging via loguru. Log `request_id`, `user_id`, and AI call duration. Rate limiting on AI endpoints via slowapi. All I/O must be `async/await`.

When logging wear events, the service must fetch and snapshot all item data before inserting into `wear_logs`.

## Testing

- **Unit tests** (`test_service.py`): mock repo and external clients, no DB needed.
- **Integration tests** (`test_integration.py`): Testcontainers Postgres, run actual migrations (skipping `004_rls.sql` and `005_storage.sql`). Mock only external AI/storage APIs.
- Do not use SQLite for integration tests — it doesn't cover `JSONB`, arrays, UUIDs, Postgres-specific behavior.

## Environment

Required `.env` keys: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `SECRET_KEY`, `OPENWEATHERMAP_API_KEY`. Optional: `REDIS_URL` (default `redis://localhost:6379`), `REMOVEBG_API_KEY`, `GEMINI_TAGGING_MODEL`, `GEMINI_SUGGESTION_MODEL`.

AI models are configured via env vars (`GEMINI_TAGGING_MODEL`, `GEMINI_SUGGESTION_MODEL`) — never hard-coded. Gemini tagging prompts must pass taxonomy enum values explicitly; AI must not invent tags outside the defined enums. All AI prompts are defined in a `prompts.py` file inside the feature folder (e.g. `backend/items/prompts.py`), not inline in service or task code.

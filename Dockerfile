# Shared image for both Railway services (api + worker).
# The two services build from this same image and differ only in start command:
#   api    → uvicorn backend.main:app   (this file's default CMD)
#   worker → arq backend.workers.main.WorkerSettings   (override CMD in Railway dashboard)
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

# libgomp1 is required by onnxruntime (rembg background removal in the worker).
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1

# Install dependencies first (cached layer) — only re-runs when the lockfile changes.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

# Then the application code.
COPY . .
RUN uv sync --frozen --no-dev

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

# Default = API server. Railway provides $PORT; fall back to 8000 for local runs.
# --loop asyncio mirrors `make dev` (known-good with asyncpg).
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000} --loop asyncio"]

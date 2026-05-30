from urllib.parse import urlparse

from arq.connections import RedisSettings
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.config import settings
from backend.core.storage import SupabaseStorageClient
from backend.workers.bg_removal import RemoveBgApiClient, RembgClient
from backend.workers.tasks import process_item


def get_redis_settings() -> RedisSettings:
    # Parses REDIS_URL env var into ARQ RedisSettings.
    parsed = urlparse(settings.redis_url)
    return RedisSettings(
        host=parsed.hostname or "localhost",
        port=parsed.port or 6379,
        password=parsed.password,
        database=int(parsed.path.lstrip("/") or 0),
    )


async def startup(ctx: dict) -> None:
    """Init shared resources once per worker process and store in ctx."""
    import asyncio

    import rembg

    engine = create_async_engine(
        settings.database_url,
        pool_pre_ping=True,
        connect_args={"statement_cache_size": 0},
    )
    ctx["engine"] = engine
    ctx["session_factory"] = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    ctx["storage"] = SupabaseStorageClient(settings.supabase_url, settings.supabase_service_role_key)
    # Load rembg model once — expensive, avoid per-job.
    rembg_session = await asyncio.to_thread(rembg.new_session, "u2net")
    ctx["bg_client"] = RembgClient(rembg_session)
    ctx["fallback_client"] = RemoveBgApiClient(settings.removebg_api_key) if settings.removebg_api_key else None


async def shutdown(ctx: dict) -> None:
    await ctx["engine"].dispose()


class WorkerSettings:
    """ARQ worker configuration. Run with: uv run arq backend.workers.main.WorkerSettings"""

    functions = [process_item]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = get_redis_settings()
    max_jobs = 10
    job_timeout = 300
    retry_jobs = True
    job_retry_after = 5  # seconds before retry (ARQ handles exponential via job_try in function)

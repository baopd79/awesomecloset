from urllib.parse import urlparse

from arq import create_pool
from arq.connections import RedisSettings
from loguru import logger
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.config import settings
from backend.core.storage import SupabaseStorageClient
from backend.items.repository import ItemRepository
from backend.items.service import _job_id
from backend.workers.ai_pipeline import GeminiFlashClient
from backend.workers.bg_removal import RembgClient, RemoveBgApiClient
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
    ctx["storage"] = SupabaseStorageClient(
        settings.supabase_url, settings.supabase_service_role_key
    )
    # Load rembg model once — expensive, avoid per-job. Downloads ~170MB on first run.
    logger.info("rembg: loading u2net model (first run may take a few minutes)...")
    rembg_session = await asyncio.to_thread(rembg.new_session, "u2net")
    logger.info("rembg: model ready")
    ctx["bg_client"] = RembgClient(rembg_session)
    ctx["fallback_client"] = (
        RemoveBgApiClient(settings.removebg_api_key) if settings.removebg_api_key else None
    )

    ctx["gemini_client"] = GeminiFlashClient(
        api_key=settings.gemini_api_key,
        model=settings.gemini_tagging_model,
    )
    ctx["arq"] = await create_pool(get_redis_settings())
    await _recover_orphaned(ctx)


async def _recover_orphaned(ctx: dict) -> None:
    """On startup: re-enqueue items stuck in processing states for >{threshold}min.

    Uses deterministic _job_id so concurrent worker instances are safe — ARQ deduplicates
    if the same job_id is already queued or in-progress.
    """
    async with ctx["session_factory"]() as session:
        items = await ItemRepository(session).list_orphaned()

    if not items:
        return

    recovered = 0
    for item in items:
        job = await ctx["arq"].enqueue_job(
            "process_item",
            str(item.id),
            _job_id=_job_id(item.id),
        )
        if job is not None:
            recovered += 1
            logger.info(f"recovery: re-enqueued item_id={item.id} status={item.processing_status}")

    logger.info(f"recovery: {recovered}/{len(items)} orphaned items re-enqueued")


async def shutdown(ctx: dict) -> None:
    await ctx["engine"].dispose()
    await ctx["arq"].aclose()


class WorkerSettings:
    """ARQ worker configuration. Run with: uv run arq backend.workers.main.WorkerSettings"""

    functions = [process_item]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = get_redis_settings()
    # Serialize processing: each job runs u2net (rembg) inference, which is memory-heavy
    # (~hundreds of MB per image). Concurrent jobs spike RAM and get OOM-killed on small
    # hosts. One-at-a-time keeps peak memory bounded; uploads queue in Redis and drain
    # sequentially. Raise only if the worker has ample RAM or bg removal is offloaded.
    max_jobs = 1
    job_timeout = 300
    retry_jobs = True
    job_retry_after = 5  # seconds before retry (ARQ handles exponential via job_try in function)

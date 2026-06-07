from urllib.parse import urlparse

from arq import create_pool, cron
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
from backend.workers.tasks import process_item, tag_item

# Lightweight u2net variant — small resident footprint to fit the worker's memory limit.
_REMBG_MODEL = "u2netp"


def _new_rembg_session():
    """Build the rembg session with onnxruntime's CPU memory arena disabled.

    onnxruntime otherwise keeps a memory arena that grows across inferences and is never
    released, so the worker's resident memory creeps up job-after-job until it is OOM-killed
    on a small (1GB) host. Disabling the arena frees memory per run for a flat profile;
    intra_op_num_threads=1 suits a single-vCPU worker. mem_pattern is left on: u2netp runs at
    a fixed 320x320 shape, so its pattern memory is small and constant (not a source of creep)
    while still buying inference speed. rembg.new_session() builds its own SessionOptions
    internally, so we replicate its class lookup to inject ours.
    """
    import onnxruntime as ort
    from rembg.session_factory import sessions_class
    from rembg.sessions.u2net import U2netSession

    sess_opts = ort.SessionOptions()
    sess_opts.enable_cpu_mem_arena = False
    sess_opts.intra_op_num_threads = 1
    session_class = next((sc for sc in sessions_class if sc.name() == _REMBG_MODEL), U2netSession)
    return session_class(_REMBG_MODEL, sess_opts)


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
    # Load rembg model once — expensive, avoid per-job. Downloads on first run.
    # u2netp is the lightweight u2net (~5MB vs 176MB): far smaller resident memory
    # (~300-400MB vs ~960MB), which keeps the worker under a 1GB limit. Quality is
    # slightly lower but adequate for closet items on simple backgrounds.
    logger.info(f"rembg: loading {_REMBG_MODEL} model (first run may take a few minutes)...")
    rembg_session = await asyncio.to_thread(_new_rembg_session)
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
    """Re-enqueue items stuck in processing states for >{threshold}min.

    Runs once on startup AND periodically via cron — startup alone is not enough: an item
    whose job exhausted its retries falls out of the queue and would otherwise sit stuck until
    the next worker restart. The periodic sweep picks it back up. Items that keep failing reach
    `failed` (not an orphan status) and drop out of the sweep, so this does not loop forever.

    Uses deterministic _job_id so concurrent runs are safe — ARQ deduplicates if the same
    job_id is already queued or in-progress.
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

    functions = [process_item, tag_item]
    on_startup = startup
    on_shutdown = shutdown
    # Sweep for orphaned items every 5 minutes (startup already runs one sweep, so skip
    # run_at_startup). Re-enqueues items the queue dropped without needing a worker restart.
    cron_jobs = [cron(_recover_orphaned, minute=set(range(0, 60, 5)), run_at_startup=False)]
    redis_settings = get_redis_settings()
    # Serialize processing: each job runs u2net (rembg) inference, which is memory-heavy
    # (~hundreds of MB per image). Concurrent jobs spike RAM and get OOM-killed on small
    # hosts. One-at-a-time keeps peak memory bounded; uploads queue in Redis and drain
    # sequentially. Raise only if the worker has ample RAM or bg removal is offloaded.
    max_jobs = 1
    job_timeout = 300
    retry_jobs = True
    job_retry_after = 5  # seconds before retry (ARQ handles exponential via job_try in function)

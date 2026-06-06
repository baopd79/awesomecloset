import io
from uuid import UUID

from arq import Retry, func
from google.api_core.exceptions import ResourceExhausted
from loguru import logger
from PIL import Image
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.database import transaction
from backend.items.models import ProcessingStatus
from backend.items.repository import ItemRepository

BUCKET = "closet-images"
THUMBNAIL_SIZE = (400, 400)
# Gemini free tier caps requests-per-minute (~15 RPM). When draining a backlog the worker
# trips it; defer into the next minute window instead of burning the item to `failed`.
_RATE_LIMIT_DEFER_S = 60


async def _process_item(ctx: dict, item_id: str) -> None:
    """Main processing pipeline for a clothing item. ctx carries shared resources initialized in WorkerSettings.on_startup."""
    job_try = ctx.get("job_try", 1)
    logger.info(f"process_item start | job_id={ctx['job_id']} item_id={item_id} try={job_try}")

    async with ctx["session_factory"]() as session:
        await _run_pipeline(ctx, session, UUID(item_id))


async def _run_pipeline(ctx: dict, session: AsyncSession, item_id: UUID) -> None:
    repo = ItemRepository(session)
    storage = ctx["storage"]

    item = await repo.get_by_id_system(item_id)
    if item is None:
        logger.warning(f"process_item | item not found, skipping | item_id={item_id}")
        return

    # --- Step 1: background removal ---
    async with transaction(session):
        await repo.update_status(item, ProcessingStatus.removing_bg)

    try:
        original_bytes = await storage.download(BUCKET, item.original_url)

        bg_client = ctx["bg_client"]
        try:
            removed_bytes = await bg_client.remove(original_bytes)
        except Exception as primary_exc:
            logger.warning(f"rembg failed, trying fallback | {primary_exc}")
            fallback = ctx.get("fallback_client")
            if fallback is None:
                raise
            removed_bytes = await fallback.remove(original_bytes)

        processed_path = _derive_path(item.original_url, "processed.png")
        thumbnail_path = _derive_path(item.original_url, "thumbnail.jpg")

        thumbnail_bytes = _make_thumbnail(removed_bytes)

        # upsert=True: safe to retry — overwrites partial results from a previous failed attempt.
        await storage.upload(BUCKET, processed_path, removed_bytes, "image/png", upsert=True)
        await storage.upload(BUCKET, thumbnail_path, thumbnail_bytes, "image/jpeg", upsert=True)

    except Exception as exc:
        logger.error(f"process_item failed | item_id={item_id} error={exc}")
        async with transaction(session):
            await repo.update_status(item, ProcessingStatus.failed, error=str(exc))
        raise

    async with transaction(session):
        item.processed_url = processed_path
        item.thumbnail_url = thumbnail_path
        await repo.update_status(item, ProcessingStatus.tagging)

    # --- Step 2: Gemini tagging ---
    try:
        thumbnail_bytes = await storage.download(BUCKET, item.thumbnail_url)
        tags = await ctx["gemini_client"].tag_image(thumbnail_bytes)
    except ResourceExhausted as exc:
        # Rate-limited by Gemini's free-tier RPM cap. Keep the item in `tagging` and defer the
        # retry into the next minute window rather than marking it `failed`. Background removal
        # already succeeded (processed/thumbnail are uploaded with upsert), so the retry is cheap.
        logger.warning(
            f"tagging rate-limited, deferring {_RATE_LIMIT_DEFER_S}s | item_id={item_id}"
        )
        raise Retry(defer=_RATE_LIMIT_DEFER_S) from exc
    except Exception as exc:
        logger.error(f"tagging failed | item_id={item_id} error={exc}")
        async with transaction(session):
            await repo.update_status(item, ProcessingStatus.failed, error=str(exc))
        raise

    async with transaction(session):
        item.type = tags.type
        item.colors = [c.model_dump() for c in tags.colors]
        item.style = tags.style
        item.season = tags.season
        item.occasion = tags.occasion
        await repo.update_status(item, ProcessingStatus.ready)

    logger.info(f"process_item complete | item_id={item_id}")


def _derive_path(original_url: str, filename: str) -> str:
    # original_url: "{user_id}/{item_id}/original.jpg" → "{user_id}/{item_id}/filename"
    return "/".join(original_url.split("/")[:-1]) + "/" + filename


def _make_thumbnail(png_bytes: bytes) -> bytes:
    img = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    img.thumbnail(THUMBNAIL_SIZE, Image.LANCZOS)
    bg = Image.new("RGB", img.size, (255, 255, 255))
    bg.paste(img, mask=img.split()[3])
    buf = io.BytesIO()
    bg.save(buf, format="JPEG", quality=85, optimize=True)
    return buf.getvalue()


# func() wraps the coroutine so ARQ can serialize/deserialize it as a named job.
process_item = func(_process_item, name="process_item", max_tries=3)

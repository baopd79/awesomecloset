import io
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from PIL import Image

from backend.items.models import ClothingItem, ProcessingStatus
from backend.workers.bg_removal import RembgClient, RemoveBgApiClient, _prepare_for_rembg
from backend.workers.tasks import _derive_path, _make_thumbnail, _run_pipeline

# --- helpers ---


def _make_png(width: int = 100, height: int = 100) -> bytes:
    img = Image.new("RGBA", (width, height), (255, 0, 0, 128))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _make_jpeg_bytes(width: int = 100, height: int = 100) -> bytes:
    img = Image.new("RGB", (width, height), (255, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _make_item(user_id=None, item_id=None) -> ClothingItem:
    user_id = user_id or uuid.uuid4()
    item_id = item_id or uuid.uuid4()
    return ClothingItem(
        id=item_id,
        user_id=user_id,
        original_url=f"{user_id}/{item_id}/original.jpg",
        processing_status=ProcessingStatus.pending,
    )


# --- BackgroundRemovalClient ---


def test_prepare_for_rembg_downscales_large_image():
    out = _prepare_for_rembg(_make_jpeg_bytes(3000, 2000))
    img = Image.open(io.BytesIO(out))
    assert max(img.size) == 1280  # longest edge clamped, aspect ratio preserved
    assert img.format == "JPEG"


def test_prepare_for_rembg_keeps_small_image():
    out = _prepare_for_rembg(_make_jpeg_bytes(800, 600))
    img = Image.open(io.BytesIO(out))
    assert img.size == (800, 600)  # below the cap → not upscaled


@pytest.mark.asyncio
async def test_rembg_client_calls_rembg_remove():
    session = MagicMock()
    client = RembgClient(session)
    image_bytes = _make_jpeg_bytes()
    result_bytes = _make_png()

    with patch(
        "backend.workers.bg_removal.asyncio.to_thread", new=AsyncMock(return_value=result_bytes)
    ) as mock_thread:
        result = await client.remove(image_bytes)

    mock_thread.assert_awaited_once()
    assert result == result_bytes


@pytest.mark.asyncio
async def test_removebg_api_client_posts_to_api():
    api_key = "test-key"
    result_bytes = _make_png()

    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()
    mock_response.content = result_bytes

    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("backend.workers.bg_removal.httpx.AsyncClient", return_value=mock_client):
        client = RemoveBgApiClient(api_key)
        result = await client.remove(_make_jpeg_bytes())

    assert result == result_bytes
    mock_client.post.assert_awaited_once()
    call_kwargs = mock_client.post.call_args
    assert call_kwargs.args[0] == RemoveBgApiClient._API_URL


# --- _derive_path ---


def test_derive_path():
    original = "abc/def/original.jpg"
    assert _derive_path(original, "processed.png") == "abc/def/processed.png"
    assert _derive_path(original, "thumbnail.jpg") == "abc/def/thumbnail.jpg"


# --- _make_thumbnail ---


def test_make_thumbnail_returns_jpeg():
    png_bytes = _make_png(500, 500)
    thumb = _make_thumbnail(png_bytes)
    img = Image.open(io.BytesIO(thumb))
    assert img.format == "JPEG"
    assert img.width <= 400
    assert img.height <= 400


def test_make_thumbnail_composites_alpha_on_white():
    # fully transparent PNG → should become white JPEG
    img = Image.new("RGBA", (100, 100), (0, 0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    thumb = _make_thumbnail(buf.getvalue())
    result = Image.open(io.BytesIO(thumb)).convert("RGB")
    r, g, b = result.getpixel((50, 50))
    assert r == 255 and g == 255 and b == 255


# --- _run_pipeline ---


def _make_ctx(bg_client=None, fallback_client=None):
    from backend.items.models import ClothingOccasion, ClothingSeason, ClothingStyle, ClothingType
    from backend.workers.ai_pipeline import ColorEntry, TaggingResult

    storage = MagicMock()
    storage.download = AsyncMock(return_value=_make_jpeg_bytes())
    storage.upload = AsyncMock()

    mock_tags = TaggingResult(
        type=ClothingType.t_shirt,
        colors=[ColorEntry(hex="#FFFFFF", name="white")],
        style=[ClothingStyle.casual],
        season=[ClothingSeason.all_season],
        occasion=[ClothingOccasion.casual],
    )
    gemini_client = MagicMock()
    gemini_client.tag_image = AsyncMock(return_value=mock_tags)

    return {
        "job_id": "test-job",
        "bg_client": bg_client or MagicMock(remove=AsyncMock(return_value=_make_png())),
        "fallback_client": fallback_client,
        "storage": storage,
        "gemini_client": gemini_client,
    }


def _make_repo(item):
    repo = MagicMock()
    repo.get_by_id_system = AsyncMock(return_value=item)
    repo.update_status = AsyncMock()
    repo.update = AsyncMock(return_value=item)
    return repo


@pytest.mark.asyncio
async def test_run_pipeline_happy_path():
    item = _make_item()
    ctx = _make_ctx()
    session = MagicMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()

    with patch("backend.workers.tasks.ItemRepository", return_value=_make_repo(item)):
        await _run_pipeline(ctx, session, item.id)

    assert ctx["storage"].upload.await_count >= 2  # processed + thumbnail
    assert item.processed_url is not None
    assert item.thumbnail_url is not None


@pytest.mark.asyncio
async def test_run_pipeline_falls_back_on_rembg_failure():
    item = _make_item()
    fallback = MagicMock(remove=AsyncMock(return_value=_make_png()))
    primary = MagicMock(remove=AsyncMock(side_effect=RuntimeError("rembg failed")))
    ctx = _make_ctx(bg_client=primary, fallback_client=fallback)
    session = MagicMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()

    with patch("backend.workers.tasks.ItemRepository", return_value=_make_repo(item)):
        await _run_pipeline(ctx, session, item.id)

    fallback.remove.assert_awaited_once()


@pytest.mark.asyncio
async def test_run_pipeline_sets_failed_when_both_clients_fail():
    item = _make_item()
    primary = MagicMock(remove=AsyncMock(side_effect=RuntimeError("primary fail")))
    ctx = _make_ctx(bg_client=primary, fallback_client=None)
    session = MagicMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()

    repo = _make_repo(item)
    with patch("backend.workers.tasks.ItemRepository", return_value=repo):
        with pytest.raises(RuntimeError):
            await _run_pipeline(ctx, session, item.id)

    # last update_status call should set failed
    calls = repo.update_status.call_args_list
    last_status = calls[-1].args[1]
    assert last_status == ProcessingStatus.failed


@pytest.mark.asyncio
async def test_run_pipeline_defers_on_tagging_rate_limit():
    # Gemini 429 with tries remaining must defer (ARQ Retry), keep `tagging`, not `failed`.
    from arq import Retry
    from google.api_core.exceptions import ResourceExhausted

    item = _make_item()
    ctx = _make_ctx()  # no job_try → defaults to 1, below max
    ctx["gemini_client"].tag_image = AsyncMock(side_effect=ResourceExhausted("rate limited"))
    session = MagicMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()

    repo = _make_repo(item)
    with patch("backend.workers.tasks.ItemRepository", return_value=repo):
        with pytest.raises(Retry):
            await _run_pipeline(ctx, session, item.id)

    statuses = [c.args[1] for c in repo.update_status.call_args_list]
    assert ProcessingStatus.failed not in statuses
    assert statuses[-1] == ProcessingStatus.tagging


@pytest.mark.asyncio
async def test_run_pipeline_fails_when_rate_limit_exhausts_tries():
    # On the last try a persistent 429 (exhausted daily quota) must give up to `failed` —
    # not defer forever — so orphan recovery stops re-enqueueing and burning quota.
    from google.api_core.exceptions import ResourceExhausted

    from backend.workers.tasks import _MAX_TRIES

    item = _make_item()
    ctx = _make_ctx()
    ctx["job_try"] = _MAX_TRIES
    ctx["gemini_client"].tag_image = AsyncMock(side_effect=ResourceExhausted("quota exhausted"))
    session = MagicMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()

    repo = _make_repo(item)
    with patch("backend.workers.tasks.ItemRepository", return_value=repo):
        with pytest.raises(ResourceExhausted):
            await _run_pipeline(ctx, session, item.id)

    assert repo.update_status.call_args_list[-1].args[1] == ProcessingStatus.failed


@pytest.mark.asyncio
async def test_run_pipeline_skips_missing_item():
    ctx = _make_ctx()
    session = MagicMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()

    repo = MagicMock()
    repo.get_by_id_system = AsyncMock(return_value=None)

    with patch("backend.workers.tasks.ItemRepository", return_value=repo):
        await _run_pipeline(ctx, session, uuid.uuid4())

    ctx["storage"].download.assert_not_awaited()

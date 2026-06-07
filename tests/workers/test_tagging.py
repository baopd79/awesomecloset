import io
import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from PIL import Image
from pydantic import ValidationError

from backend.items.models import (
    ClothingItem,
    ClothingOccasion,
    ClothingSeason,
    ClothingStyle,
    ClothingType,
    ProcessingStatus,
    TagStatus,
)
from backend.items.prompts import TAGGING_PROMPT
from backend.workers.ai_pipeline import ColorEntry, GeminiFlashClient, TaggingResult
from backend.workers.tasks import _run_tagging

# --- helpers ---


def _valid_tags_dict() -> dict:
    return {
        "type": "t_shirt",
        "colors": [{"hex": "#FFFFFF", "name": "white"}],
        "style": ["casual"],
        "season": ["all_season"],
        "occasion": ["casual"],
    }


def _make_ready_item(*, has_type: bool = False) -> ClothingItem:
    # tag_item runs on a ready item that already has a thumbnail. has_type=True simulates a
    # re-tag of an already-tagged item.
    user_id = uuid.uuid4()
    item_id = uuid.uuid4()
    return ClothingItem(
        id=item_id,
        user_id=user_id,
        original_url=f"{user_id}/{item_id}/original.jpg",
        thumbnail_url=f"{user_id}/{item_id}/thumbnail.jpg",
        processing_status=ProcessingStatus.ready,
        tag_status=TagStatus.tagged if has_type else TagStatus.tagging,
        type=ClothingType.shirt if has_type else None,
    )


def _make_jpeg_bytes(width: int = 100, height: int = 100) -> bytes:
    img = Image.new("RGB", (width, height), (200, 150, 100))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _make_png() -> bytes:
    img = Image.new("RGBA", (100, 100), (255, 0, 0, 128))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _make_ctx(gemini_client=None):
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
    default_gemini = MagicMock()
    default_gemini.tag_image = AsyncMock(return_value=mock_tags)

    return {
        "job_id": "test-job",
        "bg_client": MagicMock(remove=AsyncMock(return_value=_make_png())),
        "fallback_client": None,
        "storage": storage,
        "gemini_client": gemini_client or default_gemini,
    }


def _make_repo(item):
    repo = MagicMock()
    repo.get_by_id_system = AsyncMock(return_value=item)
    repo.update_status = AsyncMock()
    repo.update = AsyncMock(return_value=item)

    async def _set_tag(it, ts):
        it.tag_status = ts

    repo.update_tag_status = AsyncMock(side_effect=_set_tag)
    return repo


# --- TaggingResult validation ---


def test_tagging_result_parses_valid_response():
    result = TaggingResult.model_validate_json(json.dumps(_valid_tags_dict()))
    assert result.type == ClothingType.t_shirt
    assert result.colors[0].hex == "#FFFFFF"
    assert ClothingStyle.casual in result.style
    assert ClothingSeason.all_season in result.season
    assert ClothingOccasion.casual in result.occasion


def test_tagging_result_rejects_invalid_type():
    data = {**_valid_tags_dict(), "type": "office"}  # not a valid ClothingType
    with pytest.raises(ValidationError):
        TaggingResult.model_validate_json(json.dumps(data))


def test_tagging_result_rejects_invalid_style():
    data = {**_valid_tags_dict(), "style": ["vibe"]}
    with pytest.raises(ValidationError):
        TaggingResult.model_validate_json(json.dumps(data))


def test_tagging_result_rejects_invalid_season():
    data = {**_valid_tags_dict(), "season": ["winter"]}
    with pytest.raises(ValidationError):
        TaggingResult.model_validate_json(json.dumps(data))


def test_tagging_result_rejects_invalid_occasion():
    data = {**_valid_tags_dict(), "occasion": ["gym"]}
    with pytest.raises(ValidationError):
        TaggingResult.model_validate_json(json.dumps(data))


def test_tagging_result_rejects_missing_type():
    data = _valid_tags_dict()
    del data["type"]
    with pytest.raises(ValidationError):
        TaggingResult.model_validate_json(json.dumps(data))


def test_tagging_result_rejects_missing_colors():
    data = _valid_tags_dict()
    del data["colors"]
    with pytest.raises(ValidationError):
        TaggingResult.model_validate_json(json.dumps(data))


# --- GeminiFlashClient ---


@pytest.mark.asyncio
async def test_gemini_flash_client_returns_tagging_result():
    mock_response = MagicMock()
    mock_response.text = json.dumps(_valid_tags_dict())

    with patch("backend.workers.ai_pipeline.genai") as mock_genai:
        mock_genai.GenerationConfig.return_value = MagicMock()
        mock_genai.GenerativeModel.return_value = MagicMock()

        client = GeminiFlashClient(api_key="test", model="gemini-2.0-flash")

        with patch(
            "backend.workers.ai_pipeline.asyncio.to_thread",
            new=AsyncMock(return_value=mock_response),
        ):
            result = await client.tag_image(b"fake-image-bytes")

    assert result.type == ClothingType.t_shirt
    assert result.colors[0].hex == "#FFFFFF"


@pytest.mark.asyncio
async def test_gemini_flash_client_raises_on_invalid_enum():
    mock_response = MagicMock()
    mock_response.text = json.dumps({**_valid_tags_dict(), "type": "office"})

    with patch("backend.workers.ai_pipeline.genai") as mock_genai:
        mock_genai.GenerationConfig.return_value = MagicMock()
        mock_genai.GenerativeModel.return_value = MagicMock()

        client = GeminiFlashClient(api_key="test", model="gemini-2.0-flash")

        with patch(
            "backend.workers.ai_pipeline.asyncio.to_thread",
            new=AsyncMock(return_value=mock_response),
        ):
            with pytest.raises(ValidationError):
                await client.tag_image(b"fake-image-bytes")


@pytest.mark.asyncio
async def test_gemini_flash_client_raises_on_missing_field():
    data = _valid_tags_dict()
    del data["season"]
    mock_response = MagicMock()
    mock_response.text = json.dumps(data)

    with patch("backend.workers.ai_pipeline.genai") as mock_genai:
        mock_genai.GenerationConfig.return_value = MagicMock()
        mock_genai.GenerativeModel.return_value = MagicMock()

        client = GeminiFlashClient(api_key="test", model="gemini-2.0-flash")

        with patch(
            "backend.workers.ai_pipeline.asyncio.to_thread",
            new=AsyncMock(return_value=mock_response),
        ):
            with pytest.raises(ValidationError):
                await client.tag_image(b"fake-image-bytes")


# --- Prompt coverage ---


def test_tagging_prompt_contains_all_enum_values():
    for enum_cls in [ClothingType, ClothingStyle, ClothingSeason, ClothingOccasion]:
        for member in enum_cls:
            assert (
                member.value in TAGGING_PROMPT
            ), f"{member.value!r} missing from TAGGING_PROMPT — add it or the AI will invent values"


# --- tag_item (on-demand tagging) ---


@pytest.mark.asyncio
async def test_tag_item_saves_tags_and_marks_tagged_on_success():
    item = _make_ready_item()
    ctx = _make_ctx()
    session = MagicMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()

    with patch("backend.workers.tasks.ItemRepository", return_value=_make_repo(item)):
        await _run_tagging(ctx, session, item.id)

    assert item.type == ClothingType.t_shirt
    assert item.colors == [{"hex": "#FFFFFF", "name": "white"}]
    assert item.style == [ClothingStyle.casual]
    assert item.season == [ClothingSeason.all_season]
    assert item.occasion == [ClothingOccasion.casual]
    assert item.tag_status == TagStatus.tagged


@pytest.mark.asyncio
async def test_tag_item_marks_tag_failed_when_first_tag_fails():
    item = _make_ready_item(has_type=False)  # never tagged before

    failing_gemini = MagicMock()
    failing_gemini.tag_image = AsyncMock(side_effect=ValueError("gemini error"))
    ctx = _make_ctx(gemini_client=failing_gemini)
    session = MagicMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()

    with patch("backend.workers.tasks.ItemRepository", return_value=_make_repo(item)):
        with pytest.raises(ValueError):
            await _run_tagging(ctx, session, item.id)

    assert item.tag_status == TagStatus.tag_failed


@pytest.mark.asyncio
async def test_tag_item_keeps_tagged_when_retag_fails():
    item = _make_ready_item(has_type=True)  # already tagged → re-tag

    failing_gemini = MagicMock()
    failing_gemini.tag_image = AsyncMock(side_effect=ValueError("gemini error"))
    ctx = _make_ctx(gemini_client=failing_gemini)
    session = MagicMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()

    with patch("backend.workers.tasks.ItemRepository", return_value=_make_repo(item)):
        with pytest.raises(ValueError):
            await _run_tagging(ctx, session, item.id)

    # existing tags survive a failed re-tag — the item stays usable
    assert item.tag_status == TagStatus.tagged


@pytest.mark.asyncio
async def test_tag_item_downloads_thumbnail():
    item = _make_ready_item()
    ctx = _make_ctx()
    session = MagicMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()

    with patch("backend.workers.tasks.ItemRepository", return_value=_make_repo(item)):
        await _run_tagging(ctx, session, item.id)

    download_calls = ctx["storage"].download.call_args_list
    assert len(download_calls) == 1
    _, path = download_calls[0].args
    assert "thumbnail" in path


@pytest.mark.asyncio
async def test_tag_item_skips_when_not_ready():
    item = _make_ready_item()
    item.processing_status = ProcessingStatus.removing_bg  # not ready yet
    ctx = _make_ctx()
    session = MagicMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()

    repo = _make_repo(item)
    with patch("backend.workers.tasks.ItemRepository", return_value=repo):
        await _run_tagging(ctx, session, item.id)

    ctx["gemini_client"].tag_image.assert_not_awaited()
    repo.update_tag_status.assert_not_awaited()


@pytest.mark.asyncio
async def test_tag_item_defers_on_rate_limit_with_tries_left():
    from arq import Retry
    from google.api_core.exceptions import ResourceExhausted

    item = _make_ready_item()  # tag_status=tagging
    ctx = _make_ctx()  # no job_try → defaults to 1, below max
    ctx["gemini_client"].tag_image = AsyncMock(side_effect=ResourceExhausted("rate limited"))
    session = MagicMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()

    repo = _make_repo(item)
    with patch("backend.workers.tasks.ItemRepository", return_value=repo):
        with pytest.raises(Retry):
            await _run_tagging(ctx, session, item.id)

    # defer keeps the current state — no terminal tag_status written
    repo.update_tag_status.assert_not_awaited()


@pytest.mark.asyncio
async def test_tag_item_marks_tag_failed_when_rate_limit_exhausts_tries():
    from google.api_core.exceptions import ResourceExhausted

    from backend.workers.tasks import _MAX_TRIES

    item = _make_ready_item(has_type=False)  # first tag attempt
    ctx = _make_ctx()
    ctx["job_try"] = _MAX_TRIES
    ctx["gemini_client"].tag_image = AsyncMock(side_effect=ResourceExhausted("quota exhausted"))
    session = MagicMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()

    with patch("backend.workers.tasks.ItemRepository", return_value=_make_repo(item)):
        with pytest.raises(ResourceExhausted):
            await _run_tagging(ctx, session, item.id)

    assert item.tag_status == TagStatus.tag_failed

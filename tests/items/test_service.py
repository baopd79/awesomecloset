import io
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from PIL import Image

from backend.core.exceptions import AppException
from backend.items.models import ClothingItem, ProcessingStatus
from backend.items.schemas import TagsUpdateRequest
from backend.items.service import MAX_UPLOAD_BYTES, ItemService


def _make_jpeg(width: int = 100, height: int = 100) -> bytes:
    img = Image.new("RGB", (width, height), color=(255, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _make_upload_file(content: bytes, filename: str = "test.jpg"):
    from fastapi import UploadFile

    upload = MagicMock(spec=UploadFile)
    upload.read = AsyncMock(return_value=content)
    upload.filename = filename
    return upload


def _make_session():
    session = MagicMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    return session


def _make_service(session=None, repo=None, storage=None, arq=None) -> ItemService:
    session = session or _make_session()
    repo = repo or MagicMock()
    storage = storage or MagicMock()
    arq = arq or MagicMock()
    return ItemService(session, repo, storage, arq)


# --- upload_item ---

@pytest.mark.asyncio
async def test_upload_item_creates_record_and_enqueues_job():
    user_id = uuid.uuid4()
    item_id = uuid.uuid4()
    content = _make_jpeg()
    upload = _make_upload_file(content)

    stored_item = ClothingItem(
        id=item_id,
        user_id=user_id,
        original_url=f"{user_id}/{item_id}/original.jpg",
        processing_status=ProcessingStatus.pending,
    )

    session = _make_session()
    repo = MagicMock()
    repo.create = AsyncMock(return_value=stored_item)

    storage = MagicMock()
    storage.upload = AsyncMock(return_value=f"closet-images/{user_id}/{item_id}/original.jpg")

    arq = MagicMock()
    arq.enqueue_job = AsyncMock()

    svc = ItemService(session, repo, storage, arq)
    result = await svc.upload_item(user_id, upload)

    storage.upload.assert_awaited_once()
    repo.create.assert_awaited_once()
    arq.enqueue_job.assert_awaited_once_with("process_item", str(stored_item.id), _job_id=f"process_item:{stored_item.id}")
    assert result.processing_status == ProcessingStatus.pending


@pytest.mark.asyncio
async def test_upload_item_rejects_oversized_file():
    svc = _make_service()
    content = b"x" * (MAX_UPLOAD_BYTES + 1)
    upload = _make_upload_file(content)

    with pytest.raises(AppException) as exc_info:
        await svc.upload_item(uuid.uuid4(), upload)

    assert exc_info.value.code == "FILE_TOO_LARGE"
    assert exc_info.value.status == 400


@pytest.mark.asyncio
async def test_upload_item_rejects_non_image():
    svc = _make_service()
    upload = _make_upload_file(b"not an image at all", filename="file.pdf")

    with pytest.raises(AppException) as exc_info:
        await svc.upload_item(uuid.uuid4(), upload)

    assert exc_info.value.code == "INVALID_IMAGE"
    assert exc_info.value.status == 400


# --- list_items ---

@pytest.mark.asyncio
async def test_list_items_delegates_to_repo():
    user_id = uuid.uuid4()
    expected = [ClothingItem(user_id=user_id)]

    repo = MagicMock()
    repo.list_items = AsyncMock(return_value=expected)
    svc = _make_service(repo=repo)

    result = await svc.list_items(user_id)
    repo.list_items.assert_awaited_once_with(user_id, type=None, occasion=None, season=None, is_archived=None)
    assert result == expected


# --- get_item ---

@pytest.mark.asyncio
async def test_get_item_returns_item():
    user_id = uuid.uuid4()
    item_id = uuid.uuid4()
    item = ClothingItem(id=item_id, user_id=user_id)

    repo = MagicMock()
    repo.get_by_id = AsyncMock(return_value=item)
    svc = _make_service(repo=repo)

    result = await svc.get_item(item_id, user_id)
    assert result.id == item_id


@pytest.mark.asyncio
async def test_get_item_not_found_raises_404():
    repo = MagicMock()
    repo.get_by_id = AsyncMock(return_value=None)
    svc = _make_service(repo=repo)

    with pytest.raises(AppException) as exc_info:
        await svc.get_item(uuid.uuid4(), uuid.uuid4())

    assert exc_info.value.code == "ITEM_NOT_FOUND"
    assert exc_info.value.status == 404


# --- update_tags ---

@pytest.mark.asyncio
async def test_update_tags_applies_changes():
    user_id = uuid.uuid4()
    item_id = uuid.uuid4()
    original = ClothingItem(id=item_id, user_id=user_id)
    updated = ClothingItem(id=item_id, user_id=user_id, custom_tags=["vintage"])

    repo = MagicMock()
    repo.get_by_id = AsyncMock(return_value=original)
    repo.update = AsyncMock(return_value=updated)
    svc = _make_service(repo=repo)

    body = TagsUpdateRequest(custom_tags=["vintage"])
    result = await svc.update_tags(item_id, user_id, body)

    repo.update.assert_awaited_once()
    assert result.custom_tags == ["vintage"]


# --- delete_item ---

@pytest.mark.asyncio
async def test_delete_item_calls_soft_delete():
    user_id = uuid.uuid4()
    item_id = uuid.uuid4()
    item = ClothingItem(id=item_id, user_id=user_id)

    repo = MagicMock()
    repo.get_by_id = AsyncMock(return_value=item)
    repo.soft_delete = AsyncMock()
    svc = _make_service(repo=repo)

    await svc.delete_item(item_id, user_id)
    repo.soft_delete.assert_awaited_once_with(item)


# --- retry_processing ---

@pytest.mark.asyncio
async def test_retry_processing_requeues_failed_item():
    user_id = uuid.uuid4()
    item_id = uuid.uuid4()
    item = ClothingItem(id=item_id, user_id=user_id, processing_status=ProcessingStatus.failed)

    repo = MagicMock()
    repo.get_by_id = AsyncMock(return_value=item)
    repo.update_status = AsyncMock()

    arq = MagicMock()
    arq.enqueue_job = AsyncMock()
    svc = _make_service(repo=repo, arq=arq)

    await svc.retry_processing(item_id, user_id)

    repo.update_status.assert_awaited_once_with(item, ProcessingStatus.pending, error=None)
    arq.enqueue_job.assert_awaited_once_with("process_item", str(item_id), _job_id=f"process_item:{item_id}")


@pytest.mark.asyncio
async def test_retry_processing_rejects_non_failed_item():
    user_id = uuid.uuid4()
    item_id = uuid.uuid4()
    item = ClothingItem(id=item_id, user_id=user_id, processing_status=ProcessingStatus.ready)

    repo = MagicMock()
    repo.get_by_id = AsyncMock(return_value=item)
    svc = _make_service(repo=repo)

    with pytest.raises(AppException) as exc_info:
        await svc.retry_processing(item_id, user_id)

    assert exc_info.value.code == "ITEM_NOT_FAILED"
    assert exc_info.value.status == 400


# --- TagsUpdateRequest validation ---

def test_custom_tags_valid():
    body = TagsUpdateRequest(custom_tags=["vintage", "summer"])
    assert body.custom_tags == ["vintage", "summer"]


def test_custom_tags_none_is_allowed():
    body = TagsUpdateRequest(custom_tags=None)
    assert body.custom_tags is None


def test_custom_tags_rejects_empty_string():
    with pytest.raises(Exception):
        TagsUpdateRequest(custom_tags=[""])


def test_custom_tags_rejects_whitespace_only():
    with pytest.raises(Exception):
        TagsUpdateRequest(custom_tags=["   "])


def test_custom_tags_rejects_tag_too_long():
    with pytest.raises(Exception):
        TagsUpdateRequest(custom_tags=["a" * 51])


def test_custom_tags_rejects_too_many_items():
    with pytest.raises(Exception):
        TagsUpdateRequest(custom_tags=[f"tag{i}" for i in range(21)])


def test_custom_tags_allows_max_valid():
    body = TagsUpdateRequest(custom_tags=[f"tag{i}" for i in range(20)])
    assert len(body.custom_tags) == 20

import io
import uuid
from uuid import UUID

from arq import ArqRedis
from fastapi import UploadFile
from PIL import Image
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.database import transaction
from backend.core.exceptions import AppException
from backend.core.storage import StorageClient
from backend.items.models import (
    ClothingItem,
    ClothingOccasion,
    ClothingSeason,
    ClothingType,
    ProcessingStatus,
)
from backend.items.repository import ItemRepository
from backend.items.schemas import TagsUpdateRequest

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_DIMENSION = 1920
BUCKET = "closet-images"


class ItemService:
    """Business logic for clothing items. Owns transaction boundaries; enqueues jobs after commit."""

    def __init__(self, session: AsyncSession, repo: ItemRepository, storage: StorageClient, arq: ArqRedis):
        self._session = session
        self._repo = repo
        self._storage = storage
        self._arq = arq

    async def upload_item(self, user_id: UUID, file: UploadFile) -> ClothingItem:
        content = await file.read()
        if len(content) > MAX_UPLOAD_BYTES:
            raise AppException(code="FILE_TOO_LARGE", status=400, max_mb=10)

        compressed = _compress_image(content)
        item_id = uuid.uuid4()
        storage_path = f"{user_id}/{item_id}/original.jpg"

        await self._storage.upload(BUCKET, storage_path, compressed, "image/jpeg")

        item = ClothingItem(
            id=item_id,
            user_id=user_id,
            original_url=storage_path,
            processing_status=ProcessingStatus.pending,
        )
        try:
            async with transaction(self._session):
                item = await self._repo.create(item)
        except Exception:
            try:
                await self._storage.delete(BUCKET, storage_path)
            except Exception:
                pass  # best-effort, orphan file acceptable
            raise
        try:
            await self._arq.enqueue_job("process_item", str(item.id), _job_id=_job_id(item.id))
        except Exception as exc:
            async with transaction(self._session):
                await self._repo.update_status(item, ProcessingStatus.failed, error=str(exc))
            raise

        return item

    async def list_items(
        self,
        user_id: UUID,
        type: ClothingType | None = None,
        occasion: ClothingOccasion | None = None,
        season: ClothingSeason | None = None,
        is_archived: bool | None = None,
    ) -> list[ClothingItem]:
        return await self._repo.list_items(
            user_id,
            type=type,
            occasion=occasion,
            season=season,
            is_archived=is_archived,
        )

    async def get_item(self, item_id: UUID, user_id: UUID) -> ClothingItem:
        item = await self._repo.get_by_id(item_id, user_id)
        if item is None:
            raise AppException(code="ITEM_NOT_FOUND", status=404, item_id=str(item_id))
        return item

    async def update_tags(
        self, item_id: UUID, user_id: UUID, body: TagsUpdateRequest
    ) -> ClothingItem:
        item = await self.get_item(item_id, user_id)
        updates = body.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(item, field, value)
        async with transaction(self._session):
            item = await self._repo.update(item)
        return item

    async def delete_item(self, item_id: UUID, user_id: UUID) -> None:
        item = await self.get_item(item_id, user_id)
        async with transaction(self._session):
            await self._repo.soft_delete(item)

    async def retry_processing(self, item_id: UUID, user_id: UUID) -> ClothingItem:
        item = await self.get_item(item_id, user_id)
        if item.processing_status != ProcessingStatus.failed:
            raise AppException(
                code="ITEM_NOT_FAILED",
                status=400,
                item_id=str(item_id),
                current_status=item.processing_status,
            )
        async with transaction(self._session):
            await self._repo.update_status(item, ProcessingStatus.pending, error=None)
        try:
            await self._arq.enqueue_job("process_item", str(item_id), _job_id=_job_id(item_id))
        except Exception as exc:
            async with transaction(self._session):
                await self._repo.update_status(item, ProcessingStatus.failed, error=str(exc))
            raise
        return item


def _job_id(item_id: UUID) -> str:
    # Deterministic job ID — ARQ deduplicates if same ID is already queued/in-progress.
    return f"process_item:{item_id}"


def _compress_image(content: bytes) -> bytes:
    try:
        img = Image.open(io.BytesIO(content))
    except Exception:
        raise AppException(code="INVALID_IMAGE", status=400)
    img = img.convert("RGB")
    if img.width > MAX_DIMENSION or img.height > MAX_DIMENSION:
        img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85, optimize=True)
    return buf.getvalue()

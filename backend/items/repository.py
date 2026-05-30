from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.items.models import (
    ClothingItem,
    ClothingOccasion,
    ClothingSeason,
    ClothingType,
    ProcessingStatus,
    _utcnow,
)

_ORPHAN_STATUSES = [ProcessingStatus.pending, ProcessingStatus.removing_bg, ProcessingStatus.tagging]
_ORPHAN_THRESHOLD_MINUTES = 10


class ItemRepository:
    """All DB queries for clothing_items. All user-facing methods are scoped by user_id."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def create(self, item: ClothingItem) -> ClothingItem:
        self._session.add(item)
        await self._session.flush()
        await self._session.refresh(item)
        return item

    async def list_orphaned(self) -> list[ClothingItem]:
        """Items stuck in a processing state for >{threshold}min — no active job in queue."""
        cutoff = datetime.now(UTC) - timedelta(minutes=_ORPHAN_THRESHOLD_MINUTES)
        stmt = select(ClothingItem).where(
            ClothingItem.processing_status.in_(_ORPHAN_STATUSES),
            ClothingItem.updated_at < cutoff,
            ClothingItem.deleted_at.is_(None),
        )
        result = await self._session.exec(stmt)
        return list(result.all())

    async def get_by_id_system(self, item_id: UUID) -> ClothingItem | None:
        """Fetch by item_id only, no user_id scope — for worker/background use."""
        stmt = select(ClothingItem).where(
            ClothingItem.id == item_id,
            ClothingItem.deleted_at.is_(None),
        )
        result = await self._session.exec(stmt)
        return result.first()

    async def get_by_id(self, item_id: UUID, user_id: UUID) -> ClothingItem | None:
        stmt = select(ClothingItem).where(
            ClothingItem.id == item_id,
            ClothingItem.user_id == user_id,
            ClothingItem.deleted_at.is_(None),
        )
        result = await self._session.exec(stmt)
        return result.first()

    async def list_items(
        self,
        user_id: UUID,
        type: ClothingType | None = None,
        occasion: ClothingOccasion | None = None,
        season: ClothingSeason | None = None,
        is_archived: bool | None = None,
    ) -> list[ClothingItem]:
        stmt = select(ClothingItem).where(
            ClothingItem.user_id == user_id,
            ClothingItem.deleted_at.is_(None),
        )
        if type is not None:
            stmt = stmt.where(ClothingItem.type == type)
        if occasion is not None:
            stmt = stmt.where(ClothingItem.occasion.contains([occasion]))
        if season is not None:
            stmt = stmt.where(ClothingItem.season.contains([season]))
        if is_archived is not None:
            stmt = stmt.where(ClothingItem.is_archived == is_archived)

        result = await self._session.exec(stmt.order_by(ClothingItem.created_at.desc()))
        return list(result.all())

    async def update(self, item: ClothingItem) -> ClothingItem:
        self._session.add(item)
        await self._session.flush()
        await self._session.refresh(item)
        return item

    async def soft_delete(self, item: ClothingItem) -> None:
        item.deleted_at = _utcnow()
        self._session.add(item)
        await self._session.flush()

    async def update_status(
        self, item: ClothingItem, status: ProcessingStatus, error: str | None = None
    ) -> None:
        item.processing_status = status
        item.processing_error = error
        self._session.add(item)
        await self._session.flush()

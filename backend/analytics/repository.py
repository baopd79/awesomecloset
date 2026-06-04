from datetime import date
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.items.models import ClothingItem, ProcessingStatus
from backend.outfits.models import Outfit, WearLog


class AnalyticsRepository:
    """Read-only aggregation queries over items, outfits and wear logs."""

    def __init__(self, session: AsyncSession):
        self._session = session

    def _active_ready_where(self, user_id: UUID) -> list[Any]:
        return [
            ClothingItem.user_id == user_id,
            ClothingItem.deleted_at.is_(None),
            ClothingItem.is_archived.is_(False),
            ClothingItem.processing_status == ProcessingStatus.ready,
        ]

    async def worn_items(self, user_id: UUID) -> list[tuple[Any, int]]:
        """(colors, wear_count) for active items worn at least once."""
        stmt = select(ClothingItem.colors, ClothingItem.wear_count).where(
            *self._active_ready_where(user_id),
            ClothingItem.wear_count > 0,
            ClothingItem.colors.is_not(None),
        )
        result = await self._session.exec(stmt)
        return [(row[0], row[1]) for row in result.all()]

    async def unworn_items(self, user_id: UUID) -> list[ClothingItem]:
        stmt = (
            select(ClothingItem)
            .where(*self._active_ready_where(user_id), ClothingItem.wear_count == 0)
            .order_by(ClothingItem.created_at.desc())
        )
        result = await self._session.exec(stmt)
        return [row[0] for row in result.all()]

    async def wear_history(self, user_id: UUID, since: date) -> list[Any]:
        """(worn_date, outfit_id, collage_url, occasion) since a date, newest first."""
        stmt = (
            select(
                WearLog.worn_date,
                Outfit.id,
                Outfit.collage_url,
                Outfit.occasion,
            )
            .join(Outfit, Outfit.id == WearLog.outfit_id)
            .where(WearLog.user_id == user_id, WearLog.worn_date >= since)
            .order_by(WearLog.worn_date.desc(), WearLog.created_at.desc())
        )
        result = await self._session.exec(stmt)
        return list(result.all())

    async def items_count(self, user_id: UUID) -> int:
        stmt = (
            select(func.count()).select_from(ClothingItem).where(*self._active_ready_where(user_id))
        )
        result = await self._session.exec(stmt)
        return result.one()[0]

    async def outfits_count(self, user_id: UUID) -> int:
        stmt = select(func.count()).select_from(Outfit).where(Outfit.user_id == user_id)
        result = await self._session.exec(stmt)
        return result.one()[0]

    async def worn_days_count(self, user_id: UUID) -> int:
        stmt = select(func.count(func.distinct(WearLog.worn_date))).where(
            WearLog.user_id == user_id
        )
        result = await self._session.exec(stmt)
        return result.one()[0]

from datetime import date
from uuid import UUID

from sqlalchemy import delete
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.outfits.models import Outfit, OutfitItem, SuggestionFeedback, WearLog


class OutfitRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create_outfit(self, outfit: Outfit) -> Outfit:
        self._session.add(outfit)
        await self._session.flush()
        await self._session.refresh(outfit)
        return outfit

    async def create_outfit_item(self, oi: OutfitItem) -> OutfitItem:
        self._session.add(oi)
        await self._session.flush()
        return oi

    async def get_by_id(self, outfit_id: UUID, user_id: UUID) -> Outfit | None:
        stmt = select(Outfit).where(
            Outfit.id == outfit_id,
            Outfit.user_id == user_id,
        )
        result = await self._session.exec(stmt)
        return result.first()

    async def list_outfits(self, user_id: UUID, saved: bool | None = None) -> list[Outfit]:
        stmt = select(Outfit).where(Outfit.user_id == user_id)
        if saved is not None:
            stmt = stmt.where(Outfit.is_saved == saved)
        stmt = stmt.order_by(Outfit.created_at.desc())
        result = await self._session.exec(stmt)
        return list(result.all())

    async def update_outfit(self, outfit: Outfit) -> Outfit:
        self._session.add(outfit)
        await self._session.flush()
        await self._session.refresh(outfit)
        return outfit

    async def list_outfit_items(self, outfit_id: UUID) -> list[OutfitItem]:
        stmt = (
            select(OutfitItem)
            .where(OutfitItem.outfit_id == outfit_id)
            .order_by(OutfitItem.position)
        )
        result = await self._session.exec(stmt)
        return list(result.all())

    async def replace_outfit_items(self, outfit_id: UUID, new_items: list[OutfitItem]) -> None:
        await self._session.exec(delete(OutfitItem).where(OutfitItem.outfit_id == outfit_id))
        for oi in new_items:
            self._session.add(oi)
        await self._session.flush()

    async def create_wear_log(self, wear_log: WearLog) -> WearLog:
        self._session.add(wear_log)
        await self._session.flush()
        await self._session.refresh(wear_log)
        return wear_log

    async def create_feedback(self, feedback: SuggestionFeedback) -> SuggestionFeedback:
        self._session.add(feedback)
        await self._session.flush()
        await self._session.refresh(feedback)
        return feedback

    async def list_recent_wear_logs(self, user_id: UUID, since: date) -> list[WearLog]:
        stmt = select(WearLog).where(
            WearLog.user_id == user_id,
            WearLog.worn_date >= since,
        )
        result = await self._session.exec(stmt)
        return list(result.all())

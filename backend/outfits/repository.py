from uuid import UUID

from sqlalchemy import delete
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.outfits.models import Outfit, OutfitItem


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

    async def list_outfits(self, user_id: UUID) -> list[Outfit]:
        stmt = select(Outfit).where(Outfit.user_id == user_id).order_by(Outfit.created_at.desc())
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

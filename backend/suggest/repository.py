from datetime import date
from uuid import UUID

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.suggest.models import DailySuggestionCache


class SuggestRepository:
    """DB queries for daily_suggestion_cache. Scoped by user_id."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_cache(
        self, user_id: UUID, suggestion_date: date, context_hash: str
    ) -> DailySuggestionCache | None:
        stmt = select(DailySuggestionCache).where(
            DailySuggestionCache.user_id == user_id,
            DailySuggestionCache.suggestion_date == suggestion_date,
            DailySuggestionCache.context_hash == context_hash,
        )
        result = await self._session.exec(stmt)
        return result.first()

    async def save_cache(self, cache: DailySuggestionCache) -> DailySuggestionCache:
        self._session.add(cache)
        await self._session.flush()
        await self._session.refresh(cache)
        return cache

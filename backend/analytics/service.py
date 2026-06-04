from datetime import UTC, datetime, timedelta
from uuid import UUID

from backend.analytics.repository import AnalyticsRepository
from backend.analytics.schemas import (
    ColorsResponse,
    ColorStat,
    HistoryEntry,
    HistoryResponse,
    SummaryResponse,
    UnwornItem,
    UnwornResponse,
)
from backend.core.storage import StorageClient

BUCKET = "closet-images"
HISTORY_DAYS = 30
TOP_COLORS = 5


class AnalyticsService:
    def __init__(self, repo: AnalyticsRepository, storage: StorageClient):
        self._repo = repo
        self._storage = storage

    async def colors(self, user_id: UUID) -> ColorsResponse:
        rows = await self._repo.worn_items(user_id)

        totals: dict[str, int] = {}
        display: dict[str, str] = {}
        hex_weight: dict[str, tuple[str, int]] = {}  # name -> (hex, max wear_count seen)

        for colors, wear_count in rows:
            for color in colors or []:
                name = color.get("name") if isinstance(color, dict) else None
                if not name:
                    continue
                key = name.lower()
                totals[key] = totals.get(key, 0) + wear_count
                # Representative hex = the one from the most-worn item bearing this color.
                if key not in hex_weight or wear_count > hex_weight[key][1]:
                    hex_weight[key] = (color.get("hex") or "#000000", wear_count)
                    display[key] = name

        ranked = sorted(totals.items(), key=lambda kv: kv[1], reverse=True)[:TOP_COLORS]
        stats = [
            ColorStat(name=display[key], hex=hex_weight[key][0], count=count)
            for key, count in ranked
        ]
        return ColorsResponse(colors=stats)

    async def unworn(self, user_id: UUID) -> UnwornResponse:
        items = await self._repo.unworn_items(user_id)
        paths = [it.thumbnail_url for it in items if it.thumbnail_url]
        signed = await self._storage.get_signed_urls_batch(BUCKET, paths) if paths else {}
        return UnwornResponse(
            items=[
                UnwornItem(
                    id=it.id,
                    type=it.type,
                    thumbnail_url=signed.get(it.thumbnail_url) if it.thumbnail_url else None,
                )
                for it in items
            ]
        )

    async def history(self, user_id: UUID) -> HistoryResponse:
        since = (datetime.now(UTC) - timedelta(days=HISTORY_DAYS)).date()
        rows = await self._repo.wear_history(user_id, since)

        # Rows are newest-first; keep one outfit per day (the most recent wear).
        seen: set = set()
        kept: list = []
        for worn_date, outfit_id, collage_url, occasion in rows:
            if worn_date in seen:
                continue
            seen.add(worn_date)
            kept.append((worn_date, outfit_id, collage_url, occasion))

        paths = [collage for _, _, collage, _ in kept if collage]
        signed = await self._storage.get_signed_urls_batch(BUCKET, paths) if paths else {}

        return HistoryResponse(
            days=[
                HistoryEntry(
                    date=worn_date,
                    outfit_id=outfit_id,
                    collage_url=signed.get(collage) if collage else None,
                    occasion=occasion,
                )
                for worn_date, outfit_id, collage, occasion in kept
            ]
        )

    async def summary(self, user_id: UUID) -> SummaryResponse:
        return SummaryResponse(
            items_count=await self._repo.items_count(user_id),
            outfits_count=await self._repo.outfits_count(user_id),
            worn_days=await self._repo.worn_days_count(user_id),
        )

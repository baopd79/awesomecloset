import asyncio
import hashlib
import json
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from loguru import logger
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.database import transaction
from backend.core.exceptions import AppException
from backend.items.models import ClothingItem, ClothingType
from backend.items.repository import ItemRepository
from backend.outfits.models import OutfitItemRole
from backend.outfits.schemas import OutfitItemIn, OutfitResponse
from backend.outfits.service import OutfitService
from backend.suggest.ai import SuggestionClient
from backend.suggest.models import DailySuggestionCache
from backend.suggest.prompts import build_suggestion_prompt
from backend.suggest.repository import SuggestRepository
from backend.suggest.schemas import SuggestRequest, SuggestResponse, WeatherResponse
from backend.suggest.weather import WeatherClient, manual_weather

ITEMS_REQUIRED = 15
# gemini-2.5-flash runs internal "thinking" before responding, so a single
# 2-3 outfit generation lands around ~20s. Keep headroom above that boundary.
SUGGEST_TIMEOUT_S = 40.0

# Derive an outfit role from the garment type so the model only has to pick item ids.
_TYPE_TO_ROLE: dict[ClothingType, OutfitItemRole] = {
    ClothingType.t_shirt: OutfitItemRole.top,
    ClothingType.shirt: OutfitItemRole.top,
    ClothingType.dress: OutfitItemRole.top,
    ClothingType.hoodie: OutfitItemRole.top,
    ClothingType.sweater: OutfitItemRole.top,
    ClothingType.pants: OutfitItemRole.bottom,
    ClothingType.jeans: OutfitItemRole.bottom,
    ClothingType.shorts: OutfitItemRole.bottom,
    ClothingType.skirt: OutfitItemRole.bottom,
    ClothingType.jacket: OutfitItemRole.outerwear,
    ClothingType.coat: OutfitItemRole.outerwear,
    ClothingType.shoes: OutfitItemRole.shoes,
    ClothingType.sneakers: OutfitItemRole.shoes,
    ClothingType.boots: OutfitItemRole.shoes,
    ClothingType.bag: OutfitItemRole.bag,
    ClothingType.accessory: OutfitItemRole.accessory,
}


class SuggestService:
    def __init__(
        self,
        session: AsyncSession,
        suggest_repo: SuggestRepository,
        item_repo: ItemRepository,
        outfit_service: OutfitService,
        suggestion_client: SuggestionClient,
        weather_client: WeatherClient,
    ):
        self._session = session
        self._suggest_repo = suggest_repo
        self._item_repo = item_repo
        self._outfit_service = outfit_service
        self._client = suggestion_client
        self._weather = weather_client

    async def suggest_outfit(self, user_id: UUID, data: SuggestRequest) -> SuggestResponse:
        # 1. Gate — need enough tagged items before suggestions unlock (suggestions need tags).
        count = await self._item_repo.count_active_tagged(user_id)
        if count < ITEMS_REQUIRED:
            raise AppException(
                code="CLOSET_NOT_READY",
                status=403,
                items_count=count,
                items_required=ITEMS_REQUIRED,
            )

        # 2. Resolve weather (manual override > coordinates > none).
        weather = await self._resolve_weather(data)
        weather_dict = weather.model_dump() if weather else None

        # 3. Build closet context + cache key.
        closet = await self._item_repo.list_active_tagged(user_id)
        occasion_val = data.occasion.value if data.occasion else None
        weather_cond = weather.condition if weather else None
        context_hash = _context_hash([i.id for i in closet], weather_cond, occasion_val)
        today = datetime.now(UTC).date()

        # 4. Cache lookup — identical context same day returns without calling Gemini.
        cached = await self._suggest_repo.get_cache(user_id, today, context_hash)
        if cached:
            outfits = await self._load_cached_outfits(cached, user_id)
            if outfits is not None:
                return SuggestResponse(outfits=outfits, cached=True)

        # 5. Gemini suggestion.
        recent = await self._outfit_service.recent_worn_item_ids(user_id)
        prompt = build_suggestion_prompt(
            closet=_closet_summary(closet),
            weather=weather_dict,
            occasion=occasion_val,
            recent_item_ids=recent,
        )
        result = await self._call_gemini(prompt)

        # 6. Validate ids against the closet, then create real outfits (sequential — shared
        #    AsyncSession is not concurrency-safe, so collages are generated one at a time).
        closet_by_id = {item.id: item for item in closet}
        responses: list[OutfitResponse] = []
        for sug in result.outfits:
            valid_ids = [iid for iid in sug.item_ids if iid in closet_by_id]
            if not valid_ids:
                logger.warning("suggestion_outfit_no_valid_items user_id={}", user_id)
                continue
            items_in = [
                OutfitItemIn(item_id=iid, role=_role_for(closet_by_id[iid]), position=pos)
                for pos, iid in enumerate(valid_ids)
            ]
            resp = await self._outfit_service.create_ai_outfit(
                user_id, items_in, sug.reasoning, data.occasion, weather_dict
            )
            responses.append(resp)

        if not responses:
            raise AppException(code="SUGGESTION_FAILED", status=502)

        # 7. Cache the generated outfit ids.
        cache = DailySuggestionCache(
            user_id=user_id,
            suggestion_date=today,
            context_hash=context_hash,
            outfit_ids=[r.id for r in responses],
        )
        async with transaction(self._session):
            await self._suggest_repo.save_cache(cache)

        return SuggestResponse(outfits=responses, cached=False)

    # --- private helpers ---

    async def _resolve_weather(self, data: SuggestRequest) -> WeatherResponse | None:
        if data.manual_condition is not None:
            return manual_weather(data.manual_condition)
        if data.lat is not None and data.lng is not None:
            # Best-effort: a slow/unavailable weather API must not fail or stall the
            # whole suggestion — fall back to no weather context.
            try:
                return await self._weather.get_current(data.lat, data.lng)
            except Exception as exc:
                logger.warning(
                    "weather_resolve_failed lat={} lng={} error={}", data.lat, data.lng, exc
                )
                return None
        return None

    async def _call_gemini(self, prompt: str):
        try:
            return await asyncio.wait_for(self._client.suggest(prompt), timeout=SUGGEST_TIMEOUT_S)
        except TimeoutError:
            raise AppException(code="SUGGESTION_TIMEOUT", status=504)
        except AppException:
            raise
        except Exception as exc:
            logger.error("suggestion_failed error={}", exc)
            raise AppException(code="SUGGESTION_FAILED", status=502)

    async def _load_cached_outfits(
        self, cached: DailySuggestionCache, user_id: UUID
    ) -> list[OutfitResponse] | None:
        """Re-hydrate cached outfits with signed URLs. Returns None (→ regenerate) if any
        cached outfit was since deleted."""
        outfits: list[OutfitResponse] = []
        for outfit_id in cached.outfit_ids:
            try:
                outfits.append(await self._outfit_service.get_outfit(outfit_id, user_id))
            except AppException:
                return None
        return outfits


def _role_for(item: ClothingItem) -> OutfitItemRole:
    if item.type is None:
        return OutfitItemRole.accessory
    return _TYPE_TO_ROLE.get(item.type, OutfitItemRole.accessory)


def _closet_summary(closet: list[ClothingItem]) -> list[dict[str, Any]]:
    summary = []
    for item in closet:
        summary.append(
            {
                "id": str(item.id),
                "type": item.type.value if item.type else None,
                "colors": [
                    c["name"] for c in (item.colors or []) if isinstance(c, dict) and "name" in c
                ],
                "style": [s.value for s in (item.style or [])],
                "season": [s.value for s in (item.season or [])],
                "occasion": [o.value for o in (item.occasion or [])],
            }
        )
    return summary


def _context_hash(item_ids: list[UUID], weather_condition: str | None, occasion: str | None) -> str:
    payload = json.dumps(
        {
            "items": sorted(str(i) for i in item_ids),
            "weather": weather_condition,
            "occasion": occasion,
        },
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode()).hexdigest()

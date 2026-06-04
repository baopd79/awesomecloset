from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from backend.core.config import settings
from backend.core.dependencies import CurrentUserDep, SessionDep
from backend.core.exceptions import AppException
from backend.core.ratelimit import limiter
from backend.core.storage import SupabaseStorageClient
from backend.items.repository import ItemRepository
from backend.outfits.repository import OutfitRepository
from backend.outfits.service import OutfitService
from backend.suggest.ai import GeminiSuggestionClient
from backend.suggest.repository import SuggestRepository
from backend.suggest.schemas import (
    ManualCondition,
    SuggestRequest,
    SuggestResponse,
    WeatherResponse,
)
from backend.suggest.service import SuggestService
from backend.suggest.weather import OpenWeatherMapClient, WeatherClient, manual_weather

router = APIRouter(prefix="/api/suggest", tags=["suggest"])


def _make_weather_client() -> WeatherClient:
    return OpenWeatherMapClient(settings.openweathermap_api_key)


WeatherClientDep = Annotated[WeatherClient, Depends(_make_weather_client)]

_Lat = Annotated[float | None, Query(ge=-90, le=90)]
_Lng = Annotated[float | None, Query(ge=-180, le=180)]


@router.get("/weather", response_model=WeatherResponse)
async def get_weather(
    _: CurrentUserDep,
    client: WeatherClientDep,
    lat: _Lat = None,
    lng: _Lng = None,
    manual_condition: Annotated[ManualCondition | None, Query()] = None,
) -> WeatherResponse:
    if manual_condition is not None:
        return manual_weather(manual_condition)
    if lat is None or lng is None:
        raise AppException(code="LOCATION_REQUIRED", status=400)
    return await client.get_current(lat, lng)


def _make_suggest_service(session: SessionDep) -> SuggestService:
    storage = SupabaseStorageClient(settings.supabase_url, settings.supabase_service_role_key)
    outfit_service = OutfitService(
        session, OutfitRepository(session), ItemRepository(session), storage
    )
    return SuggestService(
        session=session,
        suggest_repo=SuggestRepository(session),
        item_repo=ItemRepository(session),
        outfit_service=outfit_service,
        suggestion_client=GeminiSuggestionClient(
            settings.gemini_api_key, settings.gemini_suggestion_model
        ),
        weather_client=OpenWeatherMapClient(settings.openweathermap_api_key),
    )


SuggestServiceDep = Annotated[SuggestService, Depends(_make_suggest_service)]


@router.post("/outfit", response_model=SuggestResponse)
@limiter.limit("10/day")
async def suggest_outfit(
    request: Request,
    user_id: CurrentUserDep,
    svc: SuggestServiceDep,
    body: SuggestRequest,
) -> SuggestResponse:
    return await svc.suggest_outfit(UUID(user_id), body)

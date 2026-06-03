from typing import Annotated

from fastapi import APIRouter, Depends, Query

from backend.core.config import settings
from backend.core.dependencies import CurrentUserDep
from backend.suggest.schemas import ManualCondition, WeatherResponse
from backend.suggest.weather import OpenWeatherMapClient, WeatherClient, manual_weather

router = APIRouter(prefix="/api/suggest", tags=["suggest"])


def _make_weather_client() -> WeatherClient:
    return OpenWeatherMapClient(settings.openweathermap_api_key)


WeatherClientDep = Annotated[WeatherClient, Depends(_make_weather_client)]


@router.get("/weather", response_model=WeatherResponse)
async def get_weather(
    _: CurrentUserDep,
    client: WeatherClientDep,
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    manual_condition: ManualCondition | None = Query(None),
) -> WeatherResponse:
    if manual_condition is not None:
        return manual_weather(manual_condition)
    if lat is None or lng is None:
        from backend.core.exceptions import AppException

        raise AppException(code="LOCATION_REQUIRED", status=400)
    return await client.get_current(lat, lng)

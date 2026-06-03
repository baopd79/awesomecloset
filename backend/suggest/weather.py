from abc import ABC, abstractmethod

import httpx

from backend.core.exceptions import AppException
from backend.suggest.schemas import ManualCondition, WeatherResponse

# Maps ManualCondition → synthetic WeatherResponse (no API call needed)
_MANUAL_WEATHER: dict[ManualCondition, WeatherResponse] = {
    ManualCondition.hot: WeatherResponse(
        temp_c=36.0, condition="Nắng nóng", city="Thủ công", icon="01d"
    ),
    ManualCondition.warm: WeatherResponse(
        temp_c=28.0, condition="Trời ấm", city="Thủ công", icon="02d"
    ),
    ManualCondition.cool: WeatherResponse(
        temp_c=20.0, condition="Mát mẻ", city="Thủ công", icon="03d"
    ),
    ManualCondition.cold: WeatherResponse(
        temp_c=12.0, condition="Trời lạnh", city="Thủ công", icon="13d"
    ),
    ManualCondition.rainy: WeatherResponse(
        temp_c=24.0, condition="Có mưa", city="Thủ công", icon="10d"
    ),
}

OWM_URL = "https://api.openweathermap.org/data/2.5/weather"


class WeatherClient(ABC):
    @abstractmethod
    async def get_current(self, lat: float, lng: float) -> WeatherResponse: ...


class OpenWeatherMapClient(WeatherClient):
    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    async def get_current(self, lat: float, lng: float) -> WeatherResponse:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                OWM_URL,
                params={
                    "lat": lat,
                    "lon": lng,  # OWM uses "lon" as query param name
                    "appid": self._api_key,
                    "units": "metric",
                    "lang": "vi",
                },
            )
        if resp.status_code != 200:
            raise AppException(code="WEATHER_UNAVAILABLE", status=502)
        try:
            data = resp.json()
            return WeatherResponse(
                temp_c=round(data["main"]["temp"], 1),
                condition=data["weather"][0]["description"],
                city=data["name"],
                icon=data["weather"][0]["icon"],
            )
        except (KeyError, IndexError, ValueError):
            raise AppException(code="WEATHER_UNAVAILABLE", status=502)


def manual_weather(condition: ManualCondition) -> WeatherResponse:
    return _MANUAL_WEATHER[condition]

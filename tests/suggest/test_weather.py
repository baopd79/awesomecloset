from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.suggest.schemas import ManualCondition, WeatherResponse
from backend.suggest.weather import OpenWeatherMapClient, manual_weather

# --- Unit: WeatherClient ---


@pytest.mark.asyncio
async def test_owm_client_parses_response():
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "main": {"temp": 24.3},
        "weather": [{"description": "mây rải rác", "icon": "03d"}],
        "name": "Ho Chi Minh City",
    }

    with patch("backend.suggest.weather.httpx.AsyncClient") as mock_cls:
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=mock_ctx)
        mock_ctx.__aexit__ = AsyncMock(return_value=False)
        mock_ctx.get = AsyncMock(return_value=mock_resp)
        mock_cls.return_value = mock_ctx

        client = OpenWeatherMapClient(api_key="test-key")
        result = await client.get_current(lat=10.76, lon=106.66)

    assert result.temp_c == 24.3
    assert result.city == "Ho Chi Minh City"
    assert result.icon == "03d"


@pytest.mark.asyncio
async def test_owm_client_raises_on_api_error():
    from backend.core.exceptions import AppException

    mock_resp = MagicMock()
    mock_resp.status_code = 401

    with patch("backend.suggest.weather.httpx.AsyncClient") as mock_cls:
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=mock_ctx)
        mock_ctx.__aexit__ = AsyncMock(return_value=False)
        mock_ctx.get = AsyncMock(return_value=mock_resp)
        mock_cls.return_value = mock_ctx

        client = OpenWeatherMapClient(api_key="bad-key")
        with pytest.raises(AppException) as exc_info:
            await client.get_current(lat=10.76, lon=106.66)

    assert exc_info.value.code == "WEATHER_UNAVAILABLE"
    assert exc_info.value.status == 502


def test_manual_weather_all_conditions():
    for condition in ManualCondition:
        result = manual_weather(condition)
        assert isinstance(result, WeatherResponse)
        assert result.temp_c > 0
        assert result.icon


# --- Integration: HTTP endpoint ---


def _auth_header():
    """Override get_current_user_id for endpoint tests."""
    return {"Authorization": "Bearer test"}


@pytest.fixture()
def client_with_mock_weather():
    mock_weather_client = AsyncMock(spec=OpenWeatherMapClient)
    mock_weather_client.get_current = AsyncMock(
        return_value=WeatherResponse(temp_c=28.0, condition="Nắng", city="Hà Nội", icon="01d")
    )

    from backend.core.dependencies import get_current_user_id
    from backend.suggest.router import _make_weather_client

    app.dependency_overrides[_make_weather_client] = lambda: mock_weather_client
    app.dependency_overrides[get_current_user_id] = lambda: "user-123"
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_get_weather_with_coords(client_with_mock_weather):
    resp = client_with_mock_weather.get("/api/suggest/weather?lat=21.02&lng=105.83")
    assert resp.status_code == 200
    data = resp.json()
    assert data["temp_c"] == 28.0
    assert data["city"] == "Hà Nội"


def test_get_weather_manual_condition(client_with_mock_weather):
    resp = client_with_mock_weather.get("/api/suggest/weather?manual_condition=rainy")
    assert resp.status_code == 200
    data = resp.json()
    assert data["condition"] == "Có mưa"
    assert data["icon"] == "10d"


def test_get_weather_missing_location(client_with_mock_weather):
    resp = client_with_mock_weather.get("/api/suggest/weather")
    assert resp.status_code == 400
    assert resp.json()["code"] == "LOCATION_REQUIRED"


def test_get_weather_partial_coords(client_with_mock_weather):
    resp = client_with_mock_weather.get("/api/suggest/weather?lat=10.76")
    assert resp.status_code == 400
    assert resp.json()["code"] == "LOCATION_REQUIRED"

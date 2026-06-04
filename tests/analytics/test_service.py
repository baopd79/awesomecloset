"""Unit tests for AnalyticsService — repo and storage mocked."""

import uuid
from datetime import date
from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.analytics.service import AnalyticsService
from backend.items.models import ClothingItem, ClothingType

USER_ID = uuid.uuid4()


def _make_service() -> tuple[AnalyticsService, MagicMock, MagicMock]:
    repo = AsyncMock()
    storage = AsyncMock()
    storage.get_signed_urls_batch = AsyncMock(return_value={})
    return AnalyticsService(repo, storage), repo, storage


@pytest.mark.asyncio
async def test_colors_aggregates_weighted_by_wear_count_and_ranks():
    svc, repo, _ = _make_service()
    repo.worn_items = AsyncMock(
        return_value=[
            ([{"name": "Red", "hex": "#FF0000"}], 3),
            ([{"name": "red", "hex": "#EE0000"}, {"name": "White", "hex": "#FFFFFF"}], 1),
            ([{"name": "White", "hex": "#FAFAFA"}], 2),
        ]
    )

    res = await svc.colors(USER_ID)

    assert [c.name for c in res.colors] == ["Red", "White"]
    red = res.colors[0]
    assert red.count == 4  # 3 + 1
    # Representative hex comes from the most-worn item bearing the color.
    assert red.hex == "#FF0000"
    assert res.colors[1].count == 3  # 1 + 2


@pytest.mark.asyncio
async def test_colors_top_five_only():
    svc, repo, _ = _make_service()
    repo.worn_items = AsyncMock(
        return_value=[([{"name": f"c{i}", "hex": "#000000"}], i) for i in range(1, 8)]
    )

    res = await svc.colors(USER_ID)

    assert len(res.colors) == 5
    assert res.colors[0].name == "c7"  # highest wear_count first


@pytest.mark.asyncio
async def test_colors_skips_entries_without_name():
    svc, repo, _ = _make_service()
    repo.worn_items = AsyncMock(
        return_value=[([{"hex": "#123456"}, {"name": "Blue", "hex": "#00F"}], 5)]
    )

    res = await svc.colors(USER_ID)

    assert [c.name for c in res.colors] == ["Blue"]


@pytest.mark.asyncio
async def test_unworn_signs_thumbnails():
    svc, repo, storage = _make_service()
    item = MagicMock(spec=ClothingItem)
    item.id = uuid.uuid4()
    item.type = ClothingType.t_shirt
    item.thumbnail_url = f"{USER_ID}/{item.id}/thumbnail.jpg"
    repo.unworn_items = AsyncMock(return_value=[item])
    storage.get_signed_urls_batch = AsyncMock(
        return_value={item.thumbnail_url: "https://signed/thumb"}
    )

    res = await svc.unworn(USER_ID)

    assert len(res.items) == 1
    assert res.items[0].thumbnail_url == "https://signed/thumb"
    assert res.items[0].type == ClothingType.t_shirt


@pytest.mark.asyncio
async def test_history_dedups_to_one_outfit_per_day():
    svc, repo, storage = _make_service()
    oid1, oid2 = uuid.uuid4(), uuid.uuid4()
    day = date(2026, 6, 1)
    # newest-first: same day twice → keep the first (most recent)
    repo.wear_history = AsyncMock(
        return_value=[
            (day, oid1, "path/collage1.jpg", None),
            (day, oid2, "path/collage2.jpg", None),
            (date(2026, 5, 30), oid2, None, None),
        ]
    )
    storage.get_signed_urls_batch = AsyncMock(
        return_value={"path/collage1.jpg": "https://signed/1"}
    )

    res = await svc.history(USER_ID)

    assert len(res.days) == 2
    assert res.days[0].outfit_id == oid1
    assert res.days[0].collage_url == "https://signed/1"
    assert res.days[1].collage_url is None


@pytest.mark.asyncio
async def test_summary_passes_through_counts():
    svc, repo, _ = _make_service()
    repo.items_count = AsyncMock(return_value=48)
    repo.outfits_count = AsyncMock(return_value=128)
    repo.worn_days_count = AsyncMock(return_value=12)

    res = await svc.summary(USER_ID)

    assert (res.items_count, res.outfits_count, res.worn_days) == (48, 128, 12)

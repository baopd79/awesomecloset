"""Integration tests for analytics — real Postgres via Testcontainers, storage mocked."""

import uuid
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from sqlalchemy import text

from backend.analytics.repository import AnalyticsRepository
from backend.analytics.service import AnalyticsService
from backend.core.database import transaction
from backend.items.models import ClothingItem, ProcessingStatus
from backend.items.repository import ItemRepository
from backend.outfits.models import OutfitItemRole
from backend.outfits.repository import OutfitRepository
from backend.outfits.schemas import CreateOutfitIn, OutfitItemIn, WearOutfitIn
from backend.outfits.service import OutfitService


@pytest_asyncio.fixture
async def user_id(db_session) -> uuid.UUID:
    uid = uuid.uuid4()
    await db_session.execute(
        text("INSERT INTO auth.users (id, email) VALUES (:id, :email)"),
        {"id": str(uid), "email": f"test-{uid}@example.com"},
    )
    await db_session.execute(
        text("INSERT INTO users (id, email) VALUES (:id, :email) ON CONFLICT (id) DO NOTHING"),
        {"id": str(uid), "email": f"test-{uid}@example.com"},
    )
    await db_session.commit()
    return uid


async def _create_item(session, uid, colors=None) -> ClothingItem:
    item = ClothingItem(
        user_id=uid,
        processing_status=ProcessingStatus.ready,
        thumbnail_url=f"{uid}/{uuid.uuid4()}/thumbnail.jpg",
        processed_url=f"{uid}/{uuid.uuid4()}/processed.png",
        colors=colors,
    )
    async with transaction(session):
        item = await ItemRepository(session).create(item)
    return item


def _outfit_service(session) -> OutfitService:
    storage = AsyncMock()
    storage.get_signed_urls_batch = AsyncMock(return_value={})
    storage.upload = AsyncMock(return_value="closet-images/collage")
    return OutfitService(
        session=session,
        repo=OutfitRepository(session),
        item_repo=ItemRepository(session),
        storage=storage,
    )


def _analytics_service(session) -> AnalyticsService:
    storage = AsyncMock()
    storage.get_signed_urls_batch = AsyncMock(return_value={})
    return AnalyticsService(AnalyticsRepository(session), storage)


@pytest.mark.asyncio
async def test_red_shirt_worn_three_times_tops_color_stats(db_session, user_id):
    red = await _create_item(db_session, user_id, colors=[{"hex": "#FF0000", "name": "Red"}])
    blue = await _create_item(db_session, user_id, colors=[{"hex": "#0000FF", "name": "Blue"}])

    outfits = _outfit_service(db_session)
    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        red_fit = await outfits.create_outfit(
            user_id, CreateOutfitIn(items=[OutfitItemIn(item_id=red.id, role=OutfitItemRole.top)])
        )
        blue_fit = await outfits.create_outfit(
            user_id, CreateOutfitIn(items=[OutfitItemIn(item_id=blue.id, role=OutfitItemRole.top)])
        )

    for _ in range(3):
        await outfits.log_wear(red_fit.id, user_id, WearOutfitIn())
    await outfits.log_wear(blue_fit.id, user_id, WearOutfitIn())

    res = await _analytics_service(db_session).colors(user_id)

    assert res.colors[0].name == "Red"
    assert res.colors[0].count == 3
    assert res.colors[0].hex == "#FF0000"


@pytest.mark.asyncio
async def test_unworn_excludes_worn_and_signs(db_session, user_id):
    worn = await _create_item(db_session, user_id, colors=[{"hex": "#000", "name": "Black"}])
    unworn = await _create_item(db_session, user_id)

    outfits = _outfit_service(db_session)
    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        fit = await outfits.create_outfit(
            user_id, CreateOutfitIn(items=[OutfitItemIn(item_id=worn.id, role=OutfitItemRole.top)])
        )
    await outfits.log_wear(fit.id, user_id, WearOutfitIn())

    res = await _analytics_service(db_session).unworn(user_id)

    ids = {it.id for it in res.items}
    assert unworn.id in ids
    assert worn.id not in ids


@pytest.mark.asyncio
async def test_history_returns_worn_outfits_with_occasion(db_session, user_id):
    item = await _create_item(db_session, user_id)
    outfits = _outfit_service(db_session)
    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        fit = await outfits.create_outfit(
            user_id, CreateOutfitIn(items=[OutfitItemIn(item_id=item.id, role=OutfitItemRole.top)])
        )
    await outfits.log_wear(fit.id, user_id, WearOutfitIn())

    res = await _analytics_service(db_session).history(user_id)

    assert len(res.days) == 1
    assert res.days[0].outfit_id == fit.id


@pytest.mark.asyncio
async def test_summary_counts(db_session, user_id):
    item = await _create_item(db_session, user_id)
    outfits = _outfit_service(db_session)
    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        fit = await outfits.create_outfit(
            user_id, CreateOutfitIn(items=[OutfitItemIn(item_id=item.id, role=OutfitItemRole.top)])
        )
    await outfits.log_wear(fit.id, user_id, WearOutfitIn())

    res = await _analytics_service(db_session).summary(user_id)

    assert res.items_count == 1
    assert res.outfits_count == 1
    assert res.worn_days == 1

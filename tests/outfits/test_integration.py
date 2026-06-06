"""Integration tests for outfits — real Postgres via Testcontainers, no mocked DB."""

import uuid
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlmodel import select

from backend.core.database import transaction
from backend.core.exceptions import AppException
from backend.items.models import ClothingItem, ProcessingStatus
from backend.items.repository import ItemRepository
from backend.main import app
from backend.outfits.models import (
    FeedbackAction,
    OutfitItemRole,
    SuggestionFeedback,
    WearLog,
)
from backend.outfits.repository import OutfitRepository
from backend.outfits.schemas import (
    CreateOutfitIn,
    FeedbackIn,
    OutfitItemIn,
    PatchOutfitItemsIn,
    WearOutfitIn,
)
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


@pytest_asyncio.fixture
async def other_user_id(db_session) -> uuid.UUID:
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


async def _create_ready_item(session, uid: uuid.UUID) -> ClothingItem:
    item = ClothingItem(
        user_id=uid,
        processing_status=ProcessingStatus.ready,
        thumbnail_url=f"{uid}/{uuid.uuid4()}/thumbnail.jpg",
        processed_url=f"{uid}/{uuid.uuid4()}/processed.png",
    )
    async with transaction(session):
        item = await ItemRepository(session).create(item)
    return item


def _make_service(session) -> OutfitService:
    mock_storage = AsyncMock()
    mock_storage.get_signed_urls_batch = AsyncMock(return_value={})
    mock_storage.upload = AsyncMock(return_value="closet-images/collage")
    return OutfitService(
        session=session,
        repo=OutfitRepository(session),
        item_repo=ItemRepository(session),
        storage=mock_storage,
    )


@pytest.mark.asyncio
async def test_create_and_get_outfit(db_session, user_id):
    item = await _create_ready_item(db_session, user_id)
    svc = _make_service(db_session)

    data = CreateOutfitIn(
        name="Beach look",
        items=[OutfitItemIn(item_id=item.id, role=OutfitItemRole.top, position=0)],
    )
    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        created = await svc.create_outfit(user_id, data)

    assert created.name == "Beach look"
    assert created.id is not None
    assert len(created.items) == 1
    assert created.items[0].item_id == item.id

    fetched = await svc.get_outfit(created.id, user_id)
    assert fetched.id == created.id
    assert fetched.items[0].role == OutfitItemRole.top


@pytest.mark.asyncio
async def test_outfit_not_found_for_other_user(db_session, user_id, other_user_id):
    item = await _create_ready_item(db_session, user_id)
    svc = _make_service(db_session)

    data = CreateOutfitIn(items=[OutfitItemIn(item_id=item.id, role=OutfitItemRole.top)])
    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        created = await svc.create_outfit(user_id, data)

    with pytest.raises(AppException) as exc:
        await svc.get_outfit(created.id, other_user_id)

    assert exc.value.code == "OUTFIT_NOT_FOUND"


@pytest.mark.asyncio
async def test_list_outfits_scoped_to_user(db_session, user_id, other_user_id):
    item_a = await _create_ready_item(db_session, user_id)
    item_b = await _create_ready_item(db_session, other_user_id)
    svc = _make_service(db_session)

    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        await svc.create_outfit(
            user_id,
            CreateOutfitIn(items=[OutfitItemIn(item_id=item_a.id, role=OutfitItemRole.top)]),
        )
        await svc.create_outfit(
            other_user_id,
            CreateOutfitIn(items=[OutfitItemIn(item_id=item_b.id, role=OutfitItemRole.top)]),
        )

    results_a = await svc.list_outfits(user_id)
    results_b = await svc.list_outfits(other_user_id)

    assert len(results_a) == 1
    assert len(results_b) == 1
    assert results_a[0].user_id == user_id
    assert results_b[0].user_id == other_user_id


@pytest.mark.asyncio
async def test_item_not_ready_blocked(db_session, user_id):
    item = ClothingItem(user_id=user_id, processing_status=ProcessingStatus.tagging)
    async with transaction(db_session):
        item = await ItemRepository(db_session).create(item)

    svc = _make_service(db_session)
    data = CreateOutfitIn(items=[OutfitItemIn(item_id=item.id, role=OutfitItemRole.top)])
    with pytest.raises(AppException) as exc:
        await svc.create_outfit(user_id, data)

    assert exc.value.code == "ITEM_NOT_READY"


@pytest.mark.asyncio
async def test_patch_outfit_items_replaces_items(db_session, user_id):
    item1 = await _create_ready_item(db_session, user_id)
    item2 = await _create_ready_item(db_session, user_id)
    svc = _make_service(db_session)

    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        created = await svc.create_outfit(
            user_id, CreateOutfitIn(items=[OutfitItemIn(item_id=item1.id, role=OutfitItemRole.top)])
        )
        updated = await svc.update_outfit_items(
            created.id,
            user_id,
            PatchOutfitItemsIn(
                items=[OutfitItemIn(item_id=item2.id, role=OutfitItemRole.bottom, position=0)]
            ),
        )

    assert len(updated.items) == 1
    assert updated.items[0].item_id == item2.id
    assert updated.items[0].role == OutfitItemRole.bottom


@pytest.mark.asyncio
async def test_soft_delete_item_in_outfit_allowed(db_session, user_id):
    """Soft-deleting an item in an outfit is allowed (sets deleted_at, doesn't remove FK row)."""
    item = await _create_ready_item(db_session, user_id)
    svc = _make_service(db_session)

    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        await svc.create_outfit(
            user_id, CreateOutfitIn(items=[OutfitItemIn(item_id=item.id, role=OutfitItemRole.top)])
        )

    async with transaction(db_session):
        await ItemRepository(db_session).soft_delete(item)
    # No exception — soft delete does not violate ON DELETE RESTRICT


@pytest.mark.asyncio
async def test_wear_outfit_bumps_wear_count_each_time(db_session, user_id):
    item = await _create_ready_item(db_session, user_id)
    svc = _make_service(db_session)
    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        created = await svc.create_outfit(
            user_id, CreateOutfitIn(items=[OutfitItemIn(item_id=item.id, role=OutfitItemRole.top)])
        )

    for _ in range(3):
        await svc.log_wear(created.id, user_id, WearOutfitIn())

    refreshed = await ItemRepository(db_session).get_by_id(item.id, user_id)
    assert refreshed.wear_count == 3
    assert refreshed.last_worn_at is not None


@pytest.mark.asyncio
async def test_wear_snapshot_immutable_after_outfit_edit(db_session, user_id):
    item1 = await _create_ready_item(db_session, user_id)
    item2 = await _create_ready_item(db_session, user_id)
    svc = _make_service(db_session)

    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        created = await svc.create_outfit(
            user_id,
            CreateOutfitIn(items=[OutfitItemIn(item_id=item1.id, role=OutfitItemRole.top)]),
        )
        wear = await svc.log_wear(created.id, user_id, WearOutfitIn(rating=5))
        # Swap the outfit's items AFTER logging the wear
        await svc.update_outfit_items(
            created.id,
            user_id,
            PatchOutfitItemsIn(items=[OutfitItemIn(item_id=item2.id, role=OutfitItemRole.bottom)]),
        )

    result = await db_session.exec(select(WearLog).where(WearLog.id == wear.id))
    stored = result.first()
    assert len(stored.items_snapshot) == 1
    # Snapshot still references the originally-worn item, not the edited-in one
    assert stored.items_snapshot[0]["item_id"] == str(item1.id)
    assert stored.rating == 5


@pytest.mark.asyncio
async def test_feedback_persisted(db_session, user_id):
    item = await _create_ready_item(db_session, user_id)
    svc = _make_service(db_session)
    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        created = await svc.create_outfit(
            user_id, CreateOutfitIn(items=[OutfitItemIn(item_id=item.id, role=OutfitItemRole.top)])
        )

    fb = await svc.submit_feedback(
        created.id, user_id, FeedbackIn(action=FeedbackAction.saved, rating=5)
    )

    result = await db_session.exec(select(SuggestionFeedback).where(SuggestionFeedback.id == fb.id))
    stored = result.first()
    assert stored is not None
    assert stored.action == FeedbackAction.saved
    assert stored.rating == 5


@pytest.mark.asyncio
async def test_wear_outfit_not_found_for_other_user(db_session, user_id, other_user_id):
    item = await _create_ready_item(db_session, user_id)
    svc = _make_service(db_session)
    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        created = await svc.create_outfit(
            user_id, CreateOutfitIn(items=[OutfitItemIn(item_id=item.id, role=OutfitItemRole.top)])
        )

    with pytest.raises(AppException) as exc:
        await svc.log_wear(created.id, other_user_id, WearOutfitIn())

    assert exc.value.code == "OUTFIT_NOT_FOUND"


@pytest.mark.asyncio
async def test_manual_outfit_saved_on_creation(db_session, user_id):
    """Builder outfits land in the saved collection immediately."""
    item = await _create_ready_item(db_session, user_id)
    svc = _make_service(db_session)
    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        created = await svc.create_outfit(
            user_id, CreateOutfitIn(items=[OutfitItemIn(item_id=item.id, role=OutfitItemRole.top)])
        )
    assert created.is_saved is True


@pytest.mark.asyncio
async def test_ai_outfit_not_saved_by_default(db_session, user_id):
    item = await _create_ready_item(db_session, user_id)
    svc = _make_service(db_session)
    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        created = await svc.create_ai_outfit(
            user_id,
            items_in=[OutfitItemIn(item_id=item.id, role=OutfitItemRole.top)],
            reasoning="warm + casual",
            occasion=None,
            weather_context=None,
        )
    assert created.is_saved is False


@pytest.mark.asyncio
async def test_save_unsave_is_idempotent(db_session, user_id):
    item = await _create_ready_item(db_session, user_id)
    svc = _make_service(db_session)
    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        created = await svc.create_ai_outfit(
            user_id,
            items_in=[OutfitItemIn(item_id=item.id, role=OutfitItemRole.top)],
            reasoning="r",
            occasion=None,
            weather_context=None,
        )

    # Save twice → still saved (absolute set, not toggle)
    await svc.save_outfit(created.id, user_id)
    saved = await svc.save_outfit(created.id, user_id)
    assert saved.is_saved is True

    # Unsave twice → still unsaved
    await svc.unsave_outfit(created.id, user_id)
    unsaved = await svc.unsave_outfit(created.id, user_id)
    assert unsaved.is_saved is False


@pytest.mark.asyncio
async def test_list_outfits_saved_filter(db_session, user_id):
    item = await _create_ready_item(db_session, user_id)
    svc = _make_service(db_session)
    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        manual = await svc.create_outfit(
            user_id, CreateOutfitIn(items=[OutfitItemIn(item_id=item.id, role=OutfitItemRole.top)])
        )
        await svc.create_ai_outfit(
            user_id,
            items_in=[OutfitItemIn(item_id=item.id, role=OutfitItemRole.top)],
            reasoning="r",
            occasion=None,
            weather_context=None,
        )

    saved_only = await svc.list_outfits(user_id, saved=True)
    all_outfits = await svc.list_outfits(user_id)

    assert {o.id for o in saved_only} == {manual.id}
    assert len(all_outfits) == 2


@pytest.mark.asyncio
async def test_save_outfit_not_found_for_other_user(db_session, user_id, other_user_id):
    item = await _create_ready_item(db_session, user_id)
    svc = _make_service(db_session)
    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        created = await svc.create_outfit(
            user_id, CreateOutfitIn(items=[OutfitItemIn(item_id=item.id, role=OutfitItemRole.top)])
        )

    with pytest.raises(AppException) as exc:
        await svc.save_outfit(created.id, other_user_id)
    assert exc.value.code == "OUTFIT_NOT_FOUND"


# --- HTTP endpoint tests (DB-independent only) ---


@pytest.fixture()
def http_client():
    fixed_uid = str(uuid.uuid4())
    from backend.core.dependencies import get_current_user_id

    app.dependency_overrides[get_current_user_id] = lambda: fixed_uid
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_create_outfit_endpoint_validates_empty_items(http_client):
    resp = http_client.post("/api/outfits", json={"items": []})
    assert resp.status_code == 422


def test_wear_endpoint_validates_rating_range(http_client):
    resp = http_client.post(f"/api/outfits/{uuid.uuid4()}/wear", json={"rating": 6})
    assert resp.status_code == 422


def test_feedback_endpoint_validates_action_enum(http_client):
    resp = http_client.post(
        f"/api/outfits/{uuid.uuid4()}/feedback", json={"action": "not_a_real_action"}
    )
    assert resp.status_code == 422

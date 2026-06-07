"""Integration tests for suggest — real Postgres via Testcontainers, mocked Gemini + storage."""

import uuid
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlmodel import select

from backend.core.database import transaction
from backend.core.exceptions import AppException
from backend.items.models import ClothingItem, ClothingType, ProcessingStatus, TagStatus
from backend.items.repository import ItemRepository
from backend.outfits.repository import OutfitRepository
from backend.outfits.service import OutfitService
from backend.suggest.ai import SuggestedOutfit, SuggestionResult
from backend.suggest.models import DailySuggestionCache
from backend.suggest.repository import SuggestRepository
from backend.suggest.schemas import SuggestRequest
from backend.suggest.service import SuggestService


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


async def _seed_ready_items(session, uid: uuid.UUID, n: int) -> list[ClothingItem]:
    items = []
    async with transaction(session):
        repo = ItemRepository(session)
        for _ in range(n):
            item = ClothingItem(
                user_id=uid,
                processing_status=ProcessingStatus.ready,
                tag_status=TagStatus.tagged,
                type=ClothingType.t_shirt,
                thumbnail_url=f"{uid}/{uuid.uuid4()}/thumbnail.jpg",
                processed_url=f"{uid}/{uuid.uuid4()}/processed.png",
            )
            items.append(await repo.create(item))
    return items


def _gemini_returning(*item_id_groups: list[uuid.UUID]) -> AsyncMock:
    client = AsyncMock()
    client.suggest = AsyncMock(
        return_value=SuggestionResult(
            outfits=[
                SuggestedOutfit(item_ids=list(ids), reasoning=f"outfit {i}")
                for i, ids in enumerate(item_id_groups)
            ]
        )
    )
    return client


def _make_service(session, gemini: AsyncMock) -> SuggestService:
    storage = AsyncMock()
    storage.get_signed_urls_batch = AsyncMock(return_value={})
    storage.upload = AsyncMock(return_value="closet-images/x")
    outfit_service = OutfitService(
        session, OutfitRepository(session), ItemRepository(session), storage
    )
    return SuggestService(
        session=session,
        suggest_repo=SuggestRepository(session),
        item_repo=ItemRepository(session),
        outfit_service=outfit_service,
        suggestion_client=gemini,
        weather_client=AsyncMock(),
    )


@pytest.mark.asyncio
async def test_gate_blocks_under_15(db_session, user_id):
    await _seed_ready_items(db_session, user_id, 14)
    svc = _make_service(db_session, AsyncMock())

    with pytest.raises(AppException) as exc:
        await svc.suggest_outfit(user_id, SuggestRequest())

    assert exc.value.code == "CLOSET_NOT_READY"
    assert exc.value.extra["items_count"] == 14
    assert exc.value.extra["items_required"] == 15


@pytest.mark.asyncio
async def test_suggest_creates_outfits_and_caches(db_session, user_id):
    items = await _seed_ready_items(db_session, user_id, 15)
    gemini = _gemini_returning([items[0].id, items[1].id, items[2].id])
    svc = _make_service(db_session, gemini)

    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        result = await svc.suggest_outfit(user_id, SuggestRequest(manual_condition="cool"))

    assert result.cached is False
    assert len(result.outfits) == 1
    assert result.outfits[0].ai_generated is True
    assert result.outfits[0].ai_reasoning == "outfit 0"

    res = await db_session.exec(
        select(DailySuggestionCache).where(DailySuggestionCache.user_id == user_id)
    )
    caches = list(res.all())
    assert len(caches) == 1
    assert caches[0].outfit_ids == [result.outfits[0].id]


@pytest.mark.asyncio
async def test_second_identical_call_hits_cache(db_session, user_id):
    items = await _seed_ready_items(db_session, user_id, 15)
    gemini = _gemini_returning([items[0].id, items[1].id])
    svc = _make_service(db_session, gemini)

    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        r1 = await svc.suggest_outfit(user_id, SuggestRequest(manual_condition="cool"))
        r2 = await svc.suggest_outfit(user_id, SuggestRequest(manual_condition="cool"))

    assert r1.cached is False
    assert r2.cached is True
    assert gemini.suggest.await_count == 1  # second call served from cache
    assert {o.id for o in r2.outfits} == {o.id for o in r1.outfits}


@pytest.mark.asyncio
async def test_different_occasion_regenerates(db_session, user_id):
    items = await _seed_ready_items(db_session, user_id, 15)
    gemini = _gemini_returning([items[0].id, items[1].id])
    svc = _make_service(db_session, gemini)

    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        r1 = await svc.suggest_outfit(
            user_id, SuggestRequest(manual_condition="cool", occasion="work")
        )
        r2 = await svc.suggest_outfit(
            user_id, SuggestRequest(manual_condition="cool", occasion="party")
        )

    assert r1.cached is False
    assert r2.cached is False
    assert gemini.suggest.await_count == 2  # different context → cache miss

    res = await db_session.exec(
        select(DailySuggestionCache).where(DailySuggestionCache.user_id == user_id)
    )
    assert len(list(res.all())) == 2

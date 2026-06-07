"""Unit tests for SuggestService — all external dependencies mocked."""

import uuid
from datetime import UTC, date, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.core.exceptions import AppException
from backend.items.models import (
    ClothingItem,
    ClothingOccasion,
    ClothingSeason,
    ClothingStyle,
    ClothingType,
)
from backend.outfits.models import OutfitItemRole
from backend.outfits.schemas import OutfitResponse
from backend.suggest.ai import SuggestedOutfit, SuggestionResult
from backend.suggest.models import DailySuggestionCache
from backend.suggest.schemas import SuggestRequest
from backend.suggest.service import SuggestService, _context_hash, _role_for

USER_ID = uuid.uuid4()


def _closet_item(item_id: uuid.UUID | None = None, type_=ClothingType.t_shirt) -> MagicMock:
    m = MagicMock(spec=ClothingItem)
    m.id = item_id or uuid.uuid4()
    m.type = type_
    m.colors = [{"hex": "#FFFFFF", "name": "white"}]
    m.style = [ClothingStyle.casual]
    m.season = [ClothingSeason.all_season]
    m.occasion = [ClothingOccasion.casual]
    return m


def _fake_outfit_response(outfit_id: uuid.UUID | None = None) -> OutfitResponse:
    return OutfitResponse(
        id=outfit_id or uuid.uuid4(),
        user_id=USER_ID,
        name=None,
        collage_url=None,
        occasion=None,
        ai_generated=True,
        ai_reasoning="r",
        is_saved=False,
        items=[],
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


def _make_service():
    session = AsyncMock()
    suggest_repo = AsyncMock()
    item_repo = AsyncMock()
    outfit_service = AsyncMock()
    client = AsyncMock()
    weather = AsyncMock()

    # sensible defaults
    outfit_service.recent_worn_item_ids = AsyncMock(return_value=[])
    outfit_service.create_ai_outfit = AsyncMock(side_effect=lambda *a, **k: _fake_outfit_response())
    suggest_repo.get_cache = AsyncMock(return_value=None)
    suggest_repo.save_cache = AsyncMock()

    svc = SuggestService(session, suggest_repo, item_repo, outfit_service, client, weather)
    return svc, suggest_repo, item_repo, outfit_service, client, weather


@pytest.mark.asyncio
async def test_gate_blocks_under_15_items():
    svc, _, item_repo, _, client, _ = _make_service()
    item_repo.count_active_tagged = AsyncMock(return_value=14)

    with pytest.raises(AppException) as exc:
        await svc.suggest_outfit(USER_ID, SuggestRequest())

    assert exc.value.code == "CLOSET_NOT_READY"
    assert exc.value.status == 403
    assert exc.value.extra["items_count"] == 14
    assert exc.value.extra["items_required"] == 15
    client.suggest.assert_not_called()


@pytest.mark.asyncio
async def test_cache_miss_calls_gemini_and_creates_outfits():
    closet = [_closet_item() for _ in range(15)]
    svc, suggest_repo, item_repo, outfit_service, client, _ = _make_service()
    item_repo.count_active_tagged = AsyncMock(return_value=15)
    item_repo.list_active_tagged = AsyncMock(return_value=closet)
    client.suggest = AsyncMock(
        return_value=SuggestionResult(
            outfits=[
                SuggestedOutfit(item_ids=[closet[0].id, closet[1].id], reasoning="ok1"),
                SuggestedOutfit(item_ids=[closet[2].id, closet[3].id], reasoning="ok2"),
            ]
        )
    )

    result = await svc.suggest_outfit(USER_ID, SuggestRequest(manual_condition="cool"))

    assert result.cached is False
    assert len(result.outfits) == 2
    assert outfit_service.create_ai_outfit.await_count == 2
    suggest_repo.save_cache.assert_awaited_once()
    client.suggest.assert_awaited_once()


@pytest.mark.asyncio
async def test_cache_hit_skips_gemini():
    closet = [_closet_item() for _ in range(15)]
    svc, suggest_repo, item_repo, outfit_service, client, _ = _make_service()
    item_repo.count_active_tagged = AsyncMock(return_value=15)
    item_repo.list_active_tagged = AsyncMock(return_value=closet)

    cached_ids = [uuid.uuid4(), uuid.uuid4()]
    suggest_repo.get_cache = AsyncMock(
        return_value=DailySuggestionCache(
            user_id=USER_ID,
            suggestion_date=date.today(),
            context_hash="h",
            outfit_ids=cached_ids,
        )
    )
    outfit_service.get_outfit = AsyncMock(side_effect=lambda oid, uid: _fake_outfit_response(oid))

    result = await svc.suggest_outfit(USER_ID, SuggestRequest())

    assert result.cached is True
    assert len(result.outfits) == 2
    client.suggest.assert_not_called()
    outfit_service.create_ai_outfit.assert_not_called()


@pytest.mark.asyncio
async def test_cache_hit_with_deleted_outfit_regenerates():
    closet = [_closet_item() for _ in range(15)]
    svc, suggest_repo, item_repo, outfit_service, client, _ = _make_service()
    item_repo.count_active_tagged = AsyncMock(return_value=15)
    item_repo.list_active_tagged = AsyncMock(return_value=closet)
    suggest_repo.get_cache = AsyncMock(
        return_value=DailySuggestionCache(
            user_id=USER_ID,
            suggestion_date=date.today(),
            context_hash="h",
            outfit_ids=[uuid.uuid4()],
        )
    )
    # cached outfit was deleted → get_outfit raises → fall through to regeneration
    outfit_service.get_outfit = AsyncMock(
        side_effect=AppException(code="OUTFIT_NOT_FOUND", status=404)
    )
    client.suggest = AsyncMock(
        return_value=SuggestionResult(
            outfits=[SuggestedOutfit(item_ids=[closet[0].id], reasoning="ok")]
        )
    )

    result = await svc.suggest_outfit(USER_ID, SuggestRequest())

    assert result.cached is False
    client.suggest.assert_awaited_once()


@pytest.mark.asyncio
async def test_invalid_item_ids_dropped_then_all_empty_fails():
    closet = [_closet_item() for _ in range(15)]
    svc, _, item_repo, outfit_service, client, _ = _make_service()
    item_repo.count_active_tagged = AsyncMock(return_value=15)
    item_repo.list_active_tagged = AsyncMock(return_value=closet)
    # Gemini hallucinates ids not in the closet → outfit dropped → no outfits → 502
    client.suggest = AsyncMock(
        return_value=SuggestionResult(
            outfits=[SuggestedOutfit(item_ids=[uuid.uuid4()], reasoning="bad")]
        )
    )

    with pytest.raises(AppException) as exc:
        await svc.suggest_outfit(USER_ID, SuggestRequest())

    assert exc.value.code == "SUGGESTION_FAILED"
    outfit_service.create_ai_outfit.assert_not_called()


@pytest.mark.asyncio
async def test_partial_invalid_ids_kept():
    closet = [_closet_item() for _ in range(15)]
    svc, _, item_repo, outfit_service, client, _ = _make_service()
    item_repo.count_active_tagged = AsyncMock(return_value=15)
    item_repo.list_active_tagged = AsyncMock(return_value=closet)
    # one real id + one hallucinated → outfit kept with the valid id only
    client.suggest = AsyncMock(
        return_value=SuggestionResult(
            outfits=[SuggestedOutfit(item_ids=[closet[0].id, uuid.uuid4()], reasoning="ok")]
        )
    )

    result = await svc.suggest_outfit(USER_ID, SuggestRequest())

    assert len(result.outfits) == 1
    items_in = outfit_service.create_ai_outfit.call_args.args[1]
    assert len(items_in) == 1
    assert items_in[0].item_id == closet[0].id


def test_context_hash_changes_with_occasion():
    ids = [uuid.uuid4(), uuid.uuid4()]
    h_work = _context_hash(ids, "sunny", "work")
    h_party = _context_hash(ids, "sunny", "party")
    h_same = _context_hash(list(reversed(ids)), "sunny", "work")
    assert h_work != h_party
    assert h_work == h_same  # order-independent


def test_role_derived_from_type():
    assert _role_for(_closet_item(type_=ClothingType.jeans)) == OutfitItemRole.bottom
    assert _role_for(_closet_item(type_=ClothingType.jacket)) == OutfitItemRole.outerwear
    assert _role_for(_closet_item(type_=ClothingType.sneakers)) == OutfitItemRole.shoes
    none_item = _closet_item()
    none_item.type = None
    assert _role_for(none_item) == OutfitItemRole.accessory

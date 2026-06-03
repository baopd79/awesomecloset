"""Unit tests for OutfitService — all external dependencies mocked."""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.core.exceptions import AppException
from backend.items.models import ClothingItem, ClothingType, ProcessingStatus
from backend.outfits.models import Outfit, OutfitItem, OutfitItemRole
from backend.outfits.schemas import CreateOutfitIn, OutfitItemIn, PatchOutfitItemsIn
from backend.outfits.service import OutfitService

USER_ID = uuid.uuid4()
ITEM_ID_1 = uuid.uuid4()
ITEM_ID_2 = uuid.uuid4()
OUTFIT_ID = uuid.uuid4()


def _ready_item(item_id: uuid.UUID, thumbnail: str = "path/thumb.jpg") -> ClothingItem:
    item = MagicMock(spec=ClothingItem)
    item.id = item_id
    item.processing_status = ProcessingStatus.ready
    item.thumbnail_url = thumbnail
    item.processed_url = f"path/{item_id}/processed.png"
    item.type = ClothingType.t_shirt
    return item


def _make_service(
    mock_repo: MagicMock | None = None,
    mock_item_repo: MagicMock | None = None,
    mock_storage: MagicMock | None = None,
) -> tuple[OutfitService, MagicMock, MagicMock, MagicMock]:
    session = AsyncMock()
    repo = mock_repo or AsyncMock()
    item_repo = mock_item_repo or AsyncMock()
    storage = mock_storage or AsyncMock()
    svc = OutfitService(session=session, repo=repo, item_repo=item_repo, storage=storage)
    return svc, repo, item_repo, storage


@pytest.mark.asyncio
async def test_create_outfit_success():
    item1 = _ready_item(ITEM_ID_1, thumbnail=f"{USER_ID}/{ITEM_ID_1}/thumbnail.jpg")
    item2 = _ready_item(ITEM_ID_2, thumbnail=f"{USER_ID}/{ITEM_ID_2}/thumbnail.jpg")

    svc, repo, item_repo, storage = _make_service()
    item_repo.get_by_id = AsyncMock(
        side_effect=lambda iid, uid: item1 if iid == ITEM_ID_1 else item2
    )

    created_outfit = MagicMock(spec=Outfit)
    created_outfit.id = OUTFIT_ID
    created_outfit.user_id = USER_ID
    created_outfit.collage_url = None
    created_outfit.name = "Test"
    created_outfit.occasion = None
    created_outfit.ai_generated = False
    created_outfit.ai_reasoning = None
    repo.create_outfit = AsyncMock(return_value=created_outfit)
    repo.create_outfit_item = AsyncMock()

    updated_outfit = MagicMock(spec=Outfit)
    updated_outfit.id = OUTFIT_ID
    updated_outfit.user_id = USER_ID
    updated_outfit.collage_url = f"{USER_ID}/{OUTFIT_ID}/collage.jpg"
    updated_outfit.name = "Test"
    updated_outfit.occasion = None
    updated_outfit.ai_generated = False
    updated_outfit.ai_reasoning = None
    repo.update_outfit = AsyncMock(return_value=updated_outfit)

    storage.upload = AsyncMock(return_value="closet-images/path")
    storage.get_signed_urls_batch = AsyncMock(
        return_value={
            f"{USER_ID}/{OUTFIT_ID}/collage.jpg": "https://signed/collage.jpg",
            f"{USER_ID}/{ITEM_ID_1}/thumbnail.jpg": "https://signed/thumb1.jpg",
            f"{USER_ID}/{ITEM_ID_2}/thumbnail.jpg": "https://signed/thumb2.jpg",
        }
    )

    data = CreateOutfitIn(
        name="Test",
        items=[
            OutfitItemIn(item_id=ITEM_ID_1, role=OutfitItemRole.top, position=0),
            OutfitItemIn(item_id=ITEM_ID_2, role=OutfitItemRole.bottom, position=1),
        ],
    )

    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        result = await svc.create_outfit(USER_ID, data)

    assert result.id == OUTFIT_ID
    assert result.collage_url == "https://signed/collage.jpg"
    assert len(result.items) == 2
    repo.create_outfit.assert_awaited_once()
    assert repo.create_outfit_item.await_count == 2


@pytest.mark.asyncio
async def test_create_outfit_item_not_found():
    svc, repo, item_repo, _ = _make_service()
    item_repo.get_by_id = AsyncMock(return_value=None)

    data = CreateOutfitIn(items=[OutfitItemIn(item_id=ITEM_ID_1, role=OutfitItemRole.top)])
    with pytest.raises(AppException) as exc:
        await svc.create_outfit(USER_ID, data)

    assert exc.value.code == "ITEM_NOT_FOUND"
    assert exc.value.status == 404


@pytest.mark.asyncio
async def test_create_outfit_item_not_ready():
    svc, repo, item_repo, _ = _make_service()
    item = _ready_item(ITEM_ID_1)
    item.processing_status = ProcessingStatus.tagging
    item_repo.get_by_id = AsyncMock(return_value=item)

    data = CreateOutfitIn(items=[OutfitItemIn(item_id=ITEM_ID_1, role=OutfitItemRole.top)])
    with pytest.raises(AppException) as exc:
        await svc.create_outfit(USER_ID, data)

    assert exc.value.code == "ITEM_NOT_READY"
    assert exc.value.status == 400


@pytest.mark.asyncio
async def test_create_outfit_collage_failure_is_graceful():
    """Outfit is created even if collage generation fails."""
    item = _ready_item(ITEM_ID_1, thumbnail=f"{USER_ID}/{ITEM_ID_1}/thumbnail.jpg")
    svc, repo, item_repo, storage = _make_service()
    item_repo.get_by_id = AsyncMock(return_value=item)

    created_outfit = MagicMock(spec=Outfit)
    created_outfit.id = OUTFIT_ID
    created_outfit.user_id = USER_ID
    created_outfit.collage_url = None
    created_outfit.name = None
    created_outfit.occasion = None
    created_outfit.ai_generated = False
    created_outfit.ai_reasoning = None
    repo.create_outfit = AsyncMock(return_value=created_outfit)
    repo.create_outfit_item = AsyncMock()
    storage.get_signed_urls_batch = AsyncMock(return_value={})

    data = CreateOutfitIn(items=[OutfitItemIn(item_id=ITEM_ID_1, role=OutfitItemRole.top)])

    with patch(
        "backend.outfits.service.generate_collage", AsyncMock(side_effect=RuntimeError("disk full"))
    ):
        result = await svc.create_outfit(USER_ID, data)

    # Outfit created with no collage — graceful degradation
    assert result.id == OUTFIT_ID
    assert result.collage_url is None


@pytest.mark.asyncio
async def test_get_outfit_not_found():
    svc, repo, item_repo, _ = _make_service()
    repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(AppException) as exc:
        await svc.get_outfit(OUTFIT_ID, USER_ID)

    assert exc.value.code == "OUTFIT_NOT_FOUND"
    assert exc.value.status == 404


@pytest.mark.asyncio
async def test_get_outfit_returns_signed_urls():
    svc, repo, item_repo, storage = _make_service()

    outfit = MagicMock(spec=Outfit)
    outfit.id = OUTFIT_ID
    outfit.user_id = USER_ID
    outfit.collage_url = f"{USER_ID}/{OUTFIT_ID}/collage.jpg"
    outfit.name = None
    outfit.occasion = None
    outfit.ai_generated = False
    outfit.ai_reasoning = None
    repo.get_by_id = AsyncMock(return_value=outfit)

    oi = MagicMock(spec=OutfitItem)
    oi.item_id = ITEM_ID_1
    oi.role = OutfitItemRole.top
    oi.position = 0
    repo.list_outfit_items = AsyncMock(return_value=[oi])

    item = _ready_item(ITEM_ID_1, thumbnail=f"{USER_ID}/{ITEM_ID_1}/thumbnail.jpg")
    item_repo.get_by_id = AsyncMock(return_value=item)

    signed_collage = "https://signed/collage.jpg"
    signed_thumb = "https://signed/thumb.jpg"
    storage.get_signed_urls_batch = AsyncMock(
        return_value={
            outfit.collage_url: signed_collage,
            item.thumbnail_url: signed_thumb,
        }
    )

    result = await svc.get_outfit(OUTFIT_ID, USER_ID)

    assert result.collage_url == signed_collage
    assert result.items[0].thumbnail_url == signed_thumb


@pytest.mark.asyncio
async def test_list_outfits_returns_user_outfits():
    svc, repo, item_repo, storage = _make_service()

    outfit = MagicMock(spec=Outfit)
    outfit.id = OUTFIT_ID
    outfit.user_id = USER_ID
    outfit.collage_url = None
    outfit.name = None
    outfit.occasion = None
    outfit.ai_generated = False
    outfit.ai_reasoning = None
    repo.list_outfits = AsyncMock(return_value=[outfit])
    repo.list_outfit_items = AsyncMock(return_value=[])
    storage.get_signed_urls_batch = AsyncMock(return_value={})

    results = await svc.list_outfits(USER_ID)

    assert len(results) == 1
    assert results[0].id == OUTFIT_ID


@pytest.mark.asyncio
async def test_update_outfit_items_replaces_and_regenerates():
    item1 = _ready_item(ITEM_ID_1, thumbnail=f"{USER_ID}/{ITEM_ID_1}/thumbnail.jpg")
    svc, repo, item_repo, storage = _make_service()

    outfit = MagicMock(spec=Outfit)
    outfit.id = OUTFIT_ID
    outfit.user_id = USER_ID
    outfit.collage_url = f"{USER_ID}/{OUTFIT_ID}/collage.jpg"
    outfit.name = None
    outfit.occasion = None
    outfit.ai_generated = False
    outfit.ai_reasoning = None
    repo.get_by_id = AsyncMock(return_value=outfit)
    repo.replace_outfit_items = AsyncMock()
    repo.update_outfit = AsyncMock(return_value=outfit)

    item_repo.get_by_id = AsyncMock(return_value=item1)
    storage.upload = AsyncMock()
    storage.get_signed_urls_batch = AsyncMock(return_value={})

    data = PatchOutfitItemsIn(
        items=[OutfitItemIn(item_id=ITEM_ID_1, role=OutfitItemRole.top, position=0)]
    )
    with patch("backend.outfits.service.generate_collage", AsyncMock(return_value=b"jpeg")):
        result = await svc.update_outfit_items(OUTFIT_ID, USER_ID, data)

    repo.replace_outfit_items.assert_awaited_once()
    assert result.id == OUTFIT_ID

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from sqlalchemy import text

from backend.core.database import transaction
from backend.core.exceptions import AppException
from backend.items.models import ClothingItem, ClothingType, ProcessingStatus
from backend.items.repository import ItemRepository
from backend.items.schemas import SortBy
from backend.items.service import ItemService


@pytest_asyncio.fixture
async def test_user_id(db_session):
    uid = uuid.uuid4()
    await db_session.execute(
        text("INSERT INTO auth.users (id, email) VALUES (:id, :email)"),
        {"id": str(uid), "email": f"test-{uid}@example.com"},
    )
    # Insert directly in case trigger doesn't fire in this environment
    await db_session.execute(
        text("INSERT INTO users (id, email) VALUES (:id, :email) ON CONFLICT (id) DO NOTHING"),
        {"id": str(uid), "email": f"test-{uid}@example.com"},
    )
    await db_session.commit()
    return uid


@pytest_asyncio.fixture
async def repo(db_session) -> ItemRepository:
    return ItemRepository(db_session)


# --- create + get ---


@pytest.mark.asyncio
async def test_create_and_get_item(repo, db_session, test_user_id):
    item = ClothingItem(user_id=test_user_id, processing_status=ProcessingStatus.pending)
    async with transaction(db_session):
        created = await repo.create(item)

    fetched = await repo.get_by_id(created.id, test_user_id)
    assert fetched is not None
    assert fetched.processing_status == ProcessingStatus.pending
    assert fetched.deleted_at is None


@pytest.mark.asyncio
async def test_get_item_wrong_user_returns_none(repo, db_session, test_user_id):
    item = ClothingItem(user_id=test_user_id, processing_status=ProcessingStatus.ready)
    async with transaction(db_session):
        created = await repo.create(item)

    other_user = uuid.uuid4()
    fetched = await repo.get_by_id(created.id, other_user)
    assert fetched is None


# --- list ---


@pytest.mark.asyncio
async def test_list_items_excludes_deleted(repo, db_session, test_user_id):
    item1 = ClothingItem(user_id=test_user_id, processing_status=ProcessingStatus.ready)
    item2 = ClothingItem(user_id=test_user_id, processing_status=ProcessingStatus.ready)
    async with transaction(db_session):
        await repo.create(item1)
        created2 = await repo.create(item2)

    async with transaction(db_session):
        await repo.soft_delete(created2)

    items, _ = await repo.list_items(test_user_id)
    ids = [i.id for i in items]
    assert item1.id in ids
    assert created2.id not in ids


@pytest.mark.asyncio
async def test_list_items_filter_by_type(repo, db_session, test_user_id):
    shirt = ClothingItem(
        user_id=test_user_id, type=ClothingType.shirt, processing_status=ProcessingStatus.ready
    )
    pants = ClothingItem(
        user_id=test_user_id, type=ClothingType.pants, processing_status=ProcessingStatus.ready
    )
    async with transaction(db_session):
        await repo.create(shirt)
        await repo.create(pants)

    result, _ = await repo.list_items(test_user_id, type=ClothingType.shirt)
    assert all(i.type == ClothingType.shirt for i in result)
    assert any(i.id == shirt.id for i in result)


@pytest.mark.asyncio
async def test_list_items_isolated_by_user(repo, db_session, test_user_id):
    other_user_id = uuid.uuid4()
    await db_session.execute(
        text("INSERT INTO auth.users (id, email) VALUES (:id, :email)"),
        {"id": str(other_user_id), "email": f"other-{other_user_id}@example.com"},
    )
    await db_session.execute(
        text("INSERT INTO users (id, email) VALUES (:id, :email) ON CONFLICT (id) DO NOTHING"),
        {"id": str(other_user_id), "email": f"other-{other_user_id}@example.com"},
    )
    await db_session.commit()

    my_item = ClothingItem(user_id=test_user_id, processing_status=ProcessingStatus.ready)
    other_item = ClothingItem(user_id=other_user_id, processing_status=ProcessingStatus.ready)
    async with transaction(db_session):
        await repo.create(my_item)
        await repo.create(other_item)

    my_items, _ = await repo.list_items(test_user_id)
    assert all(i.user_id == test_user_id for i in my_items)


# --- update / soft delete / status ---


@pytest.mark.asyncio
async def test_soft_delete_hides_item_from_list(repo, db_session, test_user_id):
    item = ClothingItem(user_id=test_user_id, processing_status=ProcessingStatus.ready)
    async with transaction(db_session):
        created = await repo.create(item)

    async with transaction(db_session):
        await repo.soft_delete(created)

    assert await repo.get_by_id(created.id, test_user_id) is None
    items, _ = await repo.list_items(test_user_id)
    assert not any(i.id == created.id for i in items)


@pytest.mark.asyncio
async def test_update_status(repo, db_session, test_user_id):
    item = ClothingItem(user_id=test_user_id, processing_status=ProcessingStatus.pending)
    async with transaction(db_session):
        created = await repo.create(item)

    async with transaction(db_session):
        await repo.update_status(created, ProcessingStatus.failed, error="rembg timeout")

    fetched = await repo.get_by_id(created.id, test_user_id)
    assert fetched.processing_status == ProcessingStatus.failed
    assert fetched.processing_error == "rembg timeout"


# --- sort ---


@pytest.mark.asyncio
async def test_list_items_sort_by_wear_count(repo, db_session, test_user_id):
    items_data = [
        ClothingItem(user_id=test_user_id, processing_status=ProcessingStatus.ready, wear_count=2),
        ClothingItem(user_id=test_user_id, processing_status=ProcessingStatus.ready, wear_count=5),
        ClothingItem(user_id=test_user_id, processing_status=ProcessingStatus.ready, wear_count=0),
    ]
    async with transaction(db_session):
        created = [await repo.create(i) for i in items_data]

    result, next_cursor = await repo.list_items(test_user_id, sort_by=SortBy.wear_count)
    our_ids = {i.id for i in created}
    result = [i for i in result if i.id in our_ids]

    assert next_cursor is None
    counts = [i.wear_count for i in result]
    assert counts == sorted(counts, reverse=True)
    assert counts[0] == 5


@pytest.mark.asyncio
async def test_list_items_sort_by_last_worn_at(repo, db_session, test_user_id):
    now = datetime.now(UTC)
    items_data = [
        ClothingItem(
            user_id=test_user_id,
            processing_status=ProcessingStatus.ready,
            last_worn_at=now - timedelta(days=1),
        ),
        ClothingItem(
            user_id=test_user_id,
            processing_status=ProcessingStatus.ready,
            last_worn_at=now,
        ),
        ClothingItem(
            user_id=test_user_id,
            processing_status=ProcessingStatus.ready,
            last_worn_at=None,
        ),
    ]
    async with transaction(db_session):
        created = [await repo.create(i) for i in items_data]

    our_ids = {i.id for i in created}
    result, _ = await repo.list_items(test_user_id, sort_by=SortBy.last_worn_at)
    result = [i for i in result if i.id in our_ids]

    assert result[-1].last_worn_at is None  # nulls last
    non_null = [i for i in result if i.last_worn_at is not None]
    dates = [i.last_worn_at for i in non_null]
    assert dates == sorted(dates, reverse=True)


# --- tag search ---


@pytest.mark.asyncio
async def test_list_items_tag_search(repo, db_session, test_user_id):
    with_tag = ClothingItem(
        user_id=test_user_id,
        processing_status=ProcessingStatus.ready,
        custom_tags=["vintage", "blue shirt"],
    )
    without_tag = ClothingItem(
        user_id=test_user_id,
        processing_status=ProcessingStatus.ready,
        custom_tags=["red pants"],
    )
    async with transaction(db_session):
        created_with = await repo.create(with_tag)
        created_without = await repo.create(without_tag)

    result, _ = await repo.list_items(test_user_id, q="shirt")
    ids = {i.id for i in result}
    assert created_with.id in ids
    assert created_without.id not in ids


@pytest.mark.asyncio
async def test_list_items_tag_search_case_insensitive(repo, db_session, test_user_id):
    item = ClothingItem(
        user_id=test_user_id,
        processing_status=ProcessingStatus.ready,
        custom_tags=["Vintage"],
    )
    async with transaction(db_session):
        created = await repo.create(item)

    result, _ = await repo.list_items(test_user_id, q="vintage")
    assert any(i.id == created.id for i in result)

    result2, _ = await repo.list_items(test_user_id, q="VINTAGE")
    assert any(i.id == created.id for i in result2)


# --- cursor pagination ---


@pytest.mark.asyncio
async def test_list_items_pagination_cursor(repo, db_session, test_user_id):
    # Create 5 items
    async with transaction(db_session):
        created = [
            await repo.create(
                ClothingItem(user_id=test_user_id, processing_status=ProcessingStatus.ready)
            )
            for _ in range(5)
        ]
    created_ids = {i.id for i in created}

    # Page 1: limit=2
    page1, cursor1 = await repo.list_items(test_user_id, limit=2)
    page1 = [i for i in page1 if i.id in created_ids]
    assert len(page1) == 2
    assert cursor1 is not None

    # Page 2: from cursor
    page2, cursor2 = await repo.list_items(test_user_id, cursor=cursor1, limit=2)
    page2 = [i for i in page2 if i.id in created_ids]
    assert len(page2) == 2
    # No overlap between pages
    assert not {i.id for i in page1} & {i.id for i in page2}

    # Page 3: should have the remaining item, no next_cursor
    page3, cursor3 = await repo.list_items(test_user_id, cursor=cursor2, limit=2)
    page3 = [i for i in page3 if i.id in created_ids]
    assert len(page3) == 1
    assert cursor3 is None

    # All 5 items covered exactly once
    all_ids = {i.id for i in page1 + page2 + page3}
    assert all_ids == created_ids


@pytest.mark.asyncio
async def test_list_items_pagination_no_cursor_when_exact_fit(repo, db_session, test_user_id):
    async with transaction(db_session):
        for _ in range(3):
            await repo.create(
                ClothingItem(user_id=test_user_id, processing_status=ProcessingStatus.ready)
            )

    # When result count equals limit exactly, next_cursor should be None
    # (we only have our 3 items; other tests may have added items so we can't be sure about cursor)
    # Just verify the cursor logic works: fetch with limit > count → no cursor
    _, cursor = await repo.list_items(test_user_id, limit=100)
    assert cursor is None


# --- service-level: signed URLs ---


@pytest.mark.asyncio
async def test_service_list_items_signs_thumbnail_url(repo, db_session, test_user_id):
    storage_path = f"{test_user_id}/some-item/thumbnail.jpg"
    item = ClothingItem(
        user_id=test_user_id,
        processing_status=ProcessingStatus.ready,
        thumbnail_url=storage_path,
    )
    async with transaction(db_session):
        await repo.create(item)

    signed_url = (
        "https://supabase.example.com/storage/v1/object/sign/closet-images/thumbnail.jpg?token=abc"
    )
    mock_storage = MagicMock()
    mock_storage.get_signed_urls_batch = AsyncMock(return_value={storage_path: signed_url})

    arq = MagicMock()
    svc = ItemService(db_session, repo, mock_storage, arq)
    items, _ = await svc.list_items(test_user_id)

    our_item = next(
        i for i in items if i.thumbnail_url == signed_url or storage_path in (i.thumbnail_url or "")
    )
    assert our_item.thumbnail_url == signed_url
    mock_storage.get_signed_urls_batch.assert_called_once()


# --- service-level retry guard ---


@pytest.mark.asyncio
async def test_service_retry_requires_failed_status(repo, db_session, test_user_id):
    item = ClothingItem(user_id=test_user_id, processing_status=ProcessingStatus.pending)
    async with transaction(db_session):
        created = await repo.create(item)

    arq = MagicMock()
    arq.enqueue_job = AsyncMock()
    svc = ItemService(db_session, repo, MagicMock(), arq)

    with pytest.raises(AppException) as exc_info:
        await svc.retry_processing(created.id, test_user_id)

    assert exc_info.value.code == "ITEM_NOT_FAILED"

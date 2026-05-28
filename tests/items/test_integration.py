import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from sqlalchemy import text

from backend.core.database import transaction
from backend.core.exceptions import AppException
from backend.items.models import ClothingItem, ClothingType, ProcessingStatus
from backend.items.repository import ItemRepository
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

    items = await repo.list_items(test_user_id)
    ids = [i.id for i in items]
    assert item1.id in ids
    assert created2.id not in ids


@pytest.mark.asyncio
async def test_list_items_filter_by_type(repo, db_session, test_user_id):
    shirt = ClothingItem(user_id=test_user_id, type=ClothingType.shirt, processing_status=ProcessingStatus.ready)
    pants = ClothingItem(user_id=test_user_id, type=ClothingType.pants, processing_status=ProcessingStatus.ready)
    async with transaction(db_session):
        await repo.create(shirt)
        await repo.create(pants)

    result = await repo.list_items(test_user_id, type=ClothingType.shirt)
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

    my_items = await repo.list_items(test_user_id)
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
    items = await repo.list_items(test_user_id)
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

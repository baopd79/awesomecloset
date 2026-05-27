import pytest
from fastapi import APIRouter
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from backend.core.database import transaction
from backend.core.exceptions import AppException
from backend.main import app


def test_app_exception_fields():
    exc = AppException(code="ITEM_NOT_FOUND", status=404, item_id="abc")
    assert exc.code == "ITEM_NOT_FOUND"
    assert exc.status == 404
    assert exc.extra == {"item_id": "abc"}


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_app_exception_handler():
    router = APIRouter()

    @router.get("/test-exception-handler")
    async def _():
        raise AppException(code="TEST_CODE", status=422, detail="oops")

    app.include_router(router)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/test-exception-handler")

    assert resp.status_code == 422
    assert resp.json()["code"] == "TEST_CODE"
    assert resp.json()["detail"] == "oops"


@pytest.mark.asyncio
async def test_transaction_commits(postgres_url):
    engine = create_async_engine(postgres_url)
    async with engine.begin() as conn:
        await conn.execute(text("CREATE TABLE IF NOT EXISTS _test_tx (val text)"))
        await conn.execute(text("TRUNCATE _test_tx"))

    async with AsyncSession(engine, expire_on_commit=False) as session:
        async with transaction(session):
            await session.execute(text("INSERT INTO _test_tx (val) VALUES ('hello')"))

    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT val FROM _test_tx"))
        rows = result.fetchall()

    assert len(rows) == 1
    assert rows[0][0] == "hello"
    await engine.dispose()


@pytest.mark.asyncio
async def test_transaction_rollbacks_on_exception(postgres_url):
    engine = create_async_engine(postgres_url)
    async with engine.begin() as conn:
        await conn.execute(text("CREATE TABLE IF NOT EXISTS _test_tx2 (val text)"))
        await conn.execute(text("TRUNCATE _test_tx2"))

    async with AsyncSession(engine, expire_on_commit=False) as session:
        with pytest.raises(ValueError):
            async with transaction(session):
                await session.execute(text("INSERT INTO _test_tx2 (val) VALUES ('hello')"))
                raise ValueError("rollback me")

    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT val FROM _test_tx2"))
        rows = result.fetchall()

    assert len(rows) == 0
    await engine.dispose()

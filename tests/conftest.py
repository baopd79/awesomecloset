import asyncio
import os
from pathlib import Path

# Set fake env vars before importing any backend module
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test")
os.environ.setdefault("SUPABASE_URL", "http://localhost")
os.environ.setdefault("SUPABASE_ANON_KEY", "test")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test")
os.environ.setdefault("SUPABASE_JWT_SECRET", "")
os.environ.setdefault("GEMINI_API_KEY", "test")
os.environ.setdefault("GEMINI_TAGGING_MODEL", "gemini-2.0-flash")
os.environ.setdefault("GEMINI_SUGGESTION_MODEL", "gemini-2.0-flash")
os.environ.setdefault("OPENWEATHERMAP_API_KEY", "test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-minimum-32-characters!!")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")

import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from testcontainers.postgres import PostgresContainer

_MIGRATIONS_DIR = Path(__file__).parent.parent / "supabase" / "migrations"
_SKIP_MIGRATIONS = {"004_rls.sql", "005_storage.sql", "006_realtime.sql"}


def _split_sql(sql: str) -> list[str]:
    """Split SQL file into individual statements, respecting $$...$$ and $tag$...$tag$ blocks."""
    statements: list[str] = []
    current: list[str] = []
    dollar_tag: str | None = None
    i = 0
    while i < len(sql):
        if dollar_tag is None and sql[i] == "$":
            j = i + 1
            while j < len(sql) and (sql[j].isalnum() or sql[j] == "_"):
                j += 1
            if j < len(sql) and sql[j] == "$":
                tag = sql[i : j + 1]
                dollar_tag = tag
                current.append(tag)
                i = j + 1
                continue
        elif dollar_tag is not None and sql[i : i + len(dollar_tag)] == dollar_tag:
            current.append(dollar_tag)
            i += len(dollar_tag)
            dollar_tag = None
            continue
        if sql[i] == ";" and dollar_tag is None:
            stmt = "".join(current).strip()
            if stmt:
                statements.append(stmt)
            current = []
        else:
            current.append(sql[i])
        i += 1
    last = "".join(current).strip()
    if last:
        statements.append(last)
    return statements


async def _run_migrations(db_url: str) -> None:
    engine = create_async_engine(db_url)
    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE SCHEMA IF NOT EXISTS auth"))
            await conn.execute(
                text("""
                CREATE TABLE IF NOT EXISTS auth.users (
                    id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                    email text
                )
            """)
            )
        for sql_file in sorted(_MIGRATIONS_DIR.glob("0*.sql")):
            if sql_file.name in _SKIP_MIGRATIONS:
                continue
            for stmt in _split_sql(sql_file.read_text()):
                async with engine.begin() as conn:
                    await conn.execute(text(stmt))
    finally:
        await engine.dispose()


@pytest.fixture(scope="session")
def postgres_url():
    with PostgresContainer("postgres:16") as postgres:
        yield postgres.get_connection_url().replace("psycopg2", "asyncpg")


@pytest.fixture(scope="session")
def migrated_db_url(postgres_url):
    """Run migrations once and return the DB URL."""
    asyncio.run(_run_migrations(postgres_url))
    return postgres_url


@pytest_asyncio.fixture
async def db_session(migrated_db_url):
    """Per-test engine + session wrapped in a transaction that rolls back after each test.

    Engine is created per test to avoid asyncpg event-loop conflicts (each async
    test function runs in its own loop). The outer connection transaction is never
    committed — join_transaction_mode="create_savepoint" demotes service-layer
    session.commit() calls to savepoint releases, so conn.rollback() undoes everything.
    """
    engine = create_async_engine(migrated_db_url, connect_args={"statement_cache_size": 0})
    async with engine.connect() as conn:
        await conn.begin()
        session = AsyncSession(
            conn,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )
        yield session
        await session.close()
        await conn.rollback()
    await engine.dispose()

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
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession
from testcontainers.postgres import PostgresContainer

_MIGRATIONS_DIR = Path(__file__).parent.parent / "supabase" / "migrations"
_SKIP_MIGRATIONS = {"004_rls.sql", "005_storage.sql"}


def _split_sql(sql: str) -> list[str]:
    """Split SQL file into individual statements, respecting $$...$$ blocks."""
    statements: list[str] = []
    current: list[str] = []
    in_dollar_quote = False
    i = 0
    while i < len(sql):
        if sql[i : i + 2] == "$$":
            in_dollar_quote = not in_dollar_quote
            current.append("$$")
            i += 2
            continue
        if sql[i] == ";" and not in_dollar_quote:
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
    """Fresh engine + session per test to avoid event-loop conflicts."""
    engine = create_async_engine(migrated_db_url)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        yield session
    await engine.dispose()

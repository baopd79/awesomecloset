from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    connect_args={"statement_cache_size": 0},
)
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    # Yields session with no active transaction; service layer manages boundaries via transaction().
    async with async_session_factory() as session:
        yield session


@asynccontextmanager
async def transaction(session: AsyncSession):
    # Commits on clean exit, rolls back on any exception.
    try:
        yield
        await session.commit()
    except Exception:
        await session.rollback()
        raise

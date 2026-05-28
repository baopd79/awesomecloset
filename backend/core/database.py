from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.core.config import settings

engine = create_async_engine(settings.database_url, echo=False, pool_pre_ping=True)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def get_db():
    async with async_session_factory() as session:
        yield session


@asynccontextmanager
async def transaction(session: AsyncSession):
    try:
        yield
        await session.commit()
    except Exception:
        await session.rollback()
        raise

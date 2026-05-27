from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from backend.core.config import settings

engine = create_async_engine(settings.database_url, echo=False, pool_pre_ping=True)


async def get_db():
    async with AsyncSession(engine, expire_on_commit=False) as session:
        yield session


@asynccontextmanager
async def transaction(session: AsyncSession):
    try:
        yield
        await session.commit()
    except Exception:
        await session.rollback()
        raise

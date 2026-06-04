from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from backend.analytics.repository import AnalyticsRepository
from backend.analytics.schemas import (
    ColorsResponse,
    HistoryResponse,
    SummaryResponse,
    UnwornResponse,
)
from backend.analytics.service import AnalyticsService
from backend.core.config import settings
from backend.core.dependencies import CurrentUserDep, SessionDep
from backend.core.storage import SupabaseStorageClient

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _make_service(session: SessionDep) -> AnalyticsService:
    storage = SupabaseStorageClient(settings.supabase_url, settings.supabase_service_role_key)
    return AnalyticsService(AnalyticsRepository(session), storage)


ServiceDep = Annotated[AnalyticsService, Depends(_make_service)]


@router.get("/summary", response_model=SummaryResponse)
async def get_summary(user_id: CurrentUserDep, svc: ServiceDep) -> SummaryResponse:
    return await svc.summary(UUID(user_id))


@router.get("/colors", response_model=ColorsResponse)
async def get_colors(user_id: CurrentUserDep, svc: ServiceDep) -> ColorsResponse:
    return await svc.colors(UUID(user_id))


@router.get("/unworn", response_model=UnwornResponse)
async def get_unworn(user_id: CurrentUserDep, svc: ServiceDep) -> UnwornResponse:
    return await svc.unworn(UUID(user_id))


@router.get("/history", response_model=HistoryResponse)
async def get_history(user_id: CurrentUserDep, svc: ServiceDep) -> HistoryResponse:
    return await svc.history(UUID(user_id))

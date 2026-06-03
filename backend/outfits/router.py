from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status

from backend.core.config import settings
from backend.core.dependencies import CurrentUserDep, SessionDep
from backend.core.storage import SupabaseStorageClient
from backend.items.repository import ItemRepository
from backend.outfits.repository import OutfitRepository
from backend.outfits.schemas import (
    CreateOutfitIn,
    FeedbackIn,
    FeedbackResponse,
    OutfitListResponse,
    OutfitResponse,
    PatchOutfitItemsIn,
    WearLogResponse,
    WearOutfitIn,
)
from backend.outfits.service import OutfitService

router = APIRouter(prefix="/api/outfits", tags=["outfits"])


def _make_service(session: SessionDep) -> OutfitService:
    storage = SupabaseStorageClient(settings.supabase_url, settings.supabase_service_role_key)
    return OutfitService(
        session=session,
        repo=OutfitRepository(session),
        item_repo=ItemRepository(session),
        storage=storage,
    )


ServiceDep = Annotated[OutfitService, Depends(_make_service)]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=OutfitResponse)
async def create_outfit(
    user_id: CurrentUserDep,
    svc: ServiceDep,
    body: CreateOutfitIn,
) -> OutfitResponse:
    return await svc.create_outfit(UUID(user_id), body)


@router.get("", response_model=OutfitListResponse)
async def list_outfits(
    user_id: CurrentUserDep,
    svc: ServiceDep,
) -> OutfitListResponse:
    outfits = await svc.list_outfits(UUID(user_id))
    return OutfitListResponse(outfits=outfits)


@router.get("/{outfit_id}", response_model=OutfitResponse)
async def get_outfit(
    outfit_id: UUID,
    user_id: CurrentUserDep,
    svc: ServiceDep,
) -> OutfitResponse:
    return await svc.get_outfit(outfit_id, UUID(user_id))


@router.patch("/{outfit_id}/items", response_model=OutfitResponse)
async def update_outfit_items(
    outfit_id: UUID,
    body: PatchOutfitItemsIn,
    user_id: CurrentUserDep,
    svc: ServiceDep,
) -> OutfitResponse:
    return await svc.update_outfit_items(outfit_id, UUID(user_id), body)


@router.post(
    "/{outfit_id}/wear", status_code=status.HTTP_201_CREATED, response_model=WearLogResponse
)
async def log_wear(
    outfit_id: UUID,
    body: WearOutfitIn,
    user_id: CurrentUserDep,
    svc: ServiceDep,
) -> WearLogResponse:
    return await svc.log_wear(outfit_id, UUID(user_id), body)


@router.post(
    "/{outfit_id}/feedback", status_code=status.HTTP_201_CREATED, response_model=FeedbackResponse
)
async def submit_feedback(
    outfit_id: UUID,
    body: FeedbackIn,
    user_id: CurrentUserDep,
    svc: ServiceDep,
) -> FeedbackResponse:
    return await svc.submit_feedback(outfit_id, UUID(user_id), body)

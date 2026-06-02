from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile, status

from backend.core.config import settings
from backend.core.dependencies import ArqDep, CurrentUserDep, SessionDep
from backend.core.storage import SupabaseStorageClient
from backend.items.models import ClothingOccasion, ClothingSeason, ClothingType
from backend.items.repository import ItemRepository
from backend.items.schemas import ItemListResponse, ItemResponse, SortBy, TagsUpdateRequest
from backend.items.service import ItemService

router = APIRouter(prefix="/api/items", tags=["items"])


def _make_service(session: SessionDep, arq: ArqDep) -> ItemService:
    # Composition root — assembles all dependencies for ItemService.
    repo = ItemRepository(session)
    storage = SupabaseStorageClient(settings.supabase_url, settings.supabase_service_role_key)
    return ItemService(session, repo, storage, arq)


ServiceDep = Annotated[ItemService, Depends(_make_service)]


@router.post("/upload", status_code=status.HTTP_202_ACCEPTED, response_model=ItemResponse)
async def upload_item(
    user_id: CurrentUserDep,
    svc: ServiceDep,
    file: Annotated[UploadFile, File()],
) -> ItemResponse:
    item = await svc.upload_item(UUID(user_id), file)
    return ItemResponse.model_validate(item)


@router.get("", response_model=ItemListResponse)
async def list_items(
    user_id: CurrentUserDep,
    svc: ServiceDep,
    type: ClothingType | None = None,
    occasion: ClothingOccasion | None = None,
    season: ClothingSeason | None = None,
    is_archived: bool | None = None,
    sort_by: SortBy = SortBy.created_at,
    q: str | None = None,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
) -> ItemListResponse:
    items, next_cursor = await svc.list_items(
        UUID(user_id),
        type=type,
        occasion=occasion,
        season=season,
        is_archived=is_archived,
        sort_by=sort_by,
        q=q,
        cursor=cursor,
        limit=limit,
    )
    return ItemListResponse(
        items=[ItemResponse.model_validate(i) for i in items],
        next_cursor=next_cursor,
    )


@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: UUID,
    user_id: CurrentUserDep,
    svc: ServiceDep,
) -> ItemResponse:
    item = await svc.get_item(item_id, UUID(user_id))
    return ItemResponse.model_validate(item)


@router.patch("/{item_id}/tags", response_model=ItemResponse)
async def update_tags(
    item_id: UUID,
    body: TagsUpdateRequest,
    user_id: CurrentUserDep,
    svc: ServiceDep,
) -> ItemResponse:
    item = await svc.update_tags(item_id, UUID(user_id), body)
    return ItemResponse.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: UUID,
    user_id: CurrentUserDep,
    svc: ServiceDep,
) -> None:
    await svc.delete_item(item_id, UUID(user_id))


@router.post("/{item_id}/archive", status_code=status.HTTP_200_OK, response_model=ItemResponse)
async def archive_item(
    item_id: UUID,
    user_id: CurrentUserDep,
    svc: ServiceDep,
) -> ItemResponse:
    item = await svc.archive_item(item_id, UUID(user_id))
    return ItemResponse.model_validate(item)


@router.post("/{item_id}/retry", status_code=status.HTTP_202_ACCEPTED, response_model=ItemResponse)
async def retry_item(
    item_id: UUID,
    user_id: CurrentUserDep,
    svc: ServiceDep,
) -> ItemResponse:
    item = await svc.retry_processing(item_id, UUID(user_id))
    return ItemResponse.model_validate(item)

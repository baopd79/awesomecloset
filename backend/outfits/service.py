from typing import Any
from uuid import UUID

from loguru import logger
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.database import transaction
from backend.core.exceptions import AppException
from backend.core.storage import StorageClient
from backend.items.models import ClothingItem, ProcessingStatus
from backend.items.repository import ItemRepository
from backend.outfits.collage import BUCKET, generate_collage
from backend.outfits.models import (
    FeedbackAction,
    Outfit,
    OutfitItem,
    OutfitItemRole,
    SuggestionFeedback,
    WearLog,
    _utcnow,
)
from backend.outfits.repository import OutfitRepository
from backend.outfits.schemas import (
    CreateOutfitIn,
    FeedbackIn,
    FeedbackResponse,
    OutfitItemIn,
    OutfitItemResponse,
    OutfitResponse,
    PatchOutfitItemsIn,
    WearLogResponse,
    WearOutfitIn,
)

_RATING_WARNING_ACTIONS = {FeedbackAction.dismissed, FeedbackAction.disliked}


class OutfitService:
    def __init__(
        self,
        session: AsyncSession,
        repo: OutfitRepository,
        item_repo: ItemRepository,
        storage: StorageClient,
    ):
        self._session = session
        self._repo = repo
        self._item_repo = item_repo
        self._storage = storage

    async def create_outfit(self, user_id: UUID, data: CreateOutfitIn) -> OutfitResponse:
        items_data = await self._validate_items(user_id, data.items)
        _warn_missing_role(data.items)

        outfit = Outfit(user_id=user_id, name=data.name, occasion=data.occasion)
        outfit_item_models = [
            OutfitItem(
                outfit_id=outfit.id,
                item_id=oi.item_id,
                role=oi.role,
                position=oi.position,
            )
            for oi in data.items
        ]
        async with transaction(self._session):
            outfit = await self._repo.create_outfit(outfit)
            for oi in outfit_item_models:
                await self._repo.create_outfit_item(oi)

        # Generate + upload collage after commit — non-reversible side effect
        outfit = await self._generate_and_attach_collage(outfit, user_id, data.items, items_data)

        return await self._build_response(outfit, list(zip(data.items, items_data)))

    async def get_outfit(self, outfit_id: UUID, user_id: UUID) -> OutfitResponse:
        outfit = await self._get_or_raise(outfit_id, user_id)
        outfit_items, clothing_items = await self._fetch_items_for_outfit(outfit_id, user_id)
        pairs = _pair_items(outfit_items, clothing_items)
        return await self._build_response(outfit, pairs)

    async def list_outfits(self, user_id: UUID) -> list[OutfitResponse]:
        outfits = await self._repo.list_outfits(user_id)
        results = []
        for outfit in outfits:
            outfit_items, clothing_items = await self._fetch_items_for_outfit(outfit.id, user_id)
            pairs = _pair_items(outfit_items, clothing_items)
            results.append(await self._build_response(outfit, pairs))
        return results

    async def update_outfit_items(
        self, outfit_id: UUID, user_id: UUID, data: PatchOutfitItemsIn
    ) -> OutfitResponse:
        outfit = await self._get_or_raise(outfit_id, user_id)
        items_data = await self._validate_items(user_id, data.items)
        _warn_missing_role(data.items)

        new_outfit_items = [
            OutfitItem(
                outfit_id=outfit_id,
                item_id=oi.item_id,
                role=oi.role,
                position=oi.position,
            )
            for oi in data.items
        ]
        async with transaction(self._session):
            await self._repo.replace_outfit_items(outfit_id, new_outfit_items)

        # Regenerate collage after items changed
        outfit = await self._generate_and_attach_collage(outfit, user_id, data.items, items_data)

        return await self._build_response(outfit, list(zip(data.items, items_data)))

    async def log_wear(self, outfit_id: UUID, user_id: UUID, data: WearOutfitIn) -> WearLogResponse:
        await self._get_or_raise(outfit_id, user_id)
        outfit_items = await self._repo.list_outfit_items(outfit_id)

        # Snapshot item data BEFORE writing — must be complete, not partial. Soft-deleted
        # items (get_by_id filters deleted_at) are skipped from both snapshot and wear bump.
        snapshot: list[dict[str, Any]] = []
        items_to_bump: list[ClothingItem] = []
        for oi in outfit_items:
            item = await self._item_repo.get_by_id(oi.item_id, user_id)
            if item is None:
                continue
            snapshot.append(_item_snapshot(item))
            items_to_bump.append(item)

        worn_at = _utcnow()
        wear_log = WearLog(
            user_id=user_id,
            outfit_id=outfit_id,
            items_snapshot=snapshot,
            rating=data.rating,
        )
        async with transaction(self._session):
            wear_log = await self._repo.create_wear_log(wear_log)
            for item in items_to_bump:
                await self._item_repo.bump_wear(item, worn_at)

        return WearLogResponse.model_validate(wear_log)

    async def submit_feedback(
        self, outfit_id: UUID, user_id: UUID, data: FeedbackIn
    ) -> FeedbackResponse:
        await self._get_or_raise(outfit_id, user_id)

        if data.rating is not None and data.action in _RATING_WARNING_ACTIONS:
            logger.warning(
                "feedback_rating_with_negative_action outfit_id={} action={} rating={}",
                outfit_id,
                data.action.value,
                data.rating,
            )

        feedback = SuggestionFeedback(
            user_id=user_id,
            outfit_id=outfit_id,
            action=data.action,
            rating=data.rating,
        )
        async with transaction(self._session):
            feedback = await self._repo.create_feedback(feedback)

        return FeedbackResponse.model_validate(feedback)

    # --- private helpers ---

    async def _get_or_raise(self, outfit_id: UUID, user_id: UUID) -> Outfit:
        outfit = await self._repo.get_by_id(outfit_id, user_id)
        if outfit is None:
            raise AppException(code="OUTFIT_NOT_FOUND", status=404, outfit_id=str(outfit_id))
        return outfit

    async def _validate_items(
        self, user_id: UUID, items_in: list[OutfitItemIn]
    ) -> list[ClothingItem]:
        result = []
        for oi in items_in:
            item = await self._item_repo.get_by_id(oi.item_id, user_id)
            if item is None:
                raise AppException(code="ITEM_NOT_FOUND", status=404, item_id=str(oi.item_id))
            if item.processing_status != ProcessingStatus.ready:
                raise AppException(
                    code="ITEM_NOT_READY",
                    status=400,
                    item_id=str(oi.item_id),
                    processing_status=item.processing_status.value,
                )
            result.append(item)
        return result

    async def _generate_and_attach_collage(
        self,
        outfit: Outfit,
        user_id: UUID,
        items_in: list[OutfitItemIn],
        clothing_items: list[ClothingItem],
    ) -> Outfit:
        role_paths = [(oi.role, item.thumbnail_url) for oi, item in zip(items_in, clothing_items)]
        try:
            collage_bytes = await generate_collage(role_paths, self._storage)
            collage_path = f"{user_id}/{outfit.id}/collage.jpg"
            await self._storage.upload(
                BUCKET, collage_path, collage_bytes, "image/jpeg", upsert=True
            )
            async with transaction(self._session):
                outfit.collage_url = collage_path
                outfit = await self._repo.update_outfit(outfit)
        except Exception as exc:
            logger.error("collage_failed outfit_id={} error={}", outfit.id, exc)
        return outfit

    async def _fetch_items_for_outfit(
        self, outfit_id: UUID, user_id: UUID
    ) -> tuple[list[OutfitItem], list[ClothingItem]]:
        outfit_items = await self._repo.list_outfit_items(outfit_id)
        clothing_items = []
        for oi in outfit_items:
            item = await self._item_repo.get_by_id(oi.item_id, user_id)
            clothing_items.append(item)
        return outfit_items, clothing_items

    async def _build_response(
        self,
        outfit: Outfit,
        pairs: list[tuple[OutfitItemIn | OutfitItem, ClothingItem | None]],
    ) -> OutfitResponse:
        paths: set[str] = set()
        if outfit.collage_url:
            paths.add(outfit.collage_url)
        for _, item in pairs:
            if item and item.thumbnail_url:
                paths.add(item.thumbnail_url)
            if item and item.processed_url:
                paths.add(item.processed_url)

        signed = await self._storage.get_signed_urls_batch(BUCKET, list(paths)) if paths else {}

        item_responses = [
            OutfitItemResponse(
                item_id=oi.item_id,
                role=oi.role,
                position=oi.position,
                thumbnail_url=signed.get(item.thumbnail_url)
                if item and item.thumbnail_url
                else None,
                processed_url=signed.get(item.processed_url)
                if item and item.processed_url
                else None,
                type=item.type if item else None,
            )
            for oi, item in pairs
        ]

        return OutfitResponse(
            id=outfit.id,
            user_id=outfit.user_id,
            name=outfit.name,
            collage_url=signed.get(outfit.collage_url) if outfit.collage_url else None,
            occasion=outfit.occasion,
            ai_generated=outfit.ai_generated,
            ai_reasoning=outfit.ai_reasoning,
            items=item_responses,
            created_at=outfit.created_at,
            updated_at=outfit.updated_at,
        )


def _item_snapshot(item: ClothingItem) -> dict[str, Any]:
    """Item data captured at wear time — immutable record for analytics (SPEC §4)."""
    return {
        "item_id": str(item.id),
        "type": item.type.value if item.type else None,
        "colors": item.colors,
        "style": [s.value for s in item.style] if item.style else None,
    }


def _warn_missing_role(items: list[OutfitItemIn]) -> None:
    roles = {oi.role for oi in items}
    has_top_or_bottom = OutfitItemRole.top in roles or OutfitItemRole.bottom in roles
    if not has_top_or_bottom:
        logger.warning("outfit_missing_top_or_bottom roles={}", [r.value for r in roles])


def _pair_items(
    outfit_items: list[OutfitItem], clothing_items: list[ClothingItem | None]
) -> list[tuple[OutfitItem, ClothingItem | None]]:
    return list(zip(outfit_items, clothing_items))

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel

from backend.items.models import (
    ClothingOccasion,
    ClothingSeason,
    ClothingStyle,
    ClothingType,
    ProcessingStatus,
)


class ItemResponse(BaseModel):
    id: UUID
    user_id: UUID
    original_url: str | None
    processed_url: str | None
    thumbnail_url: str | None
    processing_status: ProcessingStatus
    processing_error: str | None
    type: ClothingType | None
    colors: list[Any] | None
    style: list[ClothingStyle] | None
    season: list[ClothingSeason] | None
    occasion: list[ClothingOccasion] | None
    custom_tags: list[str] | None
    wear_count: int
    last_worn_at: datetime | None
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TagsUpdateRequest(BaseModel):
    # All fields optional — supports partial update via PATCH.
    type: ClothingType | None = None
    style: list[ClothingStyle] | None = None
    season: list[ClothingSeason] | None = None
    occasion: list[ClothingOccasion] | None = None
    custom_tags: list[str] | None = None

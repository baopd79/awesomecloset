from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, field_validator

from backend.items.models import (
    ClothingOccasion,
    ClothingSeason,
    ClothingStyle,
    ClothingType,
    ProcessingStatus,
    TagStatus,
)


class SortBy(str, Enum):
    created_at = "created_at"
    last_worn_at = "last_worn_at"
    wear_count = "wear_count"


class ItemResponse(BaseModel):
    id: UUID
    user_id: UUID
    original_url: str | None
    processed_url: str | None
    thumbnail_url: str | None
    processing_status: ProcessingStatus
    processing_error: str | None
    tag_status: TagStatus
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

    @field_validator("custom_tags")
    @classmethod
    def validate_custom_tags(cls, tags: list[str] | None) -> list[str] | None:
        if tags is None:
            return None
        if len(tags) > 20:
            raise ValueError("custom_tags cannot exceed 20 items")
        for tag in tags:
            if not tag.strip():
                raise ValueError("custom_tags cannot contain empty strings")
            if len(tag) > 50:
                raise ValueError("each tag cannot exceed 50 characters")
        return tags


class ItemListResponse(BaseModel):
    items: list[ItemResponse]
    next_cursor: str | None

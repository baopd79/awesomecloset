from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from backend.items.models import ClothingOccasion, ClothingType
from backend.outfits.models import FeedbackAction, OutfitItemRole


class OutfitItemIn(BaseModel):
    item_id: UUID
    role: OutfitItemRole
    position: int = 0


class CreateOutfitIn(BaseModel):
    name: str | None = None
    occasion: ClothingOccasion | None = None
    items: list[OutfitItemIn]

    @field_validator("items")
    @classmethod
    def at_least_one_item(cls, v: list[OutfitItemIn]) -> list[OutfitItemIn]:
        if not v:
            raise ValueError("items must contain at least one item")
        return v


class PatchOutfitItemsIn(BaseModel):
    items: list[OutfitItemIn]

    @field_validator("items")
    @classmethod
    def at_least_one_item(cls, v: list[OutfitItemIn]) -> list[OutfitItemIn]:
        if not v:
            raise ValueError("items must contain at least one item")
        return v


class OutfitItemResponse(BaseModel):
    item_id: UUID
    role: OutfitItemRole
    position: int
    thumbnail_url: str | None
    processed_url: str | None
    type: ClothingType | None

    model_config = {"from_attributes": True}


class OutfitResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str | None
    collage_url: str | None
    occasion: ClothingOccasion | None
    ai_generated: bool
    ai_reasoning: str | None
    is_saved: bool
    items: list[OutfitItemResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OutfitListResponse(BaseModel):
    outfits: list[OutfitResponse]


class WearOutfitIn(BaseModel):
    rating: int | None = Field(default=None, ge=1, le=5)


class WearLogResponse(BaseModel):
    id: UUID
    outfit_id: UUID
    worn_date: date
    items_snapshot: list[Any]
    rating: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class FeedbackIn(BaseModel):
    action: FeedbackAction
    rating: int | None = Field(default=None, ge=1, le=5)


class FeedbackResponse(BaseModel):
    id: UUID
    outfit_id: UUID
    action: FeedbackAction
    rating: int | None
    created_at: datetime

    model_config = {"from_attributes": True}

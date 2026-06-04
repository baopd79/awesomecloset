from datetime import date
from uuid import UUID

from pydantic import BaseModel

from backend.items.models import ClothingOccasion, ClothingType


class ColorStat(BaseModel):
    name: str
    hex: str
    count: int  # total wear_count of items featuring this color


class ColorsResponse(BaseModel):
    colors: list[ColorStat]


class UnwornItem(BaseModel):
    id: UUID
    type: ClothingType | None
    thumbnail_url: str | None  # signed at read time


class UnwornResponse(BaseModel):
    items: list[UnwornItem]


class HistoryEntry(BaseModel):
    date: date
    outfit_id: UUID
    collage_url: str | None  # signed at read time
    occasion: ClothingOccasion | None


class HistoryResponse(BaseModel):
    days: list[HistoryEntry]


class SummaryResponse(BaseModel):
    items_count: int  # active, ready, not archived/deleted
    outfits_count: int
    worn_days: int  # distinct days with at least one wear log

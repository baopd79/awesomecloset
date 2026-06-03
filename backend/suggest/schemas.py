from enum import Enum

from pydantic import BaseModel, Field

from backend.items.models import ClothingOccasion
from backend.outfits.schemas import OutfitResponse


class ManualCondition(str, Enum):
    hot = "hot"
    warm = "warm"
    cool = "cool"
    cold = "cold"
    rainy = "rainy"


class WeatherResponse(BaseModel):
    temp_c: float
    condition: str
    city: str
    icon: str


class SuggestRequest(BaseModel):
    occasion: ClothingOccasion | None = None
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    manual_condition: ManualCondition | None = None


class SuggestResponse(BaseModel):
    outfits: list[OutfitResponse]
    cached: bool

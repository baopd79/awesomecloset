from enum import Enum

from pydantic import BaseModel


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

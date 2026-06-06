import asyncio
from abc import ABC, abstractmethod

import google.generativeai as genai
from pydantic import BaseModel

from backend.items.models import ClothingOccasion, ClothingSeason, ClothingStyle, ClothingType
from backend.items.prompts import TAGGING_PROMPT

# Hard cap per Gemini call. With max_jobs=1 a hung request would block the whole queue, so
# bound it and let the job retry instead of stalling indefinitely.
_GEMINI_TIMEOUT_S = 30


class ColorEntry(BaseModel):
    hex: str
    name: str


class TaggingResult(BaseModel):
    type: ClothingType
    colors: list[ColorEntry]
    style: list[ClothingStyle]
    season: list[ClothingSeason]
    occasion: list[ClothingOccasion]


class GeminiClient(ABC):
    @abstractmethod
    async def tag_image(self, image_bytes: bytes) -> TaggingResult: ...


class GeminiFlashClient(GeminiClient):
    def __init__(self, api_key: str, model: str) -> None:
        genai.configure(api_key=api_key)
        self._model = genai.GenerativeModel(
            model_name=model,
            generation_config=genai.GenerationConfig(response_mime_type="application/json"),
        )

    async def tag_image(self, image_bytes: bytes) -> TaggingResult:
        image_part = {"mime_type": "image/jpeg", "data": image_bytes}
        response = await asyncio.to_thread(
            self._model.generate_content,
            [TAGGING_PROMPT, image_part],
            request_options={"timeout": _GEMINI_TIMEOUT_S},
        )
        return TaggingResult.model_validate_json(response.text)

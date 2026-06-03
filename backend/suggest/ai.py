import asyncio
from abc import ABC, abstractmethod
from uuid import UUID

import google.generativeai as genai
from pydantic import BaseModel


class SuggestedOutfit(BaseModel):
    item_ids: list[UUID]
    reasoning: str


class SuggestionResult(BaseModel):
    outfits: list[SuggestedOutfit]


class SuggestionClient(ABC):
    @abstractmethod
    async def suggest(self, prompt: str) -> SuggestionResult: ...


class GeminiSuggestionClient(SuggestionClient):
    def __init__(self, api_key: str, model: str) -> None:
        genai.configure(api_key=api_key)
        self._model = genai.GenerativeModel(
            model_name=model,
            generation_config=genai.GenerationConfig(response_mime_type="application/json"),
        )

    async def suggest(self, prompt: str) -> SuggestionResult:
        response = await asyncio.to_thread(self._model.generate_content, [prompt])
        return SuggestionResult.model_validate_json(response.text)

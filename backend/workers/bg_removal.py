import asyncio
from abc import ABC, abstractmethod

import httpx


class BackgroundRemovalClient(ABC):
    """Strategy interface for background removal — rembg (local) or remove.bg (API fallback)."""

    @abstractmethod
    async def remove(self, image_bytes: bytes) -> bytes:
        """Return PNG bytes with background removed."""
        ...


class RembgClient(BackgroundRemovalClient):
    """Local rembg inference. Session is loaded once in worker startup to avoid per-job overhead."""

    def __init__(self, session) -> None:
        self._session = session

    async def remove(self, image_bytes: bytes) -> bytes:
        import rembg

        return await asyncio.to_thread(rembg.remove, image_bytes, session=self._session)


class RemoveBgApiClient(BackgroundRemovalClient):
    """remove.bg REST API fallback. Used when rembg quality is insufficient or unavailable."""

    _API_URL = "https://api.remove.bg/v1.0/removebg"

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    async def remove(self, image_bytes: bytes) -> bytes:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                self._API_URL,
                files={"image_file": ("image.jpg", image_bytes, "image/jpeg")},
                data={"size": "auto"},
                headers={"X-Api-Key": self._api_key},
            )
            resp.raise_for_status()
            return resp.content

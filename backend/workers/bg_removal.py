import asyncio
import io
from abc import ABC, abstractmethod

import httpx
from PIL import Image, ImageOps

# u2net runs at 320x320 internally, so feeding a full-resolution phone photo (12MP+)
# only inflates peak RAM/CPU without improving the matte. Downscaling the input first
# keeps a single inference well under the worker's memory limit.
_REMBG_MAX_EDGE = 1280


def _prepare_for_rembg(image_bytes: bytes) -> bytes:
    img = Image.open(io.BytesIO(image_bytes))
    img = ImageOps.exif_transpose(img)  # honor phone EXIF orientation before stripping metadata
    img = img.convert("RGB")
    if max(img.size) > _REMBG_MAX_EDGE:
        img.thumbnail((_REMBG_MAX_EDGE, _REMBG_MAX_EDGE), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


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

        def _run() -> bytes:
            prepared = _prepare_for_rembg(image_bytes)
            return rembg.remove(prepared, session=self._session)

        return await asyncio.to_thread(_run)


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

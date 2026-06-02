from abc import ABC, abstractmethod

import httpx


class StorageClient(ABC):
    """Abstract interface for object storage — swap implementation without touching service layer."""

    @abstractmethod
    async def upload(
        self, bucket: str, path: str, content: bytes, content_type: str, upsert: bool = False
    ) -> str: ...

    @abstractmethod
    async def download(self, bucket: str, path: str) -> bytes: ...

    @abstractmethod
    async def get_signed_url(self, bucket: str, path: str, expires_in: int = 3600) -> str: ...

    @abstractmethod
    async def get_signed_urls_batch(
        self, bucket: str, paths: list[str], expires_in: int = 3600
    ) -> dict[str, str]:
        """Sign multiple paths in one request. Returns {path: signed_url} for successful entries."""
        ...

    @abstractmethod
    async def delete(self, bucket: str, path: str) -> None: ...


class SupabaseStorageClient(StorageClient):
    """Supabase Storage REST API implementation. Uses service role key for server-side access."""

    def __init__(self, supabase_url: str, service_role_key: str):
        self._base = f"{supabase_url}/storage/v1"
        self._headers = {
            "Authorization": f"Bearer {service_role_key}",
            "apikey": service_role_key,
        }

    async def upload(
        self, bucket: str, path: str, content: bytes, content_type: str, upsert: bool = False
    ) -> str:
        headers = {**self._headers, "Content-Type": content_type}
        if upsert:
            headers["x-upsert"] = "true"
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self._base}/object/{bucket}/{path}",
                content=content,
                headers=headers,
            )
            resp.raise_for_status()
        return f"{bucket}/{path}"

    async def download(self, bucket: str, path: str) -> bytes:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self._base}/object/{bucket}/{path}",
                headers=self._headers,
            )
            resp.raise_for_status()
            return resp.content

    async def get_signed_url(self, bucket: str, path: str, expires_in: int = 3600) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self._base}/object/sign/{bucket}/{path}",
                json={"expiresIn": expires_in},
                headers=self._headers,
            )
            resp.raise_for_status()
            data = resp.json()
        return f"{self._base}{data['signedURL']}"

    async def get_signed_urls_batch(
        self, bucket: str, paths: list[str], expires_in: int = 3600
    ) -> dict[str, str]:
        if not paths:
            return {}
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self._base}/object/sign/{bucket}",
                json={"expiresIn": expires_in, "paths": paths},
                headers=self._headers,
            )
            resp.raise_for_status()
        result = {}
        for entry in resp.json():
            if not entry.get("error") and entry.get("signedURL"):
                result[entry["path"]] = f"{self._base}{entry['signedURL']}"
        return result

    async def delete(self, bucket: str, path: str) -> None:
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{self._base}/object/{bucket}/{path}",
                headers=self._headers,
            )
            resp.raise_for_status()

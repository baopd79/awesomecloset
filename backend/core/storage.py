from abc import ABC, abstractmethod

import httpx


class StorageClient(ABC):
    @abstractmethod
    async def upload(self, bucket: str, path: str, content: bytes, content_type: str) -> str: ...

    @abstractmethod
    async def get_signed_url(self, bucket: str, path: str, expires_in: int = 3600) -> str: ...

    @abstractmethod
    async def delete(self, bucket: str, path: str) -> None: ...


class SupabaseStorageClient(StorageClient):
    def __init__(self, supabase_url: str, service_role_key: str):
        self._base = f"{supabase_url}/storage/v1"
        self._headers = {
            "Authorization": f"Bearer {service_role_key}",
            "apikey": service_role_key,
        }

    async def upload(self, bucket: str, path: str, content: bytes, content_type: str) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self._base}/object/{bucket}/{path}",
                content=content,
                headers={**self._headers, "Content-Type": content_type},
            )
            resp.raise_for_status()
        return f"{bucket}/{path}"

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

    async def delete(self, bucket: str, path: str) -> None:
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{self._base}/object/{bucket}/{path}",
                headers=self._headers,
            )
            resp.raise_for_status()

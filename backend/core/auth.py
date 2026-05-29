import httpx
from jose import JWTError, jwt
from loguru import logger


class JWKSClient:
    def __init__(self, jwks_url: str):
        self._url = jwks_url
        self._keys: dict[str, dict] = {}

    async def fetch(self) -> None:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(self._url)
            resp.raise_for_status()
            data = resp.json()
        self._keys = {k["kid"]: k for k in data.get("keys", [])}
        logger.info(f"JWKS loaded | kids={list(self._keys)}")

    async def get_key(self, kid: str) -> dict | None:
        if kid not in self._keys:
            await self.fetch()
        return self._keys.get(kid)

    def decode(self, token: str) -> dict:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        alg = header.get("alg", "ES256")
        if kid is None or kid not in self._keys:
            raise JWTError("unknown kid")
        key = self._keys[kid]
        return jwt.decode(token, key, algorithms=[alg], options={"verify_aud": False})

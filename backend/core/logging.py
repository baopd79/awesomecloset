import sys
import time
import uuid

from fastapi import Request
from loguru import logger

logger.remove()
logger.add(
    sys.stderr,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level:<7} | {message}",
    level="INFO",
)


async def request_logging_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    start = time.perf_counter()

    user_id = "-"
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            from jose import jwt

            from backend.core.config import settings

            payload = jwt.decode(
                auth[7:],
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False, "verify_exp": False},
            )
            user_id = payload.get("sub", "-")
        except Exception:
            pass

    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000

    logger.info(
        f"[{request_id}] {request.method} {request.url.path} "
        f"→ {response.status_code} | user={user_id} | {duration_ms:.1f}ms"
    )
    return response

import sys
import time
import uuid

from fastapi import Request
from jose import jwt
from loguru import logger

logger.remove()
logger.add(
    sys.stderr,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level:<7} | {message}",
    level="INFO",
)


async def request_logging_middleware(request: Request, call_next):
    """Logs method, path, status, user_id, and duration for every request."""
    request_id = str(uuid.uuid4())[:8]
    start = time.perf_counter()

    # Extract user_id without verifying signature — log context only, not auth.
    user_id = "-"
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            payload = jwt.get_unverified_claims(auth[7:])
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

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

from backend.core.config import settings


def _user_or_ip(request: Request) -> str:
    # Rate-limit per authenticated user; fall back to client IP for unauthenticated calls.
    uid = getattr(request.state, "user_id", None)
    return uid if uid else get_remote_address(request)


# In-memory storage is fine for a single API instance (MVP). Disabled under tests to avoid
# cross-test state bleed. Revisit shared storage when the API scales horizontally (Task 19).
limiter = Limiter(key_func=_user_or_ip, enabled=settings.app_env != "test")

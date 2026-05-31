from typing import Any


class AppException(Exception):
    """Domain exception thrown by service layer; router translates to HTTP response."""

    def __init__(self, code: str, status: int = 400, **extra: Any):
        self.code = code
        self.status = status
        self.extra = extra
        super().__init__(code)

from typing import Any


class AppException(Exception):
    def __init__(self, code: str, status: int = 400, **extra: Any):
        self.code = code
        self.status = status
        self.extra = extra
        super().__init__(code)

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from backend.core.exceptions import AppException
from backend.core.logging import request_logging_middleware

app = FastAPI(title="AwesomeCloset API")

app.middleware("http")(request_logging_middleware)


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, **exc.extra},
    )


@app.get("/health")
async def health():
    return {"status": "ok"}

from contextlib import asynccontextmanager

from arq import create_pool
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from backend.core.exceptions import AppException
from backend.core.logging import request_logging_middleware
from backend.items.router import router as items_router
from backend.workers.main import get_redis_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.arq = await create_pool(get_redis_settings())
    yield
    await app.state.arq.aclose()


app = FastAPI(title="AwesomeCloset API", lifespan=lifespan)

app.middleware("http")(request_logging_middleware)
app.include_router(items_router)


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status,
        content={"code": exc.code, **exc.extra},
    )


@app.get("/health")
async def health():
    return {"status": "ok"}

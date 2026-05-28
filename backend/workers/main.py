from urllib.parse import urlparse

from arq.connections import RedisSettings

from backend.core.config import settings
from backend.workers.tasks import process_item


def get_redis_settings() -> RedisSettings:
    parsed = urlparse(settings.redis_url)
    return RedisSettings(
        host=parsed.hostname or "localhost",
        port=parsed.port or 6379,
        password=parsed.password,
        database=int(parsed.path.lstrip("/") or 0),
    )


class WorkerSettings:
    functions = [process_item]
    redis_settings = get_redis_settings()
    max_jobs = 10
    job_timeout = 300
    retry_jobs = True
    job_retry_after = 5  # seconds before retry (ARQ handles exponential via job_try in function)

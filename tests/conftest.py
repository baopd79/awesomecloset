import os

# Set fake env vars trước khi import bất kỳ backend module nào
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test")
os.environ.setdefault("SUPABASE_URL", "http://localhost")
os.environ.setdefault("SUPABASE_ANON_KEY", "test")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-jwt-secret-must-be-at-least-32-chars!")
os.environ.setdefault("GEMINI_API_KEY", "test")
os.environ.setdefault("GEMINI_TAGGING_MODEL", "gemini-2.0-flash")
os.environ.setdefault("GEMINI_SUGGESTION_MODEL", "gemini-2.0-flash")
os.environ.setdefault("OPENWEATHERMAP_API_KEY", "test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-minimum-32-characters!!")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")

import pytest
from testcontainers.postgres import PostgresContainer


@pytest.fixture(scope="session")
def postgres_url():
    with PostgresContainer("postgres:16") as postgres:
        yield postgres.get_connection_url().replace("psycopg2", "asyncpg")

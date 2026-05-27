import pytest
from testcontainers.postgres import PostgresContainer


@pytest.fixture(scope="session")
def postgres_url():
    with PostgresContainer("postgres:16") as postgres:
        yield postgres.get_connection_url().replace("psycopg2", "asyncpg")

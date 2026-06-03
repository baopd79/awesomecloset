import uuid
from datetime import UTC, date, datetime

from sqlalchemy import Column, Date, DateTime
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _today() -> date:
    return datetime.now(UTC).date()


class DailySuggestionCache(SQLModel, table=True):
    __tablename__ = "daily_suggestion_cache"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field()  # FK to users.id enforced by DB migration
    suggestion_date: date = Field(
        default_factory=_today,
        sa_column=Column(Date(), default=_today, nullable=False),
    )
    context_hash: str = Field()
    outfit_ids: list[uuid.UUID] = Field(
        default_factory=list,
        sa_column=Column(ARRAY(PGUUID(as_uuid=True)), nullable=False),
    )
    created_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=Column(DateTime(timezone=True), default=_utcnow, nullable=False),
    )

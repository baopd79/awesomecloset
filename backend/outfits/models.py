import uuid
from datetime import UTC, date, datetime
from enum import Enum
from typing import Any

from sqlalchemy import Column, Date, DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

from backend.items.models import ClothingOccasion


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _today() -> date:
    return datetime.now(UTC).date()


class OutfitItemRole(str, Enum):
    top = "top"
    bottom = "bottom"
    shoes = "shoes"
    outerwear = "outerwear"
    bag = "bag"
    accessory = "accessory"


class Outfit(SQLModel, table=True):
    __tablename__ = "outfits"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field()
    name: str | None = None
    collage_url: str | None = None
    occasion: ClothingOccasion | None = Field(
        default=None,
        sa_column=Column(
            SAEnum(ClothingOccasion, name="clothing_occasion", create_type=False),
            nullable=True,
        ),
    )
    weather_context: dict[str, Any] | None = Field(
        default=None,
        sa_column=Column(JSONB(), nullable=True),
    )
    ai_generated: bool = Field(default=False)
    ai_reasoning: str | None = None
    created_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=Column(DateTime(timezone=True), default=_utcnow, nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=Column(
            DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
        ),
    )


class OutfitItem(SQLModel, table=True):
    __tablename__ = "outfit_items"

    outfit_id: uuid.UUID = Field(primary_key=True)
    item_id: uuid.UUID = Field(primary_key=True)
    position: int = Field(default=0)
    role: OutfitItemRole = Field(
        sa_column=Column(
            SAEnum(OutfitItemRole, name="outfit_item_role", create_type=False),
            nullable=False,
        )
    )


class FeedbackAction(str, Enum):
    saved = "saved"
    worn = "worn"
    dismissed = "dismissed"
    disliked = "disliked"


class WearLog(SQLModel, table=True):
    __tablename__ = "wear_logs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field()  # FK to users.id enforced by DB migration
    outfit_id: uuid.UUID = Field()  # FK to outfits.id enforced by DB migration
    worn_date: date = Field(
        default_factory=_today,
        sa_column=Column(Date(), default=_today, nullable=False),
    )
    # Snapshot of item data at wear time — kept immutable even if the outfit is later edited.
    items_snapshot: list[Any] = Field(
        default_factory=list,
        sa_column=Column(JSONB(), nullable=False),
    )
    rating: int | None = None
    created_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=Column(DateTime(timezone=True), default=_utcnow, nullable=False),
    )


class SuggestionFeedback(SQLModel, table=True):
    __tablename__ = "suggestion_feedback"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field()  # FK to users.id enforced by DB migration
    outfit_id: uuid.UUID = Field()  # FK to outfits.id enforced by DB migration
    action: FeedbackAction = Field(
        sa_column=Column(
            SAEnum(FeedbackAction, name="feedback_action", create_type=False),
            nullable=False,
        )
    )
    rating: int | None = None
    created_at: datetime = Field(
        default_factory=_utcnow,
        sa_column=Column(DateTime(timezone=True), default=_utcnow, nullable=False),
    )

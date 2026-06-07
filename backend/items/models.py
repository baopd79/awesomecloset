import uuid
from datetime import UTC, datetime
from enum import Enum
from typing import Any

from sqlalchemy import ARRAY, Column, DateTime, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    # Must return timezone-aware datetime — DB column is TIMESTAMPTZ.
    return datetime.now(UTC)


class ClothingType(str, Enum):
    t_shirt = "t_shirt"
    shirt = "shirt"
    pants = "pants"
    jeans = "jeans"
    shorts = "shorts"
    dress = "dress"
    skirt = "skirt"
    jacket = "jacket"
    coat = "coat"
    hoodie = "hoodie"
    sweater = "sweater"
    shoes = "shoes"
    sneakers = "sneakers"
    boots = "boots"
    bag = "bag"
    accessory = "accessory"


class ClothingStyle(str, Enum):
    casual = "casual"
    formal = "formal"
    streetwear = "streetwear"
    sporty = "sporty"
    elegant = "elegant"
    minimalist = "minimalist"


class ClothingSeason(str, Enum):
    spring_summer = "spring_summer"
    fall_winter = "fall_winter"
    all_season = "all_season"


class ClothingOccasion(str, Enum):
    school = "school"
    work = "work"
    casual = "casual"
    party = "party"
    date = "date"
    travel = "travel"


class ProcessingStatus(str, Enum):
    pending = "pending"
    removing_bg = "removing_bg"
    tagging = "tagging"
    ready = "ready"
    failed = "failed"


class TagStatus(str, Enum):
    # Tagging state, independent of processing_status. `tagged` <=> the item has a type.
    untagged = "untagged"
    tagging = "tagging"
    tagged = "tagged"
    tag_failed = "tag_failed"


class ClothingItem(SQLModel, table=True):
    """Core entity. FK constraints and RLS enforced by DB migration, not SQLAlchemy."""

    __tablename__ = "clothing_items"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field()  # FK to users.id enforced by DB migration
    original_url: str | None = None
    processed_url: str | None = None
    thumbnail_url: str | None = None
    processing_status: ProcessingStatus = Field(
        default=ProcessingStatus.pending,
        sa_column=Column(
            SAEnum(ProcessingStatus, name="processing_status", create_type=False),
            nullable=False,
            default=ProcessingStatus.pending,
        ),
    )
    processing_error: str | None = None
    tag_status: TagStatus = Field(
        default=TagStatus.untagged,
        sa_column=Column(
            SAEnum(TagStatus, name="tag_status", create_type=False),
            nullable=False,
            default=TagStatus.untagged,
        ),
    )
    type: ClothingType | None = Field(
        default=None,
        sa_column=Column(
            SAEnum(ClothingType, name="clothing_type", create_type=False),
            nullable=True,
        ),
    )
    colors: list[Any] | None = Field(
        default=None,
        sa_column=Column(JSONB(), nullable=True),
    )
    style: list[ClothingStyle] | None = Field(
        default=None,
        sa_column=Column(
            ARRAY(SAEnum(ClothingStyle, name="clothing_style", create_type=False)),
            nullable=True,
        ),
    )
    season: list[ClothingSeason] | None = Field(
        default=None,
        sa_column=Column(
            ARRAY(SAEnum(ClothingSeason, name="clothing_season", create_type=False)),
            nullable=True,
        ),
    )
    occasion: list[ClothingOccasion] | None = Field(
        default=None,
        sa_column=Column(
            ARRAY(SAEnum(ClothingOccasion, name="clothing_occasion", create_type=False)),
            nullable=True,
        ),
    )
    custom_tags: list[str] | None = Field(
        default=None,
        sa_column=Column(ARRAY(String()), nullable=True),
    )
    wear_count: int = Field(default=0)
    last_worn_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    is_archived: bool = Field(default=False)
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
    archived_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    deleted_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

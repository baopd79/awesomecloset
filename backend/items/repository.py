import base64
import json
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import and_, or_, text
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.items.models import (
    ClothingItem,
    ClothingOccasion,
    ClothingSeason,
    ClothingType,
    ProcessingStatus,
    _utcnow,
)
from backend.items.schemas import SortBy

_ORPHAN_STATUSES = [
    ProcessingStatus.pending,
    ProcessingStatus.removing_bg,
    ProcessingStatus.tagging,
]
_ORPHAN_THRESHOLD_MINUTES = 10
_DEFAULT_LIMIT = 30
_MAX_LIMIT = 100


def _encode_cursor(sort_val: Any, item_id: UUID, sort_by: SortBy) -> str:
    serialized = sort_val.isoformat() if isinstance(sort_val, datetime) else sort_val
    payload = json.dumps({"v": serialized, "id": str(item_id), "s": sort_by.value})
    return base64.urlsafe_b64encode(payload.encode()).decode()


def _decode_cursor(cursor: str, sort_by: SortBy) -> tuple[Any, UUID]:
    try:
        data = json.loads(base64.urlsafe_b64decode(cursor.encode()))
        if data["s"] != sort_by.value:
            raise ValueError
        item_id = UUID(data["id"])
        raw = data["v"]
        if sort_by == SortBy.created_at or (sort_by == SortBy.last_worn_at and raw is not None):
            sort_val: Any = datetime.fromisoformat(raw)
        else:
            sort_val = raw  # int (wear_count) or None (last_worn_at null page)
        return sort_val, item_id
    except Exception:
        raise ValueError("invalid cursor")


class ItemRepository:
    """All DB queries for clothing_items. All user-facing methods are scoped by user_id."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def create(self, item: ClothingItem) -> ClothingItem:
        self._session.add(item)
        await self._session.flush()
        await self._session.refresh(item)
        return item

    async def list_orphaned(self) -> list[ClothingItem]:
        """Items stuck in a processing state for >{threshold}min — no active job in queue."""
        cutoff = datetime.now(UTC) - timedelta(minutes=_ORPHAN_THRESHOLD_MINUTES)
        stmt = select(ClothingItem).where(
            ClothingItem.processing_status.in_(_ORPHAN_STATUSES),
            ClothingItem.updated_at < cutoff,
            ClothingItem.deleted_at.is_(None),
        )
        result = await self._session.exec(stmt)
        return list(result.all())

    async def get_by_id_system(self, item_id: UUID) -> ClothingItem | None:
        """Fetch by item_id only, no user_id scope — for worker/background use."""
        stmt = select(ClothingItem).where(
            ClothingItem.id == item_id,
            ClothingItem.deleted_at.is_(None),
        )
        result = await self._session.exec(stmt)
        return result.first()

    async def get_by_id(self, item_id: UUID, user_id: UUID) -> ClothingItem | None:
        stmt = select(ClothingItem).where(
            ClothingItem.id == item_id,
            ClothingItem.user_id == user_id,
            ClothingItem.deleted_at.is_(None),
        )
        result = await self._session.exec(stmt)
        return result.first()

    async def list_items(
        self,
        user_id: UUID,
        item_type: ClothingType | None = None,
        occasion: ClothingOccasion | None = None,
        season: ClothingSeason | None = None,
        is_archived: bool | None = None,
        sort_by: SortBy = SortBy.created_at,
        q: str | None = None,
        cursor: str | None = None,
        limit: int = _DEFAULT_LIMIT,
    ) -> tuple[list[ClothingItem], str | None]:
        limit = min(limit, _MAX_LIMIT)
        stmt = select(ClothingItem).where(
            ClothingItem.user_id == user_id,
            ClothingItem.deleted_at.is_(None),
        )

        if item_type is not None:
            stmt = stmt.where(ClothingItem.type == item_type)
        if occasion is not None:
            stmt = stmt.where(ClothingItem.occasion.contains([occasion]))
        if season is not None:
            stmt = stmt.where(ClothingItem.season.contains([season]))
        if is_archived is not None:
            stmt = stmt.where(ClothingItem.is_archived == is_archived)
        if q:
            stmt = stmt.where(
                text(
                    "EXISTS (SELECT 1 FROM unnest(custom_tags) AS t(tag) WHERE t ILIKE :q_pattern)"
                ).bindparams(q_pattern=f"%{q}%")
            )

        if cursor:
            cursor_val, cursor_id = _decode_cursor(cursor, sort_by)
            stmt = _apply_cursor_where(stmt, sort_by, cursor_val, cursor_id)

        stmt = _apply_order(stmt, sort_by)
        stmt = stmt.limit(limit + 1)

        result = await self._session.exec(stmt)
        rows = list(result.all())

        if len(rows) > limit:
            rows = rows[:limit]
            last = rows[-1]
            next_cursor = _encode_cursor(_cursor_val(last, sort_by), last.id, sort_by)
        else:
            next_cursor = None

        return rows, next_cursor

    async def update(self, item: ClothingItem) -> ClothingItem:
        self._session.add(item)
        await self._session.flush()
        await self._session.refresh(item)
        return item

    async def soft_delete(self, item: ClothingItem) -> None:
        item.deleted_at = _utcnow()
        self._session.add(item)
        await self._session.flush()

    async def update_status(
        self, item: ClothingItem, status: ProcessingStatus, error: str | None = None
    ) -> None:
        item.processing_status = status
        item.processing_error = error
        self._session.add(item)
        await self._session.flush()


def _cursor_val(item: ClothingItem, sort_by: SortBy) -> Any:
    if sort_by == SortBy.created_at:
        return item.created_at
    if sort_by == SortBy.last_worn_at:
        return item.last_worn_at
    return item.wear_count


def _apply_order(stmt: Any, sort_by: SortBy) -> Any:
    if sort_by == SortBy.last_worn_at:
        return stmt.order_by(ClothingItem.last_worn_at.desc().nulls_last(), ClothingItem.id.desc())
    if sort_by == SortBy.wear_count:
        return stmt.order_by(ClothingItem.wear_count.desc(), ClothingItem.id.desc())
    return stmt.order_by(ClothingItem.created_at.desc(), ClothingItem.id.desc())


def _apply_cursor_where(stmt: Any, sort_by: SortBy, cursor_val: Any, cursor_id: UUID) -> Any:
    if sort_by == SortBy.created_at:
        return stmt.where(
            or_(
                ClothingItem.created_at < cursor_val,
                and_(ClothingItem.created_at == cursor_val, ClothingItem.id < cursor_id),
            )
        )
    if sort_by == SortBy.wear_count:
        return stmt.where(
            or_(
                ClothingItem.wear_count < cursor_val,
                and_(ClothingItem.wear_count == cursor_val, ClothingItem.id < cursor_id),
            )
        )
    # last_worn_at DESC NULLS LAST
    if cursor_val is not None:
        # current page ended on a non-null value: next page has smaller values or null
        return stmt.where(
            or_(
                ClothingItem.last_worn_at < cursor_val,
                and_(ClothingItem.last_worn_at == cursor_val, ClothingItem.id < cursor_id),
                ClothingItem.last_worn_at.is_(None),
            )
        )
    else:
        # current page ended on null: next page only has nulls with smaller id
        return stmt.where(and_(ClothingItem.last_worn_at.is_(None), ClothingItem.id < cursor_id))

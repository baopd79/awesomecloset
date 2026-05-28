# Backend Conventions

## Layered Architecture

Mỗi feature là 1 folder khép kín theo pattern:

```
Router → Service → Repository → Model
```

- **Router**: nhận HTTP request, validate schema, trả response. Không chứa business logic.
- **Service**: business logic, owns transaction boundary. Throw `AppException`, không biết gì về HTTP.
- **Repository**: tất cả DB queries. Nếu đổi DB chỉ sửa repo.
- **Model**: SQLModel table definition.

### Dependency direction rule

`core/` không được import từ feature modules. Chiều import hợp lệ duy nhất:

```
feature/* → core/*   ✅
core/*    → feature/* ❌  (circular import)
```

Hệ quả: shared type aliases (`CurrentUserDep`, `SessionDep`, `ArqDep`) đặt trong `core/dependencies.py`. Feature-specific aliases (`ItemServiceDep`, ...) đặt trong router của feature đó — router là composition root, đây là đúng chỗ.

---

## Dependency Injection — Annotated Aliases

Dùng `Annotated` để tạo type alias cho dependency thay vì lặp `= Depends(...)` ở mỗi endpoint.

**`core/dependencies.py`** — shared aliases, dùng được ở mọi feature:

```python
from typing import Annotated
from fastapi import Depends

CurrentUserDep = Annotated[str, Depends(get_current_user_id)]
SessionDep     = Annotated[AsyncSession, Depends(get_db)]
ArqDep         = Annotated[ArqRedis, Depends(get_arq)]
```

**Router của mỗi feature** — alias cho service dep, đặt ngay sau `_make_service`:

```python
def _make_service(session: SessionDep, arq: ArqDep) -> ItemService:
    ...

ItemServiceDep = Annotated[ItemService, Depends(_make_service)]
```

Naming convention: `<Entity>ServiceDep`, `<Entity>RepoDep` — thêm suffix domain để không trùng khi nhiều feature.

Endpoint sẽ không còn `= Depends(...)` inline:

```python
# ✅
async def get_item(item_id: UUID, user_id: CurrentUserDep, svc: ItemServiceDep) -> ItemResponse:

# ❌
async def get_item(item_id: UUID, user_id: str = Depends(get_current_user_id), svc: ItemService = Depends(_make_service)) -> ItemResponse:
```

**Lưu ý thứ tự param**: `Annotated` dep không có Python default, `= File(...)` hay `= Query(...)` thì có. Python không cho param không-default đứng sau param có-default → dùng `Annotated[UploadFile, File()]` thay vì `file: UploadFile = File(...)` để giữ thứ tự tự do.

---

## Transaction Management

Service owns transaction boundary — nhận `AsyncSession` làm arg đầu tiên, dùng `transaction(self._session)` trực tiếp. Repository không expose session ra ngoài.

```python
class XxxService:
    def __init__(self, session: AsyncSession, repo: XxxRepository, ...):
        self._session = session
        self._repo = repo

    async def some_mutation(self, ...):
        async with transaction(self._session):
            await self._repo.do_something(...)
```

Router tạo service:

```python
def _make_service(session=Depends(get_db), ...) -> XxxService:
    return XxxService(session, XxxRepository(session), ...)
```

- Không dùng `async with session.begin()` — conflict với asyncpg autobegin.
- `get_db` chỉ yield session, không manage transaction.

---

## Exception Handling

```python
# service layer throws domain exception
raise AppException(code="ITEM_NOT_FOUND", status=404)

# router không catch — global handler chuyển sang HTTP response
@app.exception_handler(AppException)
async def app_exception_handler(request, exc): ...
```

---

## HTTP Conventions

- Partial update dùng `PATCH`, không dùng `PUT`.
- Status codes dùng constants: `status.HTTP_202_ACCEPTED`, `status.HTTP_204_NO_CONTENT`, v.v.
- Tất cả endpoints khai báo `response_model`.
- Upload/processing endpoints trả `202 Accepted` ngay, không đợi AI pipeline xong.

---

## Dependency Injection

External services được inject qua constructor — không instantiate bên trong service:

```python
def _make_service(session=Depends(get_db), arq=Depends(get_arq)) -> ItemService:
    repo = ItemRepository(session)
    storage = SupabaseStorageClient(...)
    return ItemService(session, repo, storage, arq)
```

External clients (Gemini, rembg, Weather, Storage) phải có ABC interface để mock dễ trong test.

---

## AI Processing Pipeline

- Upload → trả `202 Accepted` ngay.
- rembg + Gemini tagging chạy trên **ARQ worker** (process riêng) — không dùng FastAPI `BackgroundTasks` vì rembg load model nặng.
- Frontend dùng Supabase Realtime để nhận update khi `processing_status` thay đổi.
- Mọi bước processing update `processing_status`; lỗi lưu `processing_error` để UI có thể retry.
- Gemini tagging prompt **phải truyền taxonomy enum values** — không để AI tự sáng tác tag ngoài danh sách.
- Tất cả AI prompts đặt trong `prompts.py` riêng của mỗi feature.

---

## SQLModel / SQLAlchemy Models

### Datetime columns

DB migration dùng `TIMESTAMPTZ` cho mọi timestamp → model phải dùng `DateTime(timezone=True)`.

`_utcnow()` trả về timezone-aware datetime:

```python
def _utcnow() -> datetime:
    return datetime.now(UTC)
```

Mọi datetime field cần `sa_column=Column(DateTime(timezone=True), ...)`:

```python
from sqlalchemy import Column, DateTime

created_at: datetime = Field(
    default_factory=_utcnow,
    sa_column=Column(DateTime(timezone=True), default=_utcnow, nullable=False),
)
updated_at: datetime = Field(
    default_factory=_utcnow,
    sa_column=Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False),
)
deleted_at: datetime | None = Field(
    default=None,
    sa_column=Column(DateTime(timezone=True), nullable=True),
)
```

**`onupdate` chỉ dùng cho `updated_at`** — fires trên mọi UPDATE, sẽ corrupt field chỉ set một lần như `deleted_at`, `archived_at`. `deleted_at` set thủ công trong `soft_delete()`.

### Custom Postgres types

`sa_column` bắt buộc khi column là `SAEnum`, `ARRAY`, hoặc `JSONB`:

```python
from sqlalchemy import ARRAY, Column
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB

# Enum — luôn dùng create_type=False, type đã tồn tại trong migration
type: ClothingType | None = Field(
    default=None,
    sa_column=Column(SAEnum(ClothingType, name="clothing_type", create_type=False), nullable=True),
)

# Array of enum
style: list[ClothingStyle] | None = Field(
    default=None,
    sa_column=Column(ARRAY(SAEnum(ClothingStyle, name="clothing_style", create_type=False)), nullable=True),
)

# JSONB
colors: list[Any] | None = Field(
    default=None,
    sa_column=Column(JSONB(), nullable=True),
)
```

`create_type=False` trên tất cả `SAEnum` — Postgres enum types được tạo trong migration, không để SQLAlchemy tạo lại.

### Foreign keys

Không khai báo `foreign_key` trong model field — FK constraint chỉ định nghĩa trong DB migration:

```python
# ✅ đúng
user_id: uuid.UUID = Field()

# ❌ sai — SQLAlchemy raise NoReferencedTableError khi boot
user_id: uuid.UUID = Field(foreign_key="users.id")
```

### server_default

Không cần `server_default` trong `sa_column` nếu migration đã có `DEFAULT NOW()`. `default_factory=_utcnow` (client-side) là đủ.

### Type hints

```python
# ✅
processed_url: str | None = None

# ❌
processed_url: Optional[str] = None
```

---

## Testing

- **Unit tests** (`test_service.py`): mock repo và external services, test business logic thuần túy, không cần DB.
- **Integration tests** (`test_integration.py`): Testcontainers Postgres, test Router → Service → Repository → DB, mock chỉ external AI APIs.
- Không dùng SQLite in-memory cho integration test — không cover `jsonb`, array, uuid, Postgres-specific behavior.
- Mỗi module phải pass hết test trước khi chuyển sang module tiếp theo.

---

## Misc

- Tất cả I/O phải `async/await`.
- Rate limiting trên AI endpoints (slowapi).
- Structured logging (loguru) — log `request_id`, `user_id`, AI call duration.
- Supabase RLS bắt buộc — user chỉ read/write data của mình.
- Không gửi ảnh full-size vào Gemini nếu thumbnail đủ dùng.
- Không lưu ảnh gốc không compressed — resize/compress trước khi upload.
- Khi log wear: service phải fetch và snapshot toàn bộ item data trước khi insert `wear_logs`.

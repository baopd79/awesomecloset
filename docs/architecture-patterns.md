# Architecture Patterns

Các pattern & nguyên tắc thiết kế dùng trong codebase. Mỗi section là một khái niệm độc lập — có pattern mới thì thêm `###` mới, đừng tách file lẻ.

> Phân biệt với các doc khác:
> - `backend-conventions.md` → quy ước code cụ thể (SQLModel, datetime, SAEnum...).
> - `lessons-learned.md` → bug đã gặp & cách tránh.
> - File này → *vì sao* code được tổ chức như vậy (tư duy thiết kế).

---

## Dependency Inversion + Dependency Injection (Ports & Adapters)

**Đây là pattern nền tảng cho mọi external client trong backend** (`StorageClient`, `BackgroundRemovalClient`, ...).

### Nguyên tắc

Module cấp cao (**service**) phụ thuộc vào **trừu tượng** (interface ABC), không phụ thuộc vào **cái cụ thể** (implementation). Việc *chọn* implementation nào được đẩy ra ngoài cùng — vào router (composition root).

```
Service  ──phụ thuộc──▶  StorageClient (ABC, "port")
                              ▲
                              │ implements
              ┌───────────────┴───────────────┐
   SupabaseStorageClient (adapter thật)   FakeStorage (adapter test)
```

### Code trong repo

**Bước 1 — định nghĩa "port" (ABC).** Chỉ khai báo *hợp đồng*: một storage client phải có những method gì, không có code thật. Dùng `abc.ABC` + `@abstractmethod`:

```python
# backend/core/storage.py
from abc import ABC, abstractmethod

class StorageClient(ABC):
    """Abstract interface for object storage — swap implementation without touching service layer."""

    @abstractmethod
    async def upload(
        self, bucket: str, path: str, content: bytes, content_type: str, upsert: bool = False
    ) -> str: ...

    @abstractmethod
    async def download(self, bucket: str, path: str) -> bytes: ...

    @abstractmethod
    async def get_signed_url(self, bucket: str, path: str, expires_in: int = 3600) -> str: ...

    @abstractmethod
    async def delete(self, bucket: str, path: str) -> None: ...
```

`@abstractmethod` ép buộc: lớp con **bắt buộc** override hết, nếu thiếu một method thì Python raise `TypeError` ngay lúc khởi tạo → không thể quên.

**Bước 2 — viết "adapter" (implementation thật).** Kế thừa ABC, điền code gọi Supabase:

```python
# backend/core/storage.py
import httpx

class SupabaseStorageClient(StorageClient):
    """Supabase Storage REST API implementation. Uses service role key for server-side access."""

    def __init__(self, supabase_url: str, service_role_key: str):
        self._base = f"{supabase_url}/storage/v1"
        self._headers = {"Authorization": f"Bearer {service_role_key}", "apikey": service_role_key}

    async def upload(self, bucket, path, content, content_type, upsert=False) -> str:
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{self._base}/object/{bucket}/{path}", content=content, ...)
            resp.raise_for_status()
        return f"{bucket}/{path}"
    # ... các method còn lại
```

**Bước 3 — service phụ thuộc interface.** Chỉ khai báo **interface** — không quan tâm đằng sau là Supabase, S3 hay mock:

```python
# backend/items/service.py
class ItemService:
    def __init__(self, session, repo, storage: StorageClient, arq):
        self._storage = storage   # chỉ biết "một thứ tuân theo hợp đồng StorageClient"
```

**Bước 4 — router (composition root)** là nơi **duy nhất** chọn implementation cụ thể:

```python
# backend/items/router.py
def _make_service(session: SessionDep, arq: ArqDep) -> ItemService:
    repo = ItemRepository(session)
    storage = SupabaseStorageClient(...)        # chọn adapter cho môi trường thật
    return ItemService(session, repo, storage, arq)

ServiceDep = Annotated[ItemService, Depends(_make_service)]
```

`SupabaseStorageClient` **là một** `StorageClient` (nhờ kế thừa ABC) → truyền vào hợp lệ.

### Vì sao làm vậy

- **Test sạch**: unit test truyền `FakeStorage(StorageClient)` → không cần Supabase thật, không gọi mạng, không cần credential.
- **Đổi vendor rẻ**: chuyển sang S3 chỉ sửa **1 dòng** trong `_make_service`; service không đổi.
- **Tách biệt rõ vai trò**: service lo business logic, không dính chi tiết hạ tầng.

### Composition root: vì sao `_make_service` chỉ nhận 2 tham số mà service cần 4

4 dependency của service đến từ 2 nguồn:

| Dependency | Nguồn | Lý do |
|---|---|---|
| `session`, `arq` | **FastAPI inject** (là tham số hàm) | Có vòng đời gắn với request/app lifecycle — không thể `new` tay |
| `repo`, `storage` | **`_make_service` tự tạo** | Chỉ cần `session` + `settings` là dựng được; không cần FastAPI |

`repo` được tạo ngay trong hàm với **cùng `session`** mà service dùng → đảm bảo cùng một transaction boundary.

### Đặt tên để khỏi nhầm với Strategy

Cơ chế giống Strategy Pattern (interface + nhiều implementation + composition), nhưng **intent khác**:

- **Ports & Adapters (cái này)**: cô lập *hạ tầng*. Đời thật chạy 1 adapter, các bản khác là mock. → đặt tên `...Client`, `...Gateway`, `...Repository`.
- **Strategy**: đổi *thuật toán/hành vi nghiệp vụ*, thường swap lúc runtime. → đặt tên `...Strategy`, `...Policy`.

**Quy tắc:** thấy class hạ tầng có ABC → mặc định nó theo Ports & Adapters. Inject interface vào service, instantiate adapter ở composition root (router), không bao giờ `new` adapter bên trong service.

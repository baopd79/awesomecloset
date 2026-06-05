# Architecture Patterns

Các pattern & nguyên tắc thiết kế dùng trong codebase. Mỗi section là một khái niệm độc lập — có pattern mới thì thêm `###` mới, đừng tách file lẻ.

> Phân biệt với các doc khác:
> - `backend-conventions.md` → quy ước code cụ thể (SQLModel, datetime, SAEnum...).
> - `lessons-learned.md` → bug đã gặp & cách tránh.
> - File này → *vì sao* code được tổ chức như vậy (tư duy thiết kế).

---

## 3 trục: Folder structure vs Application architecture vs Domain modeling

Một nhầm lẫn rất phổ biến: gộp "cách tổ chức folder", "kiến trúc ứng dụng" và "cách mô hình domain" làm một. Thực ra đây là **3 trục độc lập (orthogonal)** — chọn ở trục này không quyết định trục kia. Câu hỏi "project dùng architecture nào" vì thế có *3 câu trả lời* tuỳ đang hỏi trục nào.

| Trục | Trả lời câu hỏi | Các lựa chọn |
|---|---|---|
| **1. Folder structure** (tổ chức file) | Xếp file *vật lý* ở đâu? | Layer-based · Feature-based · Vertical Slice |
| **2. Application architecture** (kiến trúc phụ thuộc) | Quy tắc *phụ thuộc & ranh giới* giữa các phần? | N-Layer · Hexagonal (Ports & Adapters) · Clean/Onion |
| **3. Domain modeling** (phương pháp thiết kế) | Mô hình *nghiệp vụ* thế nào? | DDD · Transaction Script · Anemic model |

Có thể làm Clean Architecture với folder layer-based *hoặc* feature-based — cùng một kiến trúc, hai cách xếp file. Đổi cách xếp folder không làm đổi kiến trúc phụ thuộc.

### 2 cái bẫy từ ngữ gây nhầm

**Bẫy 1 — "Layer-based folder" ≠ "N-Layer architecture".** Trùng chữ "layer" nhưng khác trục:

- *Layer-based folder* (trục 1) = gom file theo vai trò kỹ thuật: `controllers/`, `services/`, `repositories/`.
- *N-Layer architecture* (trục 2) = quy tắc tầng A chỉ gọi tầng B, một chiều — **không** quan tâm file nằm folder nào.

→ Hoàn toàn có thể chạy N-Layer architecture *bên trong* folder feature-based (chính là cách project này làm).

**Bẫy 2 — DDD không thuộc trục 2.** DDD hay bị xếp chung nhóm với "N-Layer, Clean, Hexagonal", nhưng nó **không phải application architecture** mà là *phương pháp mô hình domain* (trục 3), vuông góc với kiến trúc. Vì khác trục nên người ta thường ghép **Hexagonal + DDD** — chúng bổ sung cho nhau, không thay thế nhau.

### Project này đứng ở đâu trên mỗi trục

```
Trục 1 (folder)        → Feature-based / Vertical Slice
                          items/, outfits/ — mỗi feature đủ tầng {models,repo,service,router,schemas}

Trục 2 (architecture)  → N-Layer + Ports & Adapters cho hạ tầng
                          Router→Service→Repo→Model; ABC cho storage/AI (xem section Ports & Adapters)

Trục 3 (domain model)  → KHÔNG DDD; Anemic model + Transaction Script
                          SQLModel chỉ chứa field, business logic nằm ở service
```

### Hình dung trực giác

- **Folder structure** = cách *sắp đồ vào ngăn tủ* (theo loại: áo / quần — hay theo bộ: set đi làm / đi chơi).
- **Application architecture** = *quy tắc đường đi* trong nhà (phòng nào nối phòng nào, một chiều hay hai chiều).
- **Domain modeling** = *bản thiết kế ngôi nhà phản ánh nhu cầu sống thật* tới mức nào.

Ba thứ độc lập: đổi cách xếp tủ không làm đổi sơ đồ phòng.

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

---

## Transaction boundary qua helper (không để service tự `commit`)

**Service sở hữu ranh giới transaction, nhưng không tự gọi `commit()`/`rollback()` rải rác** — bọc đoạn ghi DB trong context manager `transaction(self._session)`. Repository chỉ `flush()` + `refresh()`, không bao giờ commit.

### Nguyên tắc

Một thao tác nghiệp vụ thường gồm 2 loại bước có tính chất **trái ngược**:

| Loại | Ví dụ | Tính chất |
|---|---|---|
| **Atomic, reversible** | insert/update nhiều bảng | rollback được → phải nằm *trong* transaction |
| **Side-effect bất khả nghịch** | enqueue ARQ job, gọi API ngoài, xoá file storage | rollback **không** undo được → phải nằm *ngoài* transaction, sau khi commit chắc chắn |

Helper `transaction()` biến ranh giới giữa hai loại này thành **một khối `with` nhìn thấy bằng mắt**, đồng thời gom logic commit/rollback vào một chỗ để không method nào quên.

### Code trong repo

**Bước 1 — helper.** Commit khi thoát sạch, rollback + re-raise khi có exception ([`core/database.py`](../backend/core/database.py)):

```python
@asynccontextmanager
async def transaction(session: AsyncSession):
    # Commits on clean exit, rolls back on any exception.
    try:
        yield
        await session.commit()
    except Exception:
        await session.rollback()
        raise
```

`get_db` yield session **không** có transaction đang mở — ranh giới do service quản qua helper, không dùng `async with session.begin()` (xung đột asyncpg autobegin).

**Bước 2 — repository chỉ flush + refresh, không commit.** `flush()` đẩy data xuống DB và lấy về id/default/trigger; `refresh()` nạp lại object → caller có object đầy đủ **trước** commit ([`items/repository.py`](../backend/items/repository.py)):

```python
async def create(self, item: ClothingItem) -> ClothingItem:
    self._session.add(item)
    await self._session.flush()
    await self._session.refresh(item)
    return item
```

**Bước 3 — service bọc ghi DB trong `with`, đặt side-effect bất khả nghịch NGOÀI khối** ([`items/service.py`](../backend/items/service.py)):

```python
try:
    async with transaction(self._session):
        item = await self._repo.create(item)   # commit đóng ở cuối khối
except Exception:
    try:
        await self._storage.delete(BUCKET, storage_path)  # dọn file đã upload, best-effort
    except Exception:
        pass
    raise

# Side-effect KHÔNG reversible — chỉ chạy sau khi DB commit chắc chắn:
try:
    await self._arq.enqueue_job("process_item", str(item.id), _job_id=_job_id(item.id))
except Exception as exc:
    async with transaction(self._session):                 # enqueue lỗi → đánh dấu failed để retry
        await self._repo.update_status(item, ProcessingStatus.failed, error=str(exc))
    raise
```

Vì repo đã `flush()`, ta dùng được `item.id` ngay trong/sau khối mà không cần đợi commit.

### So sánh: vì sao KHÔNG để service tự `commit()`

Pattern phổ biến khác — service tự gọi `commit`/`refresh` inline:

```python
# ❌ Pattern service tự commit
created = await self.property_repo.create(prop)
for r in rooms_data:
    await self.room_repo.create(Room(**r.model_dump(), property_id=created.id))
await self.session.commit()        # nếu vòng for lỗi → dòng này không chạy
await self.session.refresh(created)
```

| Điểm yếu của pattern tự-commit | Pattern helper của project |
|---|---|
| **Thiếu rollback.** Lỗi giữa chừng → `commit` bị skip, session còn transaction dở (asyncpg autobegin) → request sau dùng lại connection đó dính lỗi *"transaction already in progress"*. Phải tự thêm `try/except/rollback` ở **mọi** method, dễ quên. | Rollback nằm trong helper → **không thể quên**, mọi method đồng nhất. |
| **Ranh giới atomic mờ.** `commit()` là một dòng lẫn giữa thân hàm; khó nhìn ra "đoạn nào atomic", dễ vô tình đặt side-effect (enqueue/gọi API) **trước** commit. | Khối `with` vẽ ranh giới rõ; side-effect bất khả nghịch buộc nằm ngoài khối → đúng thứ tự. |
| **`refresh` sau commit = thừa round-trip + I/O ngoài ranh giới.** | `refresh` trong repo (sau `flush`, trước commit) → object đủ data sớm, không tốn round-trip thừa. |
| **Repo và service tranh nhau quyền commit** → không rõ ai sở hữu transaction. | Repo thuần query (`flush`/`refresh`); service sở hữu ranh giới. Vai trò tách bạch. |

### Vì sao làm vậy

- **Không thể quên rollback** → tránh nguyên một lớp bug "transaction dở dang" trên asyncpg.
- **Phân định reversible vs bất khả nghịch** thành cấu trúc code nhìn thấy được, không phải quy ước ngầm.
- **Repo có thể tái dùng** trong nhiều transaction khác nhau vì nó không tự đóng transaction — service ghép nhiều thao tác repo vào *một* `with` khi cần atomic chung.

**Quy tắc:** ghi DB → bọc trong `async with transaction(self._session)`. Repo chỉ `flush`/`refresh`, không `commit`. Side-effect bất khả nghịch (ARQ, API ngoài, xoá storage) đặt **sau** khối, kèm xử lý lỗi để user retry được. Không bao giờ `async with session.begin()`.

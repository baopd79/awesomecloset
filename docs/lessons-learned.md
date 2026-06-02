# Lessons Learned

## Backend

### Signed URL mutation bug — SQLAlchemy dirty fields

**Bối cảnh:** `_sign_items` mutate `thumbnail_url`/`processed_url` trực tiếp trên SQLAlchemy-tracked objects. Các write methods (`update_tags`, `archive_item`, ...) gọi `get_item` (có sign) rồi flush → signed URL bị persist vào DB.

**Hệ quả:** Lần fetch tiếp theo sign một URL đã-signed → double-signed URL → ảnh broken ngay lập tức.

**Fix:** Tách internal fetch (`_get_or_raise`, không sign) khỏi public fetch (`get_item`, có sign). Sign URLs chỉ sau khi mọi flush đã xong.

**Rule:** Không mutate SQLAlchemy-tracked objects với giá trị có TTL hoặc ephemeral trước khi flush.

---

### Python built-in shadowing — `type` as parameter name

**Bối cảnh:** Dùng `type` làm tên tham số cho filter `ClothingType` ở repo/service/router.

**Vấn đề:** `type` là Python built-in. Shadow nó trong function scope không gây crash (trừ khi gọi `type()` bên trong), nhưng ruff rule `A002` flag, và dễ gây nhầm lẫn.

**Fix:** Đổi tên thành `item_type` ở repo và service (internal Python calls). Riêng router là HTTP boundary — dùng `Query(alias="type")` để giữ API contract `?type=shirt` cho client.

**Rule:** Tên tham số ở service/repo là Python convention → tránh built-in. Tên query param HTTP là API contract → dùng `alias=` ở router để decouple.

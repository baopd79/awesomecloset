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

---

## Workers / Background jobs (ARQ)

### Deterministic job_id + ARQ `keep_result` (1h) → item kẹt `pending`

**Bối cảnh:** Mọi job enqueue với id cố định `process_item:{item_id}` (để dedup an toàn giữa upload, retry, recovery). ARQ mặc định `keep_result = 3600s`: sau khi job xong (kể cả `failed`), nó lưu key `arq:result:process_item:{item_id}` trong 1 giờ.

**Vấn đề:** `enqueue_job` coi job là "đã tồn tại" nếu **job key HOẶC result key** còn — `if pipe.exists(job_key, result_key + job_id): return None`. Nên trong 1h sau khi job hoàn tất, mọi re-enqueue cùng id (bấm **Thử lại**, hoặc **recovery**) bị **bỏ qua âm thầm**: status đổi `pending` nhưng **không có job nào chạy** → item kẹt `pending` mãi.

**Fix:** `func(process_item, ..., keep_result=0)` — ta không bao giờ đọc ARQ result (trạng thái nằm ở DB), nên bỏ result key đi. Dedup khi job đang chạy vẫn giữ qua job key. Có regression test `test_process_item_does_not_keep_results`.

**Rule:** Nếu dùng deterministic job_id để dedup mà trạng thái nguồn-chân-lý nằm ở DB (không đọc ARQ result) → đặt `keep_result=0`, nếu không result key biến thành "khóa cooldown 1h" chặn retry/recovery.

---

### Orphan recovery chỉ `on_startup` không đủ → cần cron định kỳ

**Bối cảnh:** `_recover_orphaned` (re-enqueue item kẹt >10' ở pending/removing_bg/tagging) ban đầu chỉ chạy trong `on_startup`.

**Vấn đề:** Job hết `max_tries` rớt khỏi queue → không ai enqueue lại trừ khi worker **restart**. Item nằm ở tủ đồ (UI) nhưng không có job nào chạy → không bao giờ tiến tới `failed`, kẹt vô thời hạn.

**Fix:** Thêm `cron_jobs = [cron(_recover_orphaned, minute=set(range(0,60,5)), run_at_startup=False)]` — quét mỗi 5'. Kết hợp logic "hết tries vì rate-limit → set `failed`" (failed ∉ orphan statuses) nên không lặp vô hạn. Regression test `test_orphan_recovery_runs_periodically`.

**Rule:** Self-healing cho stuck jobs phải định kỳ (cron), không chỉ startup. Và phải có điều kiện thoát (terminal `failed`) để khỏi quét-lại-mãi.

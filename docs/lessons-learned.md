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

### Thêm cột `NOT NULL` mà đường-đọc lọc theo → phải sửa seed/fixture test

**Bối cảnh:** Thêm `tag_status` (NOT NULL default `untagged`); gate/suggest đổi sang lọc `tag_status = tagged`.

**Vấn đề:** Seed integration của suggest tạo item `ready` + có `type` nhưng **không set `tag_status`** → rơi vào default `untagged` → gate đếm 0 → test gãy dù code đúng.

**Fix:** Seed set `tag_status=TagStatus.tagged` (phản ánh thực tế: ready + có type thì pipeline đã tagged).

**Rule:** Khi thêm cột mà đường-đọc lọc theo, rà **mọi seed/fixture/factory** tạo data trực tiếp (bỏ qua đường-ghi thật) để set giá trị đúng — nếu không test đỏ vì default, không phải vì logic.

---

### Soft-delete → audit mọi đường đọc + consumer xử lý `None`

**Bối cảnh:** `DELETE /items/{id}` là soft-delete (set `deleted_at`, row vẫn còn, storage không dọn).

**Vấn đề:** Item bị xoá vẫn được tham chiếu nơi khác — outfit chứa nó, wear log, suggest, analytics.

**Fix:** Mọi query lọc `deleted_at IS NULL`; consumer chịu được item biến mất — outfit hydrate qua `get_by_id` (trả `None`) → render slot trống, không crash; wear log bỏ qua item đã xoá; suggest/analytics lọc sẵn.

**Rule:** Thêm soft-delete = audit **toàn bộ** đường đọc + đảm bảo consumer xử lý `None` mượt (graceful gap), không giả định row luôn tồn tại.

---

## Architecture & deploys

### Mô hình status 2 chiều — đừng nhồi 1 enum

**Bối cảnh:** Cần biểu diễn "đã gắn thẻ chưa" bên cạnh "đã xử lý xong chưa" (`processing_status`). Định thêm value vào enum cũ.

**Vấn đề:** Nhồi 1 enum làm lẫn 2 vòng đời độc lập. VD lỗi gắn thẻ → đặt `failed` thì món "hỏng" dù ảnh đã tách nền OK (vẫn dùng được).

**Fix:** Tách `tag_status` (untagged/tagging/tagged/tag_failed) ⊥ `processing_status`, bất biến `tagged ⟺ type≠null`. Lỗi gắn thẻ chỉ đổi `tag_status`, món vẫn `ready`.

**Rule:** Hai vòng đời độc lập (usable vs enriched) → hai cột riêng. Đừng để lỗi/biến đổi của chiều này làm "hỏng" chiều kia.

---

### Thứ tự deploy: ship "consumer-tolerance" TRƯỚC khi lật producer

**Bối cảnh:** Đổi pipeline upload (producer): ngừng auto-tag → sinh ra item `ready` + `untagged`. Gate/suggest (consumer) trước đó đếm theo `ready`.

**Vấn đề:** Nếu lật producer trước → item untagged lọt vào pool gợi ý rác / cổng 15 tăng sai.

**Fix:** Tách thành 2 PR/deploy: PR đổi consumer đếm `tagged` **trước** (lúc đó **no-op** vì mọi ready đều tagged), PR lật producer **sau** (giờ item untagged đã bị loại sẵn).

**Rule:** Đổi cả producer + consumer của một bất biến → ship phần consumer "chịu được trạng thái mới" trước, lật producer sau. Bước trung gian là no-op nhưng làm mỗi deploy độc lập-an-toàn.

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

---

### Một ARQ job ôm 2 việc nặng độc lập → tách theo "đơn vị retry"

**Bối cảnh:** `_run_pipeline` (job `process_item`) làm liền mạch: tách nền (rembg, local, nặng CPU/RAM) → upload processed/thumbnail → **Gemini tagging** (external, tốn phí, rate-limited) → `ready`.

**Vấn đề:** Hai bước có **hồ sơ cost / lỗi / retry khác hẳn** bị buộc chung 1 job:
- Retry vì lỗi tagging (429) **chạy lại cả tách nền** — tốn CPU/RAM trên worker 1GB dù bg đã xong.
- Không đặt được retry policy riêng (bg: retry thoải mái; tagging: defer theo rate-limit rồi bỏ).
- Không thể làm 1 bước on-demand còn 1 bước auto.
- Lỗi tagging làm cả item rớt `failed` dù ảnh đã tách nền OK.

**Fix:** Tách `process_item` (chỉ bg → `ready`) + job riêng `tag_item` (Gemini, on-demand qua `POST /items/{id}/tag`). Mỗi job có trigger, retry policy, terminal-state riêng. Lợi: tagging thành on-demand, re-tag không chạy lại bg, lỗi tagging không đụng kết quả bg.

**Rule:** Đừng nhồi 2 bước nặng & độc lập (khác cost / external-dependency / retry-policy) vào 1 background job. Tách theo **"đơn vị retry"** — mỗi bước mà fail-and-retry riêng được thì là 1 job riêng.

---

### On-demand tự diệt vòng auto-retry đốt quota; terminal-state tùy trạng thái trước đó

**Bối cảnh:** Auto-tag trong pipeline + orphan recovery → khi Gemini hết quota ngày (429), item kẹt bị re-enqueue mãi → đốt quota (saga #36/#37).

**Vấn đề:** Vòng lặp **tự-retry + external rate-limited/tốn phí = đốt tài nguyên** không kiểm soát.

**Fix:** Chuyển tagging sang **on-demand** (`POST /tag`, user kích) → không còn ai auto-retry → hết vòng. Terminal-state phân nhánh theo `had_tags`: first-tag fail → `tag_failed`; re-tag fail → **giữ `tagged`** (thẻ cũ còn nguyên, món vẫn dùng được).

**Rule:** (a) Đừng auto-recover bước phụ thuộc external rate-limited/tốn phí — để user kích. (b) Cùng một `except` path có thể cần terminal-state khác nhau tùy đã có dữ liệu hợp lệ trước đó hay chưa.

# Implementation Plan: AwesomeCloset

## Overview

Build một AI personal closet app mobile-first cho người dùng Việt Nam. Core loop: chụp ảnh đồ → AI remove-bg + tag → digital closet → AI suggest outfit theo thời tiết + hoàn cảnh mỗi sáng. Stack: React Native (Expo) + FastAPI + Supabase + Gemini Flash + ARQ/Redis.

## Progress (cập nhật 2026-06-07)

| Task | Mô tả | Trạng thái |
|---|---|---|
| 0 | Git + CI | ✅ #3 |
| 1 | DB migrations + RLS + storage | ✅ #4 |
| 2 | Backend core | ✅ #5 |
| 3 | ARQ worker skeleton | ✅ #6 |
| 4 | Items upload + lifecycle | ✅ #7 |
| 5 | rembg pipeline | ✅ #11 |
| 6 | Mobile auth + navigation | ✅ #14 |
| 7 | Mobile upload flow | ✅ #15 |
| 8 | Gemini tagging | ✅ #12 |
| 9 | Closet API | ✅ #16 |
| 10 | Closet UI | ✅ #17 |
| 11 | Outfits + collage | ✅ #21 |
| 12 | Wear logging + feedback | ✅ #22 |
| 13 | Weather endpoint (`GET /api/suggest/weather`) | ✅ #20 |
| 14 | Suggest endpoint + cache | ✅ #24 |
| 15 | Home + Outfit UI | ✅ #25 |
| 16 | Analytics (server-side + UI) | ✅ #26 |
| 17 | Gamification + Onboarding | ✅ #27 |
| 22 | Profile + Archive (Extras) | ✅ #28 |
| 23 | Outfit Save + Manual Builder | ✅ #25 |
| 18–21 | Push, deploy, EAS | ⏳ |

**Post-MVP / hardening (sau bảng task gốc)** — xem [Amendments](#amendments-post-mvp) cuối file:
- CI: ci-backend + ci-mobile (#29).
- Worker stability: OOM (u2netp + tắt onnx arena), Gemini 429, job dedup/keep_result, cron orphan recovery (#32–37).
- Mobile lifecycle: queue auto-collapse + delete item + retry-stuck + badge MỚI (#38); UI sửa thẻ `PATCH` (#39).
- **Split-flow gắn thẻ on-demand** (#40–43): `tag_status`; gate/suggest đếm `tagged`; tách `process_item` (bg) + `tag_item` (Gemini on-demand) + `POST /items/{id}/tag`; mobile UI on-demand.

> ⚠️ Các thay đổi post-MVP làm một số tiêu chí Task 5/7/8 bên dưới **không còn đúng** (pipeline upload giờ dừng ở `ready`, không auto-tag). Tiêu chí gốc giữ làm bản ghi lịch sử; hành vi hiện tại ở mục Amendments.

## Git Workflow

**Branch naming** — type prefix (Conventional Commits) + task number:
```
chore/  — setup, config, infra (không ảnh hưởng logic)
feat/   — tính năng mới
fix/    — bug fix
refactor/ — refactor không thêm feature
```

Map với PLAN.md:
```
chore/0-git-ci-setup
chore/1-db-migrations
chore/2-backend-core
chore/3-arq-worker
feat/4-items-upload
feat/5-rembg-pipeline
feat/6-mobile-auth
feat/7-mobile-upload
feat/8-gemini-tagging
feat/9-closet-api
feat/10-closet-ui
feat/11-outfits
feat/12-wear-logging
feat/13-weather
feat/14-suggest
feat/15-suggest-ui
feat/16-analytics
feat/17-gamification
feat/18-push-notifications
chore/19-deployment-cd
chore/20-quality-sweep
chore/21-eas-build
```

**Luồng mỗi task:**
```
Bạn: "Bắt đầu Task N"
  → Tôi: tạo branch, viết code, chạy test, báo cáo kết quả
  → Bạn: review diff trong IDE, feedback nếu cần
  → Bạn: git push + merge PR (tôi không tự push trừ khi được yêu cầu)
  → CI pass → merge → CD deploy (từ Phase 4)
```

**Quy tắc:**
- Không push thẳng lên `main` — chỉ merge qua PR
- PR không merge được nếu CI fail
- 1 task = 1 branch = 1 PR

---

## Dependency Graph

```
Git repo + CI (GitHub Actions)
    └── DB Schema + Enums + RLS
            └── core/ (database, exceptions, config, DI, logging)
                    └── ARQ + Redis worker skeleton
                            ├── items feature (upload → rembg → tagging)
                            │       └── Digital Closet UI
                            │               └── outfits feature (outfit_items, collage, wear log)
                            │                       └── suggest feature (weather + Gemini + cache)
                            │                               └── gamification UI + analytics
                            └── Mobile auth + navigation
```

---

## Task 0: Git Setup + CI Pipeline

**Description:** Khởi tạo git repo, branch protection, `.gitignore`, và GitHub Actions CI pipeline. CI chạy backend tests + mobile type check trên mỗi PR — chỉ chạy job liên quan đến code thay đổi. Setup một lần trước tất cả tasks, không phụ thuộc vào tech stack cụ thể.

**Acceptance criteria:**
- [x] Git repo khởi tạo, `main` branch protected — không push trực tiếp, chỉ merge qua PR
- [x] `.gitignore` cover: Python (`__pycache__/`, `.env`, `.venv/`, `*.pyc`), Expo (`node_modules/`, `.expo/`, `ios/`, `android/`, `.env.local`), general (`.DS_Store`, `*.log`)
- [x] `.env.example` commit với tất cả required env vars (không có giá trị thật)
- [x] `pyproject.toml` với `[project]` dependencies + `[project.optional-dependencies] dev` — quản lý bằng `uv`
- [x] GitHub Actions — job `ci-backend`: chạy khi `backend/**` hoặc `tests/**` thay đổi
  - `uv run ruff check backend/` — lint
  - `uv run pytest tests/ --tb=short` — toàn bộ tests
- [x] GitHub Actions — job `ci-mobile` (thêm lại ở `chore/ci-mobile`, sau khi Expo project có code)
  - `npm run ts` (`tsc --noEmit`) — TypeScript strict check
  - ⏳ eslint — **chưa setup** (mobile chưa có eslint config/dep); tách follow-up riêng
- [x] PR không merge được nếu CI fail (branch protection rule)

**Verification:**
- [x] Push branch với `print("debug")` trong Python → ruff fail → PR blocked
- [x] Push branch với `const x: any = 1` trong TypeScript → tsc fail → PR blocked
- [x] Push branch với test fail → pytest fail → PR blocked
- [ ] Path filter per-job — **chưa làm**: cả `ci-backend` lẫn `ci-mobile` chạy mọi PR (đơn giản, repo 2-job). Thêm `dorny/paths-filter` nếu CI chậm.

**Dependencies:** None

**Files likely touched:**
- `.gitignore`
- `.env.example`
- `.github/workflows/ci.yml`

**Estimated scope:** S

---

## Phase 1 — Foundation

---

### Task 1: DB Migrations, Enums, RLS

**Description:** Tạo toàn bộ DB schema trên Supabase: taxonomy enums, tất cả tables, indexes, RLS policies, storage bucket config. Đây là foundation — mọi task khác phụ thuộc vào đây.

**Acceptance criteria:**
- [x] 7 taxonomy enums tồn tại: `clothing_type`, `clothing_style`, `clothing_season`, `clothing_occasion`, `processing_status`, `feedback_action`, `outfit_item_role`
- [x] 8 tables tồn tại với đúng columns + FK + constraints theo spec Section 4
- [x] `users.id` references `auth.users(id) ON DELETE CASCADE`
- [x] `outfit_items` có `PRIMARY KEY(outfit_id, item_id)`, `ON DELETE RESTRICT` trên `item_id`
- [x] `daily_suggestion_cache` có `UNIQUE(user_id, suggestion_date, context_hash)`
- [x] Index tối thiểu được tạo: `clothing_items(user_id, is_archived, deleted_at)`, `clothing_items(user_id, type)`, `outfit_items(item_id)`, `outfits(user_id, created_at)`, `wear_logs(user_id, worn_date)`
- [x] RLS enabled trên tất cả tables — user chỉ SELECT/INSERT/UPDATE/DELETE rows của mình
- [x] Storage bucket `closet-images` tạo với private access

**Verification:**
- [x] `supabase db push` không có lỗi
- [x] Query `SELECT * FROM clothing_items` với user không đúng trả 0 rows (RLS hoạt động)
- [ ] Thử insert `clothing_items` với `type = 'invalid'` → constraint error

**Dependencies:** None

**Files likely touched:**
- `supabase/migrations/001_enums.sql`
- `supabase/migrations/002_tables.sql`
- `supabase/migrations/003_indexes.sql`
- `supabase/migrations/004_rls.sql`
- `supabase/migrations/005_storage.sql`

**Estimated scope:** M

---

### Task 2: Backend Core Setup

**Description:** Khởi tạo FastAPI project với toàn bộ `core/` layer: database session, `transaction()` helper, `AppException` hierarchy, DI factory, config via pydantic-settings, loguru structured logging. Đây là shared foundation cho tất cả features.

**Acceptance criteria:**
- [x] `get_db()` yield `AsyncSession` không begin transaction
- [x] `transaction(session)` async context manager: commit on success, rollback on exception
- [x] `AppException(code, status, **extra)` raise được từ service, router translate sang HTTP response đúng format
- [x] `Settings` load từ `.env` qua pydantic-settings — app fail fast nếu thiếu required env var
- [x] loguru log mỗi request với `request_id`, `user_id`, method, path, status code, duration
- [x] `GET /health` trả `{"status": "ok"}`

**Verification:**
- [x] `pytest tests/test_core.py` pass
- [x] Raise `AppException(code="TEST", status=404)` trong router → response `{"code": "TEST"}` với status 404
- [x] `uv run uvicorn backend.main:app` khởi động không lỗi

**Dependencies:** Task 1 (DB connection string từ Supabase)

**Files likely touched:**
- `backend/main.py`
- `backend/core/database.py`
- `backend/core/exceptions.py`
- `backend/core/dependencies.py`
- `backend/core/config.py`
- `backend/core/logging.py`
- `tests/test_core.py`

**Estimated scope:** M

---

### Task 3: ARQ Worker + Redis Setup

**Description:** Setup ARQ background job worker chạy process riêng cùng codebase với API. Worker nhận jobs từ Redis queue, xử lý rembg + Gemini tagging. Task này chỉ setup skeleton — logic rembg/Gemini sẽ ở Task 5 và Task 8.

**Acceptance criteria:**
- [ ] `arq backend.workers.main.WorkerSettings` khởi động không lỗi
- [ ] Job `process_item` enqueue được từ API, worker nhận và log job id
- [ ] Job failed → retry 3 lần với exponential backoff
- [ ] Worker cùng đọc `Settings` từ `core/config.py`
- [ ] Redis connection string config qua env var `REDIS_URL`

**Verification:**
- [ ] Chạy `arq backend.workers.main.WorkerSettings` + enqueue 1 job test → log xuất hiện ở worker
- [ ] Kill worker giữa chừng → job requeue khi worker restart

**Dependencies:** Task 2

**Files likely touched:**
- `backend/workers/main.py`
- `backend/workers/tasks.py`
- `backend/core/config.py` (thêm REDIS_URL)

**Estimated scope:** S

---

### Task 4: Items Feature — Upload + Processing Lifecycle

**Description:** API nhận ảnh upload, lưu vào Supabase Storage, tạo `clothing_items` record với `processing_status = pending`, enqueue ARQ job. Frontend poll hoặc dùng Supabase Realtime để track status. Bao gồm đầy đủ CRUD + retry endpoint.

**Acceptance criteria:**
- [ ] `POST /api/items/upload` nhận multipart file, resize/compress trước khi lưu, trả `202 Accepted` với `item_id`
- [ ] `clothing_items` record tạo với `processing_status = pending`
- [ ] `GET /api/items` trả list items của user hiện tại (exclude `deleted_at IS NOT NULL`), support filter `type`, `occasion`, `season`, `is_archived`
- [ ] `GET /api/items/{id}` trả item detail + `processing_status` + `processing_error`
- [ ] `PATCH /api/items/{id}/tags` update `type`, `style`, `season`, `occasion`, `custom_tags` + set `updated_at`
- [ ] `DELETE /api/items/{id}` set `deleted_at = now()` (soft delete)
- [ ] `POST /api/items/{id}/retry` re-enqueue job nếu `processing_status = failed`
- [ ] RLS: user chỉ thấy items của mình

**Verification:**
- [ ] `pytest tests/items/test_service.py` pass (unit: mock repo)
- [ ] `pytest tests/items/test_integration.py` pass (integration: real Postgres)
- [ ] Upload file > 10MB → 400 error
- [ ] GET items của user khác → 0 results

**Dependencies:** Task 2, Task 3

**Files likely touched:**
- `backend/items/router.py`
- `backend/items/service.py`
- `backend/items/repository.py`
- `backend/items/models.py`
- `backend/items/schemas.py`
- `tests/items/test_service.py`
- `tests/items/test_integration.py`
- `tests/conftest.py`

**Estimated scope:** L — nếu cần, tách Upload+CRUD thành 2 task riêng

---

### Task 5: rembg Pipeline trên ARQ Worker

> ⚠️ **Đã đổi (post-MVP):** dùng `u2netp` (không phải `u2net`) vì RAM; `process_item` giờ **dừng ở `ready`** sau tách nền — **không** còn nối bước tagging. Xem [Amendments](#amendments-post-mvp).

**Description:** ARQ worker nhận job `process_item`, chạy rembg `u2net` để remove background, lưu PNG transparent vào Storage, update `processing_status`. Fallback sang Remove.bg API nếu rembg fail. Mọi bước update `processing_status` để frontend track được.

**Acceptance criteria:**
- [ ] Worker nhận `item_id`, fetch original image từ Storage
- [ ] rembg xử lý → PNG transparent, lưu vào `processed_url`
- [ ] Tạo thumbnail 300px → lưu `thumbnail_url`
- [ ] `processing_status` update: `pending → removing_bg → tagging` (tagging là bước tiếp, Task 8)
- [ ] Nếu rembg fail → thử Remove.bg API (`REMOVEBG_API_KEY` từ env)
- [ ] Nếu cả hai fail → `processing_status = failed`, lưu `processing_error`
- [ ] `BackgroundRemovalClient` có interface để mock trong test

**Verification:**
- [ ] Upload ảnh áo trên nền trắng → `processed_url` là PNG transparent
- [ ] Upload ảnh background phức tạp → rembg fail → Remove.bg fallback hoạt động (nếu có key)
- [ ] `pytest tests/items/test_bg_removal.py` pass với mock client

**Dependencies:** Task 3, Task 4

**Files likely touched:**
- `backend/workers/bg_removal.py`
- `backend/workers/tasks.py`
- `tests/items/test_bg_removal.py`

**Estimated scope:** M

---

### Task 6: Mobile — Auth + Navigation

**Description:** Khởi tạo Expo project với Expo Router, setup Supabase Auth (email/password), màn hình login/register, tab navigation skeleton. Đây là shell của app mobile.

**Acceptance criteria:**
- [ ] `expo start` chạy không lỗi trên iOS simulator và Android emulator
- [ ] Register với email/password → tạo user trong Supabase Auth
- [ ] Login → navigate vào tab navigation
- [ ] Logout → về màn hình login
- [ ] Tab navigation: Home, Closet, Add, Analytics
- [ ] TypeScript strict mode, không có `any` type

**Verification:**
- [ ] Tạo account mới, login, logout thành công trên thiết bị thật
- [ ] `npx tsc --noEmit` không lỗi

**Dependencies:** Task 1 (Supabase project URL + anon key)

**Files likely touched:**
- `mobile/app/(auth)/login.tsx`
- `mobile/app/(auth)/register.tsx`
- `mobile/app/(tabs)/index.tsx`
- `mobile/app/(tabs)/closet.tsx`
- `mobile/app/(tabs)/add.tsx`
- `mobile/app/(tabs)/analytics.tsx`
- `mobile/lib/supabase.ts`
- `mobile/lib/api.ts`

**Estimated scope:** M

---

### Task 7: Mobile — Upload Flow

> ⚠️ **Đã đổi (post-MVP):** progress bỏ bước `tagging` (`uploading → removing_bg → ready`); thêm queue auto-collapse + dải "Vừa thêm" + delete/dismiss card (#38). Gắn thẻ chuyển sang on-demand ở item detail. Xem [Amendments](#amendments-post-mvp).

**Description:** Màn hình Add cho phép chụp ảnh qua camera in-app hoặc batch pick từ gallery. Ảnh được upload lên API, hiển thị progress indicator per item, và retry UI nếu fail. Subscribe Supabase Realtime để update processing status real-time.

**Acceptance criteria:**
- [ ] Camera permission chỉ xin khi user bấm chụp lần đầu
- [ ] Gallery permission chỉ xin khi user bấm chọn từ gallery
- [ ] Batch select tối đa 10 ảnh cùng lúc
- [ ] Mỗi ảnh hiển thị progress: uploading → removing_bg → tagging → ready / failed
- [ ] Status update real-time qua Supabase Realtime subscription
- [ ] Nút retry per item khi `processing_status = failed`

**Verification:**
- [ ] Upload 3 ảnh → tất cả chuyển `ready` sau khi worker xử lý
- [ ] Tắt mạng giữa upload → error state hiển thị, retry hoạt động
- [ ] Test trên iOS và Android thật

**Dependencies:** Task 4, Task 5, Task 6

**Files likely touched:**
- `mobile/app/(tabs)/add.tsx`
- `mobile/components/UploadQueue.tsx`
- `mobile/components/ItemProcessingCard.tsx`
- `mobile/hooks/useRealtimeItem.ts`
- `mobile/lib/api.ts`

**Estimated scope:** M

---

## ✅ Checkpoint Phase 1

- [ ] `pytest tests/items/` — tất cả unit + integration pass
- [ ] Upload flow end-to-end hoạt động trên thiết bị thật (upload → rembg → status = tagging)
- [ ] RLS verify: user A không thấy items của user B
- [ ] Auth flow hoạt động: register, login, logout

---

## Phase 2 — Core AI Loop

---

### Task 8: Gemini Vision Tagging

> ⚠️ **Đã đổi (post-MVP):** tagging **không** còn nối sau rembg. Giờ là job riêng `tag_item`, **on-demand** (kích `POST /items/{id}/tag`), ghi vào chiều `tag_status`; lỗi không làm hỏng món (vẫn `ready`). Xem [Amendments](#amendments-post-mvp).

**Description:** ARQ worker tiếp tục pipeline sau rembg: gửi `processed_url` (thumbnail) vào Gemini Vision để tag. Prompt truyền đầy đủ taxonomy enum values. Output JSON được validate — sai enum thì reject và log, không lưu partial data.

**Acceptance criteria:**
- [ ] Worker gửi thumbnail (không phải full-size) vào `GeminiClient`
- [ ] Prompt chứa danh sách enum values cho `type`, `style`, `season`, `occasion`
- [ ] Response JSON validate bằng Pydantic schema — field thiếu hoặc sai enum → `processing_status = failed`
- [ ] Tags được lưu vào `clothing_items`: `type`, `colors`, `style[]`, `season[]`, `occasion[]`
- [ ] `processing_status` update: `tagging → ready`
- [ ] Prompt snapshot test: nếu prompt thay đổi → test fail để review có chủ ý
- [ ] `GeminiClient` có interface để mock trong test

**Verification:**
- [ ] Upload ảnh áo thun trắng → `type = t_shirt`, `colors = [{hex: "#FFFFFF", ...}]`, `occasion` chứa ít nhất 1 giá trị hợp lệ
- [ ] `pytest tests/items/test_tagging.py` pass (mock Gemini)
- [ ] Gemini trả `"occasion": "office"` → reject, `processing_status = failed`

**Dependencies:** Task 5

**Files likely touched:**
- `backend/workers/ai_pipeline.py`
- `backend/items/prompts.py`
- `tests/items/test_tagging.py`

**Estimated scope:** M

---

### Task 9: Digital Closet API

**Description:** Hoàn thiện `GET /api/items` với đầy đủ filter, sort, full-text search trên tags. Bao gồm query chỉ trả items `ready` + không `deleted_at` khi cần.

**Acceptance criteria:**
- [ ] Filter by `type`, `occasion[]`, `season[]`, `is_archived`
- [ ] Sort by `created_at`, `last_worn_at`, `wear_count`
- [ ] Full-text search trên `custom_tags` (PostgreSQL `@>` array operator hoặc `ilike`)
- [ ] Pagination: `limit` + `cursor` (keyset, không dùng offset)
- [ ] Response bao gồm signed URL cho `thumbnail_url` (ngắn hạn, 1 giờ)

**Verification:**
- [ ] `pytest tests/items/test_integration.py` pass (filter, sort, search, pagination)
- [ ] Seed 20 items đa dạng → filter `occasion=work` trả đúng subset
- [ ] Signed URL expire sau 1 giờ

**Dependencies:** Task 4, Task 8

**Files likely touched:**
- `backend/items/repository.py`
- `backend/items/schemas.py`
- `tests/items/test_integration.py`

**Estimated scope:** S

---

### Task 10: Digital Closet UI

**Description:** Màn hình Closet hiển thị grid 2-3 cột, filter bar, item detail screen. Xử lý đầy đủ empty states: chưa có đồ, đang xử lý, xử lý lỗi. Swipe to archive.

**Acceptance criteria:**
- [ ] Grid 2-3 cột, ảnh `processed_url` trên nền xám nhạt
- [ ] Filter chips: type, occasion, season
- [ ] Tap item → item detail: ảnh full, tất cả tags, wear history
- [ ] Swipe left trên item → archive (soft: ẩn khỏi closet, không xóa)
- [ ] Empty state: chưa có đồ → CTA "Thêm đồ đầu tiên"
- [ ] Loading state per item: skeleton khi `processing_status != ready`
- [ ] Error state per item: icon lỗi + nút retry khi `processing_status = failed`

**Verification:**
- [ ] Test trên iOS + Android thật với 0, 5, 20 items
- [ ] Archive item → không còn xuất hiện trong grid
- [ ] Retry từ item detail hoạt động

**Dependencies:** Task 7, Task 9

**Files likely touched:**
- `mobile/app/(tabs)/closet.tsx`
- `mobile/app/item/[id].tsx`
- `mobile/components/ClosetGrid.tsx`
- `mobile/components/ItemCard.tsx`
- `mobile/components/FilterBar.tsx`

**Estimated scope:** M

---

### Task 11: Outfits — Tạo, Edit, Collage

**Description:** API tạo outfit với `outfit_items` (gồm `position` và `role`), generate collage ảnh bằng Pillow, endpoint edit items trong outfit.

**Acceptance criteria:**
- [ ] `POST /api/outfits` nhận `{name, occasion, items: [{item_id, role, position}]}` → tạo `outfits` + `outfit_items` rows trong 1 transaction
- [ ] Validate outfit có ít nhất 1 `top` hoặc 1 `bottom` role (cảnh báo, không block)
- [ ] Pillow generate collage từ `processed_url` của từng item, layout theo role (top trên, bottom dưới, shoes dưới cùng)
- [ ] `PATCH /api/outfits/{id}/items` cho phép thêm/bớt/reorder items
- [ ] `GET /api/outfits` trả list với `collage_url` (signed URL)

**Verification:**
- [ ] `pytest tests/outfits/test_service.py` pass (unit: mock repo + Pillow)
- [ ] `pytest tests/outfits/test_integration.py` pass
- [ ] Tạo outfit với item đang `processing_status = failed` → 400 error
- [ ] Xóa item đang có trong outfit → `ON DELETE RESTRICT` error

**Dependencies:** Task 8, Task 9

**Files likely touched:**
- `backend/outfits/router.py`
- `backend/outfits/service.py`
- `backend/outfits/repository.py`
- `backend/outfits/models.py`
- `backend/outfits/schemas.py`
- `backend/workers/collage.py`
- `tests/outfits/test_service.py`
- `tests/outfits/test_integration.py`

**Estimated scope:** L — tách Collage (Task 11b) nếu cần

---

### Task 12: Wear Logging + Suggestion Feedback

**Description:** Log khi user mặc outfit (tạo `wear_logs` với items_snapshot). Capture suggestion feedback vào `suggestion_feedback`. Cả hai cùng update denormalized fields (`wear_count`, `last_worn_at`) trên `clothing_items`.

**Acceptance criteria:**
- [ ] `POST /api/outfits/{id}/wear` tạo `wear_logs` với `items_snapshot` = snapshot items tại thời điểm đó
- [ ] Service fetch đầy đủ item data trước khi insert snapshot — không lưu partial
- [ ] `wear_count` và `last_worn_at` trên mỗi item trong outfit được update trong cùng transaction
- [ ] `POST /api/outfits/{id}/feedback` tạo `suggestion_feedback` với `action` (enum) + optional `rating`
- [ ] `rating` chỉ chấp nhận 1-5; `action = dismissed/disliked` + `rating` được cảnh báo nhưng không block

**Verification:**
- [ ] `pytest tests/outfits/test_service.py` pass (wear log + snapshot)
- [ ] Edit outfit sau khi log wear → `wear_logs.items_snapshot` không thay đổi
- [ ] Wear outfit 3 lần → `wear_count = 3` trên tất cả items trong outfit

**Dependencies:** Task 11

**Files likely touched:**
- `backend/outfits/service.py`
- `backend/outfits/router.py`
- `backend/outfits/repository.py`
- `tests/outfits/test_service.py`

**Estimated scope:** S

---

### Task 13: Weather Endpoint

**Description:** `GET /api/suggest/weather` nhận `lat`, `lng` từ query params, gọi OpenWeatherMap API, trả weather context dạng chuẩn cho Gemini prompt. (Route nằm trong feature `suggest` — prefix `/api/suggest`, không phải `/api/weather` như draft ban đầu.)

**Acceptance criteria:**
- [ ] Nhận `lat`, `lng` → gọi OpenWeatherMap current weather API
- [ ] Response: `{temp_c, condition, city, icon}` — normalize đơn vị về Celsius
- [ ] `WeatherClient` có interface để mock trong test
- [ ] Nếu không có `lat`/`lng` → trả `400 LOCATION_REQUIRED`
- [ ] Manual weather input: nhận `manual_condition` enum (`hot | warm | cool | cold | rainy`) thay vì gọi API

**Verification:**
- [ ] `pytest tests/suggest/test_weather.py` pass (mock WeatherClient)
- [ ] Gọi với `lat=10.76, lng=106.66` (TP.HCM) → trả city "Ho Chi Minh City"

**Dependencies:** Task 2

**Files likely touched:**
- `backend/suggest/router.py`
- `backend/suggest/schemas.py`
- `tests/suggest/test_weather.py`

**Estimated scope:** S

---

### Task 14: Suggest Endpoint + Cache

**Description:** `POST /api/suggest/outfit` là core AI feature. Gate check 15 items, build Gemini prompt với closet context + weather + occasion + lịch sử, cache kết quả theo `(user_id, date, context_hash)`.

**Quyết định triển khai (chốt 2026-06-04):**
- **Synchronous** trong request thread (không async qua ARQ) — suggestion là on-demand, user chờ kết quả ngay. Bảo vệ bằng cache + rate limit + timeout cho Gemini call. (Cập nhật SPEC §9 cho khớp ngoại lệ này.)
- Collage 2-3 outfit generate **tuần tự** (KHÔNG `asyncio.gather`) — `AsyncSession` không an toàn concurrent, DB write của các collage sẽ interleave. (Sửa so với dự kiến ban đầu là song song.) Vẫn graceful degradation từ Task 11. Nếu đo latency thực tế kém → tách collage sang ARQ ở follow-up.
- **slowapi chưa được wire** vào `main.py` (mới chỉ có trong deps) — Task 14 phải dựng `Limiter` + exception handler + decorator.
- `daily_suggestion_cache` cần model SQLModel mới (bảng đã có sẵn từ Task 1).
- Gemini suggestion client: tạo **ABC riêng trong `suggest/`** (không tái dùng code tagging coupled trong `workers/ai_pipeline.py`), inject để mock test. Prompt đặt trong `suggest/prompts.py`.
- **Cache lưu Postgres, không Redis**: cache là con trỏ tới `outfit_ids` đã persist ở bảng `outfits` → một nguồn sự thật, ghi cùng transaction với outfit, survive restart, self-healing (cache trỏ outfit đã xóa → regenerate). Redis dành cho rate limit. Cache hit vẫn re-fetch để ký signed URL mới.
- **Rate limit** đếm *mọi* request tới endpoint (cả cache-hit và cả request 403 gate), không chỉ lần gọi Gemini. Key theo `user_id`, storage in-memory cho single instance MVP → Redis-backed khi scale (Task 19).

**Acceptance criteria:**
- [ ] Gate: đếm items `processing_status = ready AND deleted_at IS NULL AND is_archived = false`. Nếu < 15 → `403 CLOSET_NOT_READY {items_count, items_required: 15}`
- [ ] Cache lookup: tìm `daily_suggestion_cache` theo `(user_id, today, context_hash)`. Cache hit → trả ngay, không gọi Gemini
- [ ] Cache miss → build prompt với: thumbnail tags của closet, weather context, occasion, 7 ngày wear history
- [ ] Gemini trả 2-3 outfits → validate → tạo `outfits` records + `outfit_items` + generate collage
- [ ] Lưu `outfit_ids` vào `daily_suggestion_cache`
- [ ] `context_hash` = hash của `(closet_item_ids_sorted, weather_condition, occasion)`
- [ ] Rate limiting: max 10 requests/user/ngày trên endpoint này (slowapi)

**Verification:**
- [ ] `pytest tests/suggest/test_service.py` pass (mock Gemini + WeatherClient)
- [ ] `pytest tests/suggest/test_integration.py` pass (cache hit/miss)
- [ ] User có 14 items → `403 CLOSET_NOT_READY {items_count: 14, items_required: 15}`
- [ ] Gọi 2 lần cùng context → lần 2 là cache hit (không gọi Gemini)
- [ ] Gọi cùng ngày nhưng đổi occasion → cache miss → Gemini gọi lại

**Dependencies:** Task 12, Task 13

**Files likely touched:**
- `backend/suggest/service.py`
- `backend/suggest/router.py`
- `backend/suggest/prompts.py`
- `backend/suggest/schemas.py`
- `tests/suggest/test_service.py`
- `tests/suggest/test_integration.py`

**Estimated scope:** L — tách Cache logic (Task 14b) nếu cần

---

### Task 15: Home Screen + Outfit UI

**Description:** Màn hình Home hiển thị thời tiết hôm nay + outfit suggestions. Màn hình Outfit Detail hiển thị collage, items, reasoning, feedback actions.

**Acceptance criteria:**
- [ ] Home screen: thời tiết current, nút "Gợi ý hôm nay", occasion selector
- [ ] Location permission xin khi user bấm "Gợi ý" lần đầu; manual fallback nếu từ chối
- [ ] Hiển thị 2-3 outfit suggestions với collage + reasoning text
- [ ] Actions per outfit: Save, Mặc hôm nay, Dislike
- [ ] Outfit detail: items grid, reasoning, wear/feedback buttons
- [ ] < 15 items → hiển thị progress bar thay vì suggestion (dùng `items_count` từ 403 response)

**Verification:**
- [ ] Test trên iOS + Android thật
- [ ] < 15 items → progress bar "Thêm X món đồ nữa"
- [ ] Bấm "Mặc hôm nay" → `POST /outfits/{id}/wear` được gọi

**Dependencies:** Task 14, Task 10

**Files likely touched:**
- `mobile/app/(tabs)/index.tsx`
- `mobile/app/outfit/[id].tsx`
- `mobile/components/OutfitCard.tsx`
- `mobile/components/WeatherBadge.tsx`
- `mobile/components/SuggestionGateProgress.tsx`
- `mobile/hooks/useSuggest.ts`

**Estimated scope:** M

---

## ✅ Checkpoint Phase 2

- [ ] `pytest tests/outfits/ tests/suggest/` — tất cả unit + integration pass
- [ ] Core loop end-to-end trên thiết bị thật: upload → tag → closet → suggest → wear log
- [ ] Cache hoạt động: log `cache hit` khi gọi lần 2 cùng context
- [ ] Gate hoạt động: < 15 items → progress bar trên Home screen

---

## Phase 3 — Engagement & Polish

---

### Task 16: Analytics Server-Side + UI

**Description:** 3 analytics endpoints tính toán server-side từ `wear_logs` và `clothing_items`. Analytics UI hiển thị kết quả đã aggregate.

**Acceptance criteria:**
- [x] `GET /api/analytics/colors` trả top 5 colors theo `wear_count` của items (gom theo tên màu, hex đại diện = item mặc nhiều nhất)
- [x] `GET /api/analytics/unworn` trả items `wear_count = 0 AND processing_status = ready AND deleted_at IS NULL AND is_archived = false` (thumbnail ký lúc đọc)
- [x] `GET /api/analytics/history` trả calendar data: `[{date, outfit_id, collage_url, occasion}]` cho 30 ngày gần nhất, dedup 1 outfit/ngày (lần mặc mới nhất)
- [x] `GET /api/analytics/summary` trả `{items_count, outfits_count, worn_days}` cho hàng stat cards (thêm so với spec — giữ nguyên tắc SPEC 3.9: client chỉ nhận số đã aggregate)
- [x] Analytics UI: bar chart màu (top 5), unworn items strip (scroll ngang), calendar view tô màu theo occasion

**Verification:**
- [x] `pytest tests/analytics/` pass (6 unit + 4 integration, aggregation chính xác)
- [x] Seed: mặc outfit A (có áo đỏ) 3 lần → màu đỏ xuất hiện top 1 analytics

**Dependencies:** Task 12

**Files likely touched:**
- `backend/analytics/router.py`
- `backend/analytics/service.py`
- `backend/analytics/repository.py`
- `backend/analytics/schemas.py`
- `mobile/app/(tabs)/analytics.tsx`
- `tests/analytics/test_service.py`
- `tests/analytics/test_integration.py`

**Estimated scope:** M

---

### Task 17: Gamification + Onboarding

**Description:** Progress bar unlock suggestion (dùng `items_count` từ API — không cần logic mới), streak counter, badge đầu tiên. Onboarding 3-bước cho user mới.

**Acceptance criteria:**
- [x] Progress bar trên Home: `{items_count}/15 món đồ` — tự update khi upload thêm (đọc `items_count` từ `GET /api/analytics/summary`, refetch on focus)
- [x] Badge "Tủ đồ đầu tiên" hiển thị khi `items_count` đạt 15 lần đầu (one-time, cờ AsyncStorage `firstClosetBadge:<userId>`)
- [x] Streak counter: số ngày liên tiếp user xem suggestion — hiển thị trên Home (AsyncStorage `streak:<userId>`, ghi khi `generate()` ra results)
- [x] Onboarding 3 slides: "Chụp → AI tag → Mặc đẹp mỗi sáng" → chỉ show lần đầu (cờ `hasOnboarded` đã wired ở root layout)

**Quyết định khi triển khai:**
- **ThemeProvider refactor — hoãn**: prerequisite này phục vụ màn Appearance (runtime theme switching), không nằm trong 4 acceptance của Task 17. Giữ `T` static để tránh migrate ~20 file; sẽ làm khi thực sự build màn Appearance.
- **Lưu state client-side** (AsyncStorage), không thêm backend.
- **Garment SVG**: port `garments.jsx` → `components/ui/Garment.tsx` (6 kind dùng trong onboarding heroes).
- **readyCount** lấy từ `/api/analytics/summary` (`items_count` = active+ready) — không thêm endpoint.

**Verification:**
- [ ] Upload item 15 → badge animation xuất hiện
- [ ] Xem suggestion 3 ngày liên tiếp → streak = 3
- [ ] Uninstall + reinstall → onboarding show lại

**Dependencies:** Task 15

**Files touched:**
- `mobile/app/(tabs)/index.tsx` (streak card + gate chủ động + badge modal)
- `mobile/app/(onboarding)/index.tsx` (3 slides)
- `mobile/components/StreakBadge.tsx`, `mobile/components/FirstClosetBadge.tsx`
- `mobile/components/ui/Garment.tsx` (port từ prototype)
- `mobile/hooks/useStreak.ts`, `mobile/hooks/useClosetMilestone.ts`

**Estimated scope:** S

**⚠️ Prerequisite — ThemeProvider refactor (HOÃN — chỉ cần khi build màn Appearance, không thuộc acceptance Task 17):**

Màn Appearance screen yêu cầu runtime theme switching. Hiện tại `T = buildTheme(DEFAULT_THEME)` là static singleton — không đổi được lúc chạy. Trước Task 17, cần refactor:

1. Tạo `ThemeProvider` (React Context) + `useTheme()` hook — wraps `buildTheme()`, lưu `ThemeChoice` vào AsyncStorage
2. Chuyển toàn bộ component từ `import { T } from '@/lib/theme'` sang `const t = useTheme()`
3. Di chuyển `StyleSheet.create({...})` vào trong component với `useMemo(() => makeStyles(t), [t])`

**Context về design tokens đã có sẵn (Task 11+):**
- `SP`, `FS`, `RADIUS`, `TXT` đã được export từ `mobile/lib/theme.ts` (thêm ở commit `chore/theme-design-system-tokens`)
- Code Task 1–10 vẫn dùng `T.xxx` (static) — chưa migrate, sẽ migrate trong bước refactor này
- Code Task 11+ dùng `TXT`, `sp()`, `RADIUS`, `FS` trực tiếp — không hardcode fontFamily/fontSize/spacing

---

### Task 18: Push Notifications

**Description:** Đăng ký Expo Push Token, lưu vào `push_tokens`, gửi notification sáng hàng ngày nhắc user xem suggestion.

**Acceptance criteria:**
- [ ] App request notification permission khi user login lần đầu
- [ ] Expo Push Token được lưu vào `push_tokens` sau khi grant permission
- [ ] ARQ scheduled job chạy 7:00 sáng gửi push đến tất cả users có token
- [ ] Tap notification → navigate đến Home screen với suggestion
- [ ] `DELETE /api/push-tokens` cho phép user opt out

**Verification:**
- [ ] Đăng ký trên thiết bị thật → token xuất hiện trong DB
- [ ] Trigger job thủ công → push nhận được trên thiết bị

**Dependencies:** Task 15, Task 3

**Files likely touched:**
- `backend/workers/notifications.py`
- `mobile/hooks/usePushToken.ts`
- `mobile/app/(tabs)/index.tsx`

**Estimated scope:** S

---

### Task 22: Profile + Archive (Extras)

**Description:** Màn Profile (hồ sơ + **đăng xuất** — app trước đó chưa có logout) và màn Archive (đồ đã lưu trữ + khôi phục). Dựng theo `app-profile.jsx` + `app-settings.jsx`.

**Acceptance criteria:**
- [x] `POST /api/items/{id}/unarchive` — set `is_archived=false`, ký URL, trả `ItemResponse`
- [x] Màn Profile: avatar (chữ cái đầu email), email + "Thành viên từ …", 3 stat (món/outfit từ `/analytics/summary`, streak), Bộ sưu tập (Archive; "Outfit đã lưu" tạm "Sắp ra mắt"), **Đăng xuất** (`supabase.auth.signOut()` → root layout redirect về `(auth)`)
- [x] Màn Archive: list `is_archived=true`, nút Khôi phục mỗi món (optimistic), empty state
- [x] Lối vào Profile: nút avatar trên header Home → `/profile`
- [x] `useCloset` refetch-on-focus → restore từ Archive đồng bộ về Closet (không lệch list)

**Verification:**
- [x] `pytest tests/items/` pass — gồm `archive → unarchive → archive` hội tụ + đồ soft-deleted không lọt vào Archive
- [x] tsc xanh

**Quyết định (chốt với user):**
- **Appearance + ThemeProvider refactor — bỏ** (không làm đợt này; `T` giữ static). 27 file đang dùng `T` static nên refactor runtime theme là task lớn riêng, rủi ro cao.
- **Saved outfits — hoãn** (cần endpoint list-saved; mục trong Profile tạm "Sắp ra mắt").
- Không conflict ở archive/unarchive: set giá trị tuyệt đối (idempotent), không phải toggle/counter.

**Files touched:**
- `backend/items/{router,service}.py`, `tests/items/{test_service,test_integration}.py`
- `mobile/app/profile.tsx`, `mobile/app/archive.tsx`, `mobile/app/_layout.tsx`, `mobile/app/(tabs)/index.tsx`
- `mobile/hooks/useCloset.ts`, `mobile/lib/api.ts`

**Estimated scope:** S–M

---

### Task 23: Outfit Save + Manual Builder (Extras)

**Description:** Đóng gap "endpoint mồ côi" phát hiện khi audit — backend outfits đã có `POST /outfits`, `GET /outfits`, `PATCH /{id}/items` nhưng mobile chưa tiêu thụ. Thêm bộ sưu tập "Outfit đã lưu" (♥ persist thật) + màn builder tự phối thủ công. Prototype mới: `app-builder.jsx` + `SavedScreen` trong `app-profile.jsx`.

**Quyết định (chốt với user):**
- **Saved = cột `outfits.is_saved`** (cách B), KHÔNG dùng `suggestion_feedback`. Lý do: builder phải vào bộ sưu tập ngay khi tạo; `suggestion_feedback='saved'` hiện **không ai đọc** (chỉ ghi) → bỏ double-write ở ♥.
- Endpoint save/unsave **mirror archive/unarchive**: `POST /{id}/save` + `POST /{id}/unsave`, set tuyệt đối (idempotent, conflict-free).
- Manual outfit `is_saved=True` lúc tạo; AI outfit `is_saved=False` đến khi ♥.
- Role mapping builder→enum: footer→`shoes`, acc→`accessory`, áo khoác nằm slot `top` (không tách slot outerwear — đơn giản hoá prototype).
- **Favorite item** (cột `clothing_items.is_favorite` + tab "Yêu thích" trong Closet) — **backlog**, chưa có prototype; orthogonal với archive, soft-delete tự loại khỏi mọi list (không cần clear flag).

**Acceptance criteria:**
- [x] Migration `007_outfits_is_saved.sql`: cột `is_saved` + index `(user_id, is_saved)`
- [x] `POST /api/outfits/{id}/save` + `/unsave` (idempotent); `GET /api/outfits?saved=true`
- [x] Builder mobile (`app/builder.tsx`): slot theo role, picker theo type, live preview, save sheet (tên + dịp) → `POST /outfits`
- [x] Màn "Outfit đã lưu" (`app/saved.tsx`): grid collage, empty state, vào từ Profile
- [x] ♥ ở Home + Outfit detail gọi `saveOutfit`/`unsaveOutfit` (seed từ `is_saved`), bỏ `submitFeedback('saved')`
- [x] Nút "Tự phối" trên header Closet → `/builder`

**Verification:**
- [x] backend unit pass; integration tests viết (verify qua CI — local macOS asyncpg 0.31.0 lỗi `get_statusmsg()=None`, không chạy được DB tests)
- [x] `npm run ts` xanh
- [ ] Manual: build outfit → xuất hiện trong "Outfit đã lưu"; ♥ gợi ý → vào collection; bỏ ♥ → biến mất

**Còn mồ côi sau task này (backlog):** `PATCH /outfits/{id}/items` (sửa items outfit), `DELETE /items/{id}` (xóa món — mobile chỉ archive), `PATCH /items/{id}/tags` (sửa tag/custom_tags), favorite-item.

**Files touched:**
- `backend/outfits/{models,schemas,repository,service,router}.py`, `supabase/migrations/007_outfits_is_saved.sql`, `tests/outfits/test_integration.py`, `tests/suggest/test_service.py`
- `mobile/lib/api.ts`, `mobile/app/{builder,saved}.tsx`, `mobile/app/(tabs)/{index,closet}.tsx`, `mobile/app/{profile,outfit/[id]}.tsx`

**Estimated scope:** M

---

## ✅ Checkpoint Phase 3

- [ ] `pytest tests/analytics/` pass
- [ ] End-to-end engagement flow: upload 15 items → badge → suggestion → streak
- [ ] Push notification nhận được trên thiết bị thật

---

## Phase 4 — Launch Prep

---

### Task 19: Deployment + CD Pipeline

**Description:** Deploy lên Railway: API server + ARQ worker + Redis. Config CD tự động: merge vào `main` → Railway auto-deploy. Config production env vars. Verify rate limiting.

**Acceptance criteria:**
- [ ] 3 services trên Railway: `api`, `worker`, `redis` (managed)
- [ ] `api` start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- [ ] `worker` start command: `arq backend.workers.main.WorkerSettings`
- [ ] `api` và `worker` deploy từ cùng repo, cùng branch `main`, khác start command
- [ ] Tất cả env vars set trong Railway dashboard — không commit giá trị thật
- [ ] `GET /health` public trả `200` trên production URL
- [ ] CD pipeline: GitHub Actions job `cd-deploy` chạy khi merge vào `main`
  - Trigger Railway redeploy `api` + `worker` qua Railway deploy hook
  - Chỉ trigger sau khi `ci-backend` + `ci-mobile` pass
- [ ] slowapi rate limiting: `POST /api/suggest/outfit` max 10 req/user/day, `POST /api/items/upload` max 50 req/user/day
- [ ] Supabase production project tách riêng với dev project

**Verification:**
- [ ] Merge 1 PR vào `main` → Railway tự deploy trong < 3 phút
- [ ] Upload ảnh từ điện thoại thật → processed trên production
- [ ] Gọi suggest 11 lần trong ngày → lần 11 nhận 429

**Dependencies:** Task 18

**Files likely touched:**
- `backend/main.py` (rate limiter setup)
- `railway.toml`
- `.env.example`
- `.github/workflows/cd.yml`

**Estimated scope:** M

---

### Task 20: Quality Sweep + Manual AI Testing

**Description:** Error handling sweep toàn bộ external calls. Manual test AI accuracy. Remove BG visual test.

**Acceptance criteria:**
- [ ] Mọi `GeminiClient`, `WeatherClient`, `BackgroundRemovalClient` call có try/except → update `processing_status` hoặc trả AppException rõ ràng
- [ ] Manual test: upload 20 ảnh đồ thật → ≥ 80% tags chính xác
- [ ] Remove BG visual test: nền trắng, nền tối, nền phức tạp → chất lượng chấp nhận được
- [ ] Không có `print()` hoặc `console.log()` trong production code

**Verification:**
- [ ] `grep -r "print(" backend/` → 0 results
- [ ] Manual checklist AI accuracy ký tên

**Dependencies:** Task 19

**Files likely touched:**
- `backend/workers/bg_removal.py`
- `backend/workers/ai_pipeline.py`
- `backend/suggest/service.py`

**Estimated scope:** S

---

### Task 21: EAS Build + Store Submission

**Description:** Setup EAS Build cho iOS + Android. Chuẩn bị store assets và privacy policy.

**Acceptance criteria:**
- [ ] `eas build --platform all` thành công
- [ ] iOS build submit lên TestFlight
- [ ] Android build submit lên Play Store Internal Testing
- [ ] App icon, splash screen, store screenshots (5 màn hình)
- [ ] Privacy policy URL live (có thể là GitHub Pages hoặc Notion) — đề cập đến ảnh cá nhân, account deletion, không bán data
- [ ] `expo-camera` và location permission strings trong `app.json` rõ ràng

**Verification:**
- [ ] Install từ TestFlight trên iPhone thật → core loop hoạt động
- [ ] Install từ Play Store internal → core loop hoạt động

**Dependencies:** Task 19

**Files likely touched:**
- `mobile/app.json`
- `mobile/eas.json`
- `mobile/assets/` (icon, splash)

**Estimated scope:** M

---

## ✅ Checkpoint Phase 4 — Launch Ready

- [ ] Core loop hoạt động end-to-end trên production từ TestFlight + Play Store internal
- [ ] AI tag accuracy ≥ 80% (manual test)
- [ ] Rate limiting hoạt động trên production
- [ ] Privacy policy live

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| rembg chất lượng kém với ảnh nền phức tạp | High | Remove.bg fallback + user "Improve cutout" button |
| Gemini output không khớp taxonomy enum | High | Pydantic validation strict, reject + log, processing_status = failed |
| Gemini API cost vượt budget | Medium | Cache suggestion theo context_hash, rate limit 10 req/user/day, dùng Flash-Lite cho suggestion |
| ARQ worker crash mất jobs | Medium | Redis persistence, job retry 3 lần, `processing_status` làm checkpoint |
| App Store reject vì camera/location permission | Medium | Permission strings rõ ràng trong app.json, chỉ xin khi cần |
| User không upload đủ 15 items | High | Gamification + onboarding, batch upload, progress bar rõ ràng |

## Open Questions

- `streak_count` update logic: cron job hàng ngày reset streak nếu user không xem suggestion, hay chỉ update khi user mở app?
- Collage layout: flat-lay style hay grid? Cần design mockup trước Task 11.
- Signed URL TTL: 1 giờ đủ chưa hay cần refresh mechanism ở mobile?

---

## Amendments (post-MVP)

Các thay đổi sau khi khép task plan gốc. Tiêu chí task ở trên giữ làm bản ghi lịch sử; mục này là **hành vi hiện tại**.

### A1. Worker stability (#32–37)
- **OOM** (worker 1GB): `max_jobs=1` → downscale input → model `u2netp` → tắt `enable_cpu_mem_arena` + `intra_op_num_threads=1`. RAM phẳng.
- **Gemini 429**: bắt `ResourceExhausted` → `Retry(defer)` còn lượt, hết lượt → terminal (chặn vòng đốt quota).
- **Job dedup**: deterministic job_id `process_item:{id}` + `keep_result=0` (result key 1h chặn retry/recovery nếu để mặc định).
- **Orphan recovery**: `cron(_recover_orphaned)` mỗi 5' (không chỉ on_startup). Sau split-flow chỉ quét `pending`/`removing_bg`.
- Chi tiết: `docs/lessons-learned.md` mục Workers/ARQ.

### A2. Mobile item lifecycle (#38–39)
- Màn Add: card `ready` auto-collapse ~3s; nút `x` (ẩn, có xác nhận khi đang xử lý); nút Xoá cho card failed; dải "Vừa thêm" + "Xem trong tủ".
- Tủ đồ: badge **MỚI** (≤24h). Item detail: nút **Xoá** (soft-delete, xác nhận) + **retry cho item kẹt** (không chỉ failed).
- Sửa thẻ thủ công: sheet `EditTagsSheet` → `PATCH /items/{id}/tags` (type/style/season/occasion + custom_tags).
- `DELETE` là **soft-delete** (`deleted_at`), không undelete, không dọn storage (nợ V2). Audit: outfits/wear/suggest/analytics đều lọc `deleted_at` + xử lý `None` mượt.

### A3. Split-flow gắn thẻ on-demand (#40–43)
Tách tagging khỏi pipeline upload. Đồ upload xong ở `ready` nhưng **chưa gắn thẻ**; user gắn theo lệnh (AI hoặc tay).
- **Status 2 chiều**: `processing_status` (pending→removing_bg→ready|failed, bỏ bước tagging) ⊥ `tag_status` (untagged→tagging→tagged|tag_failed). Bất biến `tagged ⟺ có type`. Migration `008_tag_status.sql`.
- **Worker**: `process_item` chỉ bg→ready; job mới `tag_item` (Gemini, on-demand).
- **API**: `POST /items/{id}/tag` (kích AI, yêu cầu `ready`, 100/day); `PATCH .../tags` set `tagged` khi có type. Re-tag ghi đè field-AI, giữ custom_tags. Lỗi: first-tag→`tag_failed`, re-tag→giữ `tagged`.
- **Gate/suggest** đếm `tag_status=tagged` (không phải chỉ `ready`). Analytics giữ `ready`.
- **Mobile**: item detail rẽ theo `tag_status` (nút "Để AI gắn thẻ"/"Gắn lại AI"/"Gắn thủ công"); ItemCard chip "Chưa gắn thẻ"; realtime theo dõi `tag_status`.
- Lý do: tách nền free/local không giới hạn, Gemini tốn phí + rate-limit → on-demand kiểm soát chi phí + tự diệt vòng auto-retry đốt quota.

### Còn nợ
Thùng rác/Hoàn tác item (cần restore endpoint) · auto dọn storage cho item `deleted_at` cũ · `tagged_by` provenance · Task 18–21 (push, deploy/CD, EAS) · Gemini billing.

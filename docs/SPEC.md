# AwesomeCloset — Product Spec

## 1. Objective

**Problem**: Người dùng đi học / đi làm không biết mặc gì mỗi sáng. Việc phối đồ tốn thời gian và thường lặp lại những outfit nhàm chán dù tủ đồ đầy đủ.

**Solution**: App tủ đồ cá nhân AI — người dùng số hóa tủ đồ bằng cách chụp ảnh, AI tự tag và gợi ý outfit phù hợp thời tiết + hoàn cảnh mỗi ngày.

**Target users**: Sinh viên và người đi làm (18–35 tuổi), chủ yếu tại Việt Nam, dùng điện thoại để chụp và browse outfit.

**MVP thesis**: MVP phải chứng minh được 2 hành vi: người dùng đủ kiên nhẫn số hóa tủ đồ, và gợi ý mỗi sáng đủ hữu ích để quay lại. Các tính năng không phục vụ trực tiếp 2 hành vi này sẽ để sau MVP.

**Success metric (MVP)**:
- User upload được ≥ 15 món đồ trong 7 ngày đầu
- User nhận được 1 outfit suggestion có ích mỗi sáng
- Retention D7 ≥ 30%
- ≥ 60% outfit suggestions được user lưu, mặc, hoặc rating ≥ 4/5

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Mobile | React Native (Expo) | Cross-platform iOS/Android, camera API dễ dùng |
| Backend | FastAPI (Python) | Tốt cho AI pipeline, async, dễ integrate ML libs |
| Package Manager | `uv` | Fast Python package manager, thay thế pip/virtualenv |
| Database / Auth / Storage | Supabase | Auth, Postgres DB, object storage cho ảnh trong 1 service |
| Background Removal | `rembg` (self-hosted) hoặc Remove.bg API | rembg miễn phí, Remove.bg dùng khi cần chất lượng cao |
| AI Vision / Tagging | Gemini Flash model, config qua env | Multimodal mạnh, chi phí thấp. Không hard-code version trong code để dễ đổi model |
| Outfit Suggestion | Gemini Flash model, config qua env | Phân tích closet context, suggest outfit theo text |
| Weather | OpenWeatherMap API | Free tier đủ dùng |
| Outfit Collage | Pillow (Python) | Cùng runtime với FastAPI, tránh thêm Node service chỉ để ghép ảnh |
| Push Notifications | Expo Push Notifications | Built-in Expo service, không cần FCM setup riêng |
| Background Jobs | ARQ + Redis | ARQ worker chạy process riêng, Redis làm job queue broker |
| Deployment | Railway hoặc Render | Deploy API server + ARQ worker + Redis. Free tier đủ cho MVP |
| App Build & Submit | EAS Build (Expo) | Build iOS/Android binary, submit lên App Store / Play Store |
| **V2 — Virtual Try-On** | Fashn.ai API hoặc Replicate | Render ảnh user mặc outfit thật sự (expand sau MVP) |

**Deployment topology**:
- **API Server** (Railway/Render service 1): FastAPI app — nhận HTTP request từ mobile
- **ARQ Worker** (Railway/Render service 2): background jobs — rembg + Gemini tagging, cùng codebase với API
- **Redis** (Railway/Render managed): job queue broker cho ARQ
- **Supabase** (managed cloud): DB, Auth, Storage — không cần tự deploy
- **Mobile app**: không deploy server — build bằng EAS, distribute qua App Store / Play Store

**Model config đề xuất**:
- `GEMINI_TAGGING_MODEL`: model Flash multimodal ổn định hiện tại
- `GEMINI_SUGGESTION_MODEL`: model Flash hoặc Flash-Lite tùy chi phí/chất lượng
- Model cụ thể phải được kiểm tra lại trước launch vì lifecycle/rate limit của AI model thay đổi thường xuyên.

---

## 3. Feature Scope

### MVP (V1) — Core Loop

```
Chụp/Upload ảnh → Remove BG → AI Auto-tag → Digital Closet → AI Suggest Outfit → Collage Board
```

#### 3.1 Onboarding + Gamification
- Onboarding flow giải thích 3 bước: "Chụp → AI tag → Mặc ngay"
- Progress bar: "Thêm 5 món đồ nữa để mở khóa gợi ý outfit"
- Streak counter: consecutive days với ít nhất 1 outfit suggestion được xem
- Badge đầu tiên khi upload đủ 15 món đồ
- **Lưu ý**: Gamification chỉ gate tính năng **Outfit Suggestion**. Tất cả tính năng khác (upload, remove BG, tagging, digital closet) hoạt động bình thường ngay từ đầu.
- Gate được enforce ở **service layer** — `POST /api/suggest/outfit` trả `403 CLOSET_NOT_READY` kèm `items_count` và `items_required: 15` nếu chưa đủ. UI Phase 3 dùng response này để hiển thị progress bar.

#### 3.2 Chụp & Upload Đồ
- Camera in-app với guide overlay (khuyến khích chụp nền trắng/sáng)
- Batch upload từ gallery (chọn nhiều ảnh cùng lúc)
- Xử lý queue: upload → remove BG → AI tag chạy background
- Progress indicator per item
- Cho phép retry từng item nếu xử lý ảnh hoặc AI tag thất bại

#### 3.3 Remove Background
- Tự động sau khi upload
- Backend: `rembg` với model `u2net`
- Fallback: Remove.bg API nếu xử lý thất bại hoặc user bấm "Improve cutout"
- Output: PNG với transparent background, lưu vào Supabase Storage
- Resize/compress ảnh gốc trước khi upload để giảm storage và thời gian xử lý

#### 3.4 AI Auto-Tagging
- Model: Gemini Flash multimodal, chọn bằng env config
- Tags được sinh ra (giá trị khớp với DB enum):
  - `type`: `t_shirt`, `shirt`, `pants`, `jeans`, `shorts`, `dress`, `skirt`, `jacket`, `coat`, `hoodie`, `sweater`, `shoes`, `sneakers`, `boots`, `bag`, `accessory`
  - `color`: màu chủ đạo — `[{hex, name, dominant}]`
  - `style`: `casual`, `formal`, `streetwear`, `sporty`, `elegant`, `minimalist`
  - `season`: `spring_summer`, `fall_winter`, `all_season`
  - `occasion`: `school`, `work`, `casual`, `party`, `date`, `travel`
- User có thể edit tags sau khi AI tag
- Structured JSON output từ Gemini (schema validation — output sai enum thì reject, không lưu)

#### 3.5 Digital Closet
- Grid view 2-3 cột, ảnh đã remove-bg trên nền xám nhạt
- Filter/sort theo: type, occasion, season (filter theo color → post-MVP)
- Search bằng text (full-text search trên tags)
- Item detail: ảnh full, tất cả tags, lịch sử mặc
- Swipe to archive (không xóa, chỉ ẩn)
- Empty states rõ ràng: chưa có đồ, đang xử lý, xử lý lỗi

#### 3.6 AI Outfit Suggestion
- Trigger: mỗi sáng (push notification) hoặc user bấm "Gợi ý hôm nay"
- **Gate**: service kiểm tra số items `processing_status = ready` và `deleted_at IS NULL`. Nếu < 15 → throw `AppException(code="CLOSET_NOT_READY", status=403, items_count=N, items_required=15)`. Frontend dùng `items_count` để render progress bar.
- Input context gửi cho Gemini:
  - Danh sách đồ trong closet (ảnh thumbnail + tags)
  - Thời tiết hiện tại (OpenWeatherMap)
  - Hoàn cảnh do user chọn: đi học / đi làm / đi chơi / dự tiệc
  - Lịch sử outfit gần đây (tránh lặp)
- Output: 2–3 outfit suggestions, mỗi cái gồm:
  - Danh sách items (3–5 món)
  - Lý do ngắn gọn ("Trời 22°C, áo này vừa ấm vừa lịch sự")
  - Collage board (ảnh ghép)
- User feedback: save / wear / dislike / rating 1-5 để cải thiện prompt và analytics
- Không gợi ý item `is_archived`, đang xử lý lỗi, hoặc đang giặt (khi có laundry tracker V2)

#### 3.7 Outfit Collage Board
- Backend tạo ảnh collage từ các item đã remove-bg
- Layout: grid tự động hoặc flat-lay style
- User có thể save collage về camera roll
- Share collage lên social (optional)

#### 3.8 Weather-Based Context
- Tự động detect location (với permission)
- Hiển thị thời tiết hôm nay trên home screen
- Gemini nhận thông tin thời tiết như một phần của prompt

#### 3.9 Style Analytics (Basic)
- "Màu bạn mặc nhiều nhất": bar chart theo color
- "Đồ chưa mặc lần nào": highlight items ngủ quên
- "Outfit tuần này": calendar view
- Tính toán server-side qua `/api/analytics/*`, client chỉ nhận kết quả đã aggregate — không fetch raw wear history về client

#### 3.10 Privacy & Permissions
- Camera/gallery permission chỉ xin khi user bắt đầu upload
- Location permission chỉ xin khi user bật weather-based suggestion
- User có thể tắt weather context và nhập thủ công: nóng / mát / lạnh / mưa
- Ảnh cá nhân và tủ đồ mặc định private, không public URL trực tiếp

---

### V2 — Expansion Features

| Feature | Approach |
|---|---|
| Virtual Try-On | Fashn.ai API: gửi ảnh user (chụp 1 lần) + ảnh đồ → nhận ảnh render |
| Import từ link mua sắm | Scrape metadata + ảnh từ Shopee/Lazada URL |
| Outfit sharing community | Public outfit posts, like/save |
| Style profile quiz | Onboarding quiz để seed initial style preferences |
| Laundry tracker | Tag đồ đang giặt → không gợi ý trong thời gian đó |

---

## 4. Data Models (Supabase / Postgres)

```sql
-- Taxonomy enums — Gemini prompt phải dùng đúng các giá trị này khi tag
CREATE TYPE clothing_type AS ENUM (
  't_shirt', 'shirt', 'pants', 'jeans', 'shorts', 'dress', 'skirt',
  'jacket', 'coat', 'hoodie', 'sweater', 'shoes', 'sneakers', 'boots',
  'bag', 'accessory'
);
CREATE TYPE clothing_style AS ENUM (
  'casual', 'formal', 'streetwear', 'sporty', 'elegant', 'minimalist'
);
CREATE TYPE clothing_season AS ENUM ('spring_summer', 'fall_winter', 'all_season');
CREATE TYPE clothing_occasion AS ENUM ('school', 'work', 'casual', 'party', 'date', 'travel');
CREATE TYPE processing_status AS ENUM ('pending', 'removing_bg', 'tagging', 'ready', 'failed');
CREATE TYPE feedback_action AS ENUM ('saved', 'worn', 'dismissed', 'disliked');
CREATE TYPE outfit_item_role AS ENUM ('top', 'bottom', 'shoes', 'outerwear', 'bag', 'accessory');

users
  id                 uuid PK REFERENCES auth.users(id) ON DELETE CASCADE  -- map 1-1 với Supabase Auth
  email              text
  display_name       text
  avatar_url         text
  style_preferences  jsonb      -- optional onboarding answers (V2)
  streak_count       int
  created_at         timestamp
  -- location không lưu: mobile gửi tọa độ tại thời điểm request, fallback về manual input

clothing_items
  id                 uuid PK
  user_id            uuid FK -> users
  original_url       text            -- Supabase Storage path
  processed_url      text            -- after remove-bg
  thumbnail_url      text
  processing_status  processing_status  DEFAULT 'pending'
  processing_error   text
  type               clothing_type
  colors             jsonb           -- [{hex, name, dominant}]
  style              clothing_style[]
  season             clothing_season[]
  occasion           clothing_occasion[]
  custom_tags        text[]          -- user-defined, không bị ràng buộc enum
  wear_count         int DEFAULT 0   -- denormalized, app logic update khi log wear
  last_worn_at       timestamp       -- denormalized, app logic update khi log wear
  is_archived        bool DEFAULT false
  created_at         timestamp
  updated_at         timestamp       -- cập nhật khi user edit tags
  archived_at        timestamp       -- set khi is_archived = true
  deleted_at         timestamp       -- soft delete, null = active

outfits
  id                 uuid PK
  user_id            uuid FK -> users
  name               text
  collage_url        text
  occasion           clothing_occasion
  weather_context    jsonb           -- {temp, condition, city}
  ai_generated       bool
  ai_reasoning       text
  created_at         timestamp
  updated_at         timestamp       -- cập nhật khi user rename hoặc edit outfit
  -- items lưu trong outfit_items join table (không dùng uuid[] array)

outfit_items                         -- join table thay cho item_ids uuid[]
  outfit_id          uuid FK -> outfits      ON DELETE CASCADE
  item_id            uuid FK -> clothing_items ON DELETE RESTRICT
  position           int                  -- thứ tự hiển thị item trong outfit
  role               outfit_item_role     -- top | bottom | shoes | outerwear | bag | accessory
  PRIMARY KEY (outfit_id, item_id)

wear_logs
  id                 uuid PK
  user_id            uuid FK -> users
  outfit_id          uuid FK -> outfits
  worn_date          date
  items_snapshot     jsonb           -- [{item_id, type, colors, style}] tại thời điểm mặc
  rating             int             -- 1-5, post-wear satisfaction
  created_at         timestamp

suggestion_feedback                  -- feedback cho AI suggestion, tách biệt với post-wear rating
  id                 uuid PK
  user_id            uuid FK -> users
  outfit_id          uuid FK -> outfits
  action             feedback_action -- saved | worn | dismissed | disliked
  rating             int             -- 1-5, optional, chỉ có nghĩa với saved/worn
  created_at         timestamp

push_tokens
  id                 uuid PK
  user_id            uuid FK -> users
  expo_push_token    text UNIQUE
  platform           text            -- ios | android
  created_at         timestamp

daily_suggestion_cache
  id                 uuid PK
  user_id            uuid FK -> users
  suggestion_date    date
  context_hash       text            -- hash của closet state + weather + occasion
  outfit_ids         uuid[]
  created_at         timestamp
  UNIQUE(user_id, suggestion_date, context_hash)
```

**Schema notes**:
- Taxonomy enums được định nghĩa ở DB layer — Gemini prompt phải truyền danh sách enum values để AI không tự sinh tag ngoài taxonomy.
- `outfit_items.item_id` dùng `ON DELETE RESTRICT`: không cho xóa item đang có trong outfit — user phải remove khỏi outfit trước.
- `wear_logs.items_snapshot`: lưu snapshot tại thời điểm mặc để analytics không bị lệch khi outfit bị edit sau đó.
- `suggestion_feedback` và `wear_logs.rating` là 2 loại feedback khác nhau: suggestion relevance vs post-wear satisfaction.
- Index tối thiểu: `clothing_items(user_id, is_archived, deleted_at)`, `clothing_items(user_id, type)`, `outfit_items(item_id)`, `outfits(user_id, created_at)`, `wear_logs(user_id, worn_date)`.
- Supabase Storage bucket dùng private access + signed URL ngắn hạn cho ảnh gốc/processed/thumbnail.

---

## 5. API Routes (FastAPI)

```
POST   /api/items/upload          # Upload + queue processing
GET    /api/items                 # List closet items (with filters)
GET    /api/items/{id}            # Item detail + processing status
PATCH  /api/items/{id}/tags       # Edit tags
DELETE /api/items/{id}            # Soft delete (set deleted_at) — ẩn vĩnh viễn khỏi closet
POST   /api/items/{id}/archive    # Archive (set is_archived=true) — ẩn tạm, vẫn trong closet
POST   /api/items/{id}/unarchive  # Khôi phục (set is_archived=false) — màn Archive
POST   /api/items/{id}/retry      # Retry failed processing

POST   /api/suggest/outfit        # Generate outfit suggestion (synchronous — xem §9)
GET    /api/suggest/weather       # Get current weather for user location

POST   /api/outfits               # Save outfit (items qua outfit_items)
GET    /api/outfits               # List saved outfits
GET    /api/outfits/{id}          # Outfit detail
PATCH  /api/outfits/{id}/items    # Thêm/bớt/reorder items trong outfit
POST   /api/outfits/{id}/wear     # Log wearing — tạo wear_logs với items_snapshot
POST   /api/outfits/{id}/feedback # Suggestion feedback — tạo suggestion_feedback (saved/worn/dismissed/disliked)

GET    /api/analytics/summary     # Counts: items / outfits / worn days
GET    /api/analytics/colors      # Color breakdown (top 5 by wear_count)
GET    /api/analytics/unworn      # Items never worn
GET    /api/analytics/history     # Wear history calendar (30d, 1 outfit/day)
```

**API behavior**:
- `POST /api/items/upload` trả `202 Accepted` với item/job ids ngay khi upload metadata thành công.
- Frontend poll `GET /api/items/{id}` hoặc subscribe Supabase Realtime để cập nhật `processing_status`.
- `DELETE /api/items/{id}` là soft delete (set `deleted_at`, ẩn vĩnh viễn); `POST /api/items/{id}/archive` chỉ set `is_archived` (ẩn tạm khỏi closet, vẫn còn data). Hard delete chỉ dùng cho account deletion.
- `POST /api/suggest/outfit` chạy **synchronous** trong request (xem §9): gate → cache lookup → Gemini → tạo outfits → trả về ngay. Cache theo `(user_id, suggestion_date, context_hash)` — cùng ngày nhưng khác occasion/weather/closet sẽ tạo cache entry mới, không bị kẹt cache cũ. Collage cho từng outfit generate **tuần tự** (không `asyncio.gather`) vì `AsyncSession` không an toàn concurrent — DB write của các collage sẽ interleave; nếu latency thực tế kém thì tách collage sang ARQ ở follow-up.
  - **Gate count** = `processing_status = ready AND deleted_at IS NULL AND is_archived = false` — chỉ đếm item thực sự dùng được, tránh edge "đủ 15 nhưng toàn archived".
  - **Cache lưu ở Postgres (`daily_suggestion_cache`), không Redis**: cache chỉ là *con trỏ* tới `outfit_ids` đã persist ở bảng `outfits` (collage + reasoning đã nằm sẵn ở DB) → để chung Postgres giữ một nguồn sự thật, ghi trong cùng transaction với outfit, và survive restart. Redis để dành cho rate limit (ephemeral counter). Cache hit vẫn re-fetch outfit để **ký signed URL mới** (URL hết hạn).
  - **Self-healing**: nếu cache trỏ tới outfit đã bị xóa (`get_outfit` raise) → coi như miss → regenerate thay vì trả lỗi.
  - **Rate limit `10/user/ngày`** đếm *mọi* request tới endpoint — bao gồm cả cache-hit và cả request bị 403 gate, không chỉ riêng lần thật sự gọi Gemini. Key theo `user_id` (fallback IP). Storage in-memory cho single instance MVP → chuyển Redis-backed khi scale ngang (Task 19).

---

## 6. Project Structure

**Backend theo Feature-based architecture** — mỗi feature là 1 folder khép kín, `core/` chứa shared utilities.

```
awesomeCloset/
├── mobile/                        # React Native (Expo)
│   ├── app/                       # Expo Router file-based routing
│   │   ├── (auth)/                # Login, register screens
│   │   ├── (tabs)/
│   │   │   ├── index.tsx          # Home — today's suggestion
│   │   │   ├── closet.tsx         # Digital closet grid
│   │   │   ├── add.tsx            # Capture/upload flow
│   │   │   └── analytics.tsx      # Style stats
│   │   └── outfit/[id].tsx        # Outfit detail
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── api.ts                 # FastAPI client
│   └── assets/
│
├── backend/                       # FastAPI
│   ├── main.py                    # App factory, register routers
│   ├── core/                      # Shared utilities
│   │   ├── database.py            # SQLAlchemy async engine + session factory
│   │   ├── exceptions.py          # AppException hierarchy
│   │   ├── dependencies.py        # DI factory functions (get_db, get_current_user)
│   │   ├── config.py              # Settings via pydantic-settings
│   │   └── logging.py             # Structured logging (loguru)
│   ├── items/                     # Clothing item feature
│   │   ├── router.py
│   │   ├── service.py
│   │   ├── repository.py
│   │   ├── models.py              # SQLModel table definitions
│   │   ├── schemas.py             # Request/Response Pydantic schemas
│   │   └── prompts.py             # Gemini prompt templates for tagging
│   ├── outfits/                   # Outfit + collage feature
│   │   ├── router.py
│   │   ├── service.py
│   │   ├── repository.py
│   │   ├── models.py
│   │   └── schemas.py
│   ├── suggest/                   # AI outfit suggestion feature
│   │   ├── router.py
│   │   ├── service.py
│   │   ├── prompts.py             # Gemini prompt templates for suggestion
│   │   └── schemas.py
│   ├── analytics/                 # Style analytics feature
│   │   ├── router.py
│   │   ├── service.py
│   │   ├── repository.py
│   │   └── schemas.py
│   └── workers/                   # Background processing
│       ├── bg_removal.py          # rembg async worker
│       └── ai_pipeline.py         # Tag + collage generation queue
│
├── pyproject.toml                 # uv deps + ruff + pytest config
├── tests/
│   ├── items/
│   │   ├── test_service.py        # Unit tests (mock repo + external deps)
│   │   └── test_integration.py    # Integration tests (real DB)
│   ├── outfits/
│   ├── suggest/
│   ├── analytics/
│   └── conftest.py                # Shared fixtures, test DB setup
│
├── supabase/
│   ├── migrations/                # SQL migrations
│   └── seed.sql
│
└── SPEC.md
```

---

## 7. Code Style & Conventions

### Frontend (React Native)
- **TypeScript strict mode** bắt buộc
- Expo Router file-based navigation

### Backend (FastAPI + Python)

**ORM**: `SQLModel` + `SQLAlchemy async` — SQLModel cho model/schema đơn giản, SQLAlchemy Core cho query phức tạp (join, analytics). Driver: `asyncpg`.

Chi tiết conventions, patterns, và rules: xem [`docs/backend-conventions.md`](backend-conventions.md).

---

## 8. Testing Strategy

### Gate rule
**Mỗi module phải pass hết test trước khi chuyển sang module tiếp theo.** Không merge code chưa có test đủ.

### Tools
| Tool | Mục đích |
|---|---|
| `pytest` | Test runner chính |
| `pytest-asyncio` | Async test support |
| `httpx` (AsyncClient) | Integration test FastAPI endpoints |
| `pytest-mock` | Mock external deps (Gemini, rembg, OpenWeatherMap) |
| Factory fixtures (`conftest.py`) | Tạo test data nhất quán |

### Test types per module

**Unit tests** (`test_service.py`):
- Mock repository và tất cả external services
- Test business logic thuần túy: validation, exception cases, output contract
- Nhanh, không cần DB

**Integration tests** (`test_integration.py`):
- Dùng Postgres/Supabase local Docker hoặc Testcontainers
- Test full flow: Router → Service → Repository → DB
- Mock chỉ external AI APIs (Gemini, rembg)
- Không dùng SQLite in-memory cho integration quan trọng vì không cover đúng `jsonb`, array, uuid, RLS, Postgres indexes

### Per-module test checklist
| Module | Unit | Integration |
|---|---|---|
| `items` | Service logic, tag validation, AppException cases | Upload flow, CRUD endpoints, filter/search |
| `outfits` | Collage generation logic, outfit assembly | Save/list/wear endpoints |
| `suggest` | Prompt building, context assembly | Full suggestion flow với mock Gemini |
| `analytics` | Aggregation logic | Query accuracy vs seed data |

### AI-specific testing
- Gemini tagging: test với 20 ảnh đồ thật, verify tag accuracy ≥ 80% (một lần, manual)
- Remove BG: visual test với ảnh nền nhiều màu (manual)
- Prompt regression: snapshot test — nếu prompt thay đổi, test fail để review có chủ ý
- Contract test cho structured output: response thiếu field / sai enum / sai JSON phải fail validation và log lỗi rõ
- Taxonomy test: Gemini output phải map được sang enum type — nếu AI trả "office" thay vì "work" thì test fail

---

## 9. Boundaries

### Always do
- Xử lý ảnh async — không block UI khi AI đang chạy
- Cache outfit suggestion trong ngày (không gọi Gemini 2 lần cho cùng context)
- Validate và sanitize tất cả input trước khi gửi vào Gemini prompt
- RLS trên Supabase — không để user A thấy data user B
- Private bucket + signed URLs cho ảnh user
- Cho user quyền xóa tài khoản và xóa toàn bộ ảnh/data liên quan

### Ask first
- Thay đổi AI model (ảnh hưởng chi phí + quality)
- Thêm feature social / sharing (ảnh hưởng privacy)
- Thay đổi pricing / monetization logic

### Never do
- Gọi AI API synchronously cho **batch image processing** (rembg + tagging) — phải chạy trên ARQ worker, không block UI. *Ngoại lệ có chủ đích*: `POST /api/suggest/outfit` chạy sync trong request vì là on-demand (user chờ kết quả ngay), được bảo vệ bằng cache + rate limit + timeout.
- Lưu ảnh gốc không compressed (resize trước khi upload)
- Collect location liên tục — chỉ lấy khi user request suggestion
- Hard-code API keys trong code
- Dùng public bucket cho ảnh cá nhân của user

---

## 10. Implementation Phases

> **Gate rule**: mỗi phase có checkpoint test. Chưa pass hết → không chuyển phase tiếp.

### Phase 1 — Foundation (2–3 tuần)

**Supabase**
- [ ] DB migrations: taxonomy enums, tất cả tables (clothing_items, outfits, outfit_items, wear_logs, suggestion_feedback, push_tokens, daily_suggestion_cache)
- [ ] RLS policies cho tất cả tables
- [ ] Storage buckets: private access + signed URL policy

**Backend core**
- [ ] FastAPI skeleton: main.py, middleware, router registration
- [ ] `core/database.py`: AsyncSession, `get_db`, `transaction()` helper
- [ ] `core/exceptions.py`: AppException hierarchy + global handler
- [ ] `core/dependencies.py`: DI factory functions
- [ ] `core/config.py`: pydantic-settings (env vars, model config)
- [ ] `core/logging.py`: loguru structured logging
- [ ] ARQ worker process + Redis setup (cùng codebase, chạy process riêng)

**Items feature**
- [ ] Upload endpoint → `202 Accepted`, enqueue ARQ job
- [ ] ARQ worker: rembg pipeline → update `processing_status`
- [ ] `GET /api/items`, `GET /api/items/{id}`, `PATCH /api/items/{id}/tags`, `DELETE /api/items/{id}`, `POST /api/items/{id}/retry`
- [ ] Supabase Realtime emit khi `processing_status` thay đổi

**Mobile**
- [ ] Expo project setup, Expo Router navigation
- [ ] Auth flow (Supabase Auth)
- [ ] Upload flow: camera + batch gallery, progress indicator, retry UI

**✅ Test gate Phase 1**: `items` unit tests + integration tests pass (upload flow, CRUD, processing lifecycle)

---

### Phase 2 — Core AI Loop (2–3 tuần)

**AI Tagging**
- [ ] Gemini Vision tagging với taxonomy enum trong prompt
- [ ] Structured JSON output validation — reject nếu output sai enum
- [ ] Prompt regression snapshot test

**Digital Closet UI**
- [ ] Grid view, filter/sort theo type/color/occasion/season
- [ ] Item detail: tags, lịch sử mặc
- [ ] Empty states: chưa có đồ, đang xử lý, xử lý lỗi

**Outfits feature**
- [ ] `POST /api/outfits` — tạo outfit với `outfit_items`
- [ ] `PATCH /api/outfits/{id}/items` — thêm/bớt/reorder items
- [ ] Collage generation (Pillow) — ghép ảnh đã remove-bg
- [ ] `POST /api/outfits/{id}/wear` — wear log với `items_snapshot`
- [ ] `POST /api/outfits/{id}/feedback` — suggestion_feedback

**Suggest feature**
- [ ] `GET /api/suggest/weather` — OpenWeatherMap, nhận tọa độ từ mobile
- [ ] `POST /api/suggest/outfit` — gate check (< 15 items → 403 CLOSET_NOT_READY), Gemini + weather context + lịch sử outfit
- [ ] `daily_suggestion_cache`: cache theo `(user_id, date, context_hash)`

**✅ Test gate Phase 2**: `outfits` + `suggest` unit tests + integration tests pass (outfit CRUD, wear snapshot, suggestion flow với mock Gemini, cache hit/miss)

---

### Phase 3 — Engagement & Polish (1–2 tuần)

- [ ] Gamification: progress bar (gate outfit suggestion ở 15 items), streak counter, badge
- [ ] Onboarding flow: 3-bước walkthrough
- [ ] Push notifications: Expo Push, daily morning trigger, `push_tokens` management
- [ ] Style analytics server-side: `GET /api/analytics/colors`, `/unworn`, `/history`
- [ ] Analytics UI: bar chart màu, unworn items highlight, calendar view

**✅ Test gate Phase 3**: `analytics` unit tests + integration tests pass (aggregation accuracy vs seed data)

---

### Phase 4 — Launch Prep

**Deployment**
- [ ] Railway/Render: API server service + ARQ worker service + Redis instance
- [ ] Env vars production config (Gemini model, Supabase keys, Redis URL)
- [ ] Rate limiting (slowapi) verify trên AI endpoints
- [ ] EAS Build setup: iOS + Android build profile

**Quality**
- [ ] Performance tuning: AI call latency, image processing throughput
- [ ] Error handling sweep: mọi external call có fallback hoặc error state rõ ràng
- [ ] Manual AI accuracy test: 20 ảnh thật, tag accuracy ≥ 80%
- [ ] Remove BG visual test: nhiều loại nền

**Store**
- [ ] TestFlight internal testing (iOS)
- [ ] Play Store internal testing (Android)
- [ ] App Store assets: icon, screenshots, description
- [ ] Privacy policy (ảnh cá nhân, account deletion)


## UI/UX Direction

AwesomeCloset should feel like a clean, modern fashion lifestyle app, not an admin dashboard. The interface is image-first: clothing photos, outfit collages, and daily suggestions are the main visual focus.



Use a soft neutral color palette, large rounded clothing cards, subtle shadows, clean typography, smooth transitions, haptic feedback, and optional subtle sound effects. The UX should make the core loop feel effortless: capture clothes, wait for AI processing, browse closet, receive outfit suggestions, and save/wear outfits.
Avoid clutter, dense tables, too many colors, complex dashboards, and over-animated effects.
For detailed design system, screen layout, motion, haptic, sound, and component guidelines, see `DESIGN.md`.

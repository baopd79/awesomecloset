# Supabase Setup Guide — AwesomeCloset

## Supabase là gì?

Supabase là một "Backend-as-a-Service" gồm 4 thứ gói chung:
- **PostgreSQL database** — DB thật, không phải NoSQL
- **Auth** — đăng ký/đăng nhập (email, OAuth) có sẵn, JWT token
- **Storage** — lưu file/ảnh, tích hợp với DB qua RLS
- **Realtime** — subscribe thay đổi DB theo websocket

Trong project này, Supabase thay thế việc tự setup Postgres + Auth + S3.

---

## 1. Tạo Project

1. Vào [supabase.com](https://supabase.com) → **Sign in** → **New project**
2. Điền:
   - **Name**: `awesomecloset-dev`
   - **Database password**: đặt mạnh, lưu vào `.env` local (không commit)
   - **Region**: Southeast Asia (Singapore) — gần VN nhất
3. Chờ ~2 phút để project khởi tạo

> Nên tạo **2 project riêng biệt**: `awesomecloset-dev` (để dev/test) và `awesomecloset-prod` (production). Không dùng chung để tránh xóa nhầm data production.

---

## 2. Lấy thông tin kết nối

Sau khi project tạo xong, vào **Project Settings → API**:

| Biến | Lấy từ đâu |
|---|---|
| `SUPABASE_URL` | Project URL (dạng `https://xxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key — **giữ bí mật, chỉ dùng ở backend** |

Vào **Project Settings → Database → Connection string → URI**:

| Biến | Lấy từ đâu |
|---|---|
| `DATABASE_URL` | URI dạng `postgresql://postgres:[password]@db.xxxx.supabase.co:5432/postgres` |

Đổi `postgresql://` thành `postgresql+asyncpg://` cho SQLAlchemy async.

Copy các giá trị này vào file `.env` (không commit).

---

## 3. Cài Supabase CLI

```bash
brew install supabase/tap/supabase
supabase --version  # verify
```

---

## 4. Link project với CLI

```bash
supabase login       # mở browser, đăng nhập
supabase link --project-ref <project-ref>
```

`project-ref` là đoạn ID trong URL dashboard:
```
https://supabase.com/dashboard/project/abcdefghijklmnop
                                        ^^^^^^^^^^^^^^^^
                                        đây là project-ref
```

Khi link thành công, CLI biết project nào để push migrations.

---

## 5. Apply Migrations

```bash
supabase db push
```

Lệnh này apply tất cả files trong `supabase/migrations/` theo thứ tự số.

Nếu thành công sẽ thấy:
```
Applying migration 001_enums.sql...
Applying migration 002_tables.sql...
...
Done.
```

### Verify sau khi push

Vào **Supabase dashboard → Table Editor** → thấy 8 tables:
`users`, `clothing_items`, `outfits`, `outfit_items`, `wear_logs`, `suggestion_feedback`, `push_tokens`, `daily_suggestion_cache`

Vào **Database → Enums** → thấy 7 enums.

Vào **Database → Triggers** → thấy trigger `on_auth_user_created` (tự tạo row trong `users` khi có user đăng ký qua Auth).

---

## 6. Verify RLS hoạt động

Vào **SQL Editor** trên dashboard, chạy:

```sql
-- Test RLS: query không có auth context → 0 rows (không phải error)
SELECT * FROM clothing_items;
```

Kết quả phải là 0 rows. Nếu trả lỗi permission thì RLS đang block đúng.

Để test với auth context thật, dùng Supabase client từ app (Task 6+).

---

## 7. Storage Bucket

Sau khi push migrations, vào **Storage** trên dashboard → thấy bucket `closet-images` (private).

Nếu không thấy, chạy thủ công trong **SQL Editor**:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('closet-images', 'closet-images', false)
ON CONFLICT (id) DO NOTHING;
```

---

## 8. Xem Auth hoạt động thế nào

Supabase Auth tự quản lý bảng `auth.users` (internal, không thấy trực tiếp trong Table Editor). Khi user đăng ký:
1. Supabase tạo row trong `auth.users` (internal)
2. Trigger `on_auth_user_created` tự tạo row tương ứng trong `public.users`
3. App dùng `users.id` (= `auth.uid()`) để join với các bảng khác

Xem users đã đăng ký tại **Authentication → Users**.

---

## 9. Local Dev vs Production

| | Dev | Prod |
|---|---|---|
| Project name | `awesomecloset-dev` | `awesomecloset-prod` |
| Dùng khi | viết code, test | launch thật |
| Reset DB | thoải mái | không bao giờ |
| `.env` file | `.env` (git ignored) | Railway env vars |

Khi cần reset DB dev (ví dụ schema thay đổi lớn):
**Dashboard → Settings → Danger Zone → Reset database**

---

## 10. Workflow khi thêm migration mới

Mỗi khi có thay đổi schema (task mới):
```bash
# Tạo file migration mới (tiếp theo số thứ tự)
# ví dụ: 006_add_column.sql

supabase db push   # apply lên dev
# verify trên dashboard
# commit file migration vào git
```

Migrations là idempotent theo thứ tự — Supabase CLI track file nào đã apply rồi, không apply lại.

---

## 11. Supabase vs Alembic — Điểm khác biệt

Nếu bạn quen dùng FastAPI + Alembic trước đây:

| | Alembic (cũ) | Supabase migrations (này) |
|---|---|---|
| Schema source of truth | Python models | SQL migration files |
| Tạo migration | `alembic revision --autogenerate` | Tự viết SQL file mới |
| Apply | `alembic upgrade head` | `supabase db push` |
| RLS / Triggers / Enums | Không biết | Viết thẳng trong SQL |

**Alembic autogenerate không dùng được** vì nó không hiểu RLS policies, triggers trên `auth.users`, hay Postgres enums đúng cách — sẽ tạo ra diff sai.

---

## 12. SQLModel models — Vai trò trong project này

Vẫn cần viết SQLModel models trong Python, nhưng vai trò khác:

- **Không** dùng để tạo schema (`create_all()` không được gọi)
- **Dùng** cho ORM queries trong FastAPI (select, insert, update)
- Models phải **sync thủ công** với SQL migration files

**Workflow khi thay đổi schema:**
1. Viết SQL migration mới (ví dụ `006_add_brand.sql`)
2. `supabase db push` — apply lên DB
3. Update SQLModel model tương ứng trong `backend/`
4. Commit cả 2 trong cùng 1 PR

> SQL migration file luôn đi trước, Python model cập nhật theo.




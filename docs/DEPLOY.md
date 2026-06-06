# Deployment — Railway + Supabase (production)

Two long-running processes ship from this one repo: **api** (`backend.main:app`) and
**worker** (`backend.workers.main.WorkerSettings`). Both build from the same
[`Dockerfile`](../Dockerfile) and differ only in start command.

Database/Auth/Storage = Supabase. We run **two separate Supabase projects**:

| Project | Use | Connected to |
|---|---|---|
| `awesomecloset-dev` | local dev, testing, experiments | your machine (`.env`) |
| `awesomecloset-prod` | real users — never wipe | Railway (api + worker) |

---

## 1. Supabase production project

1. **Create** a new project `awesomecloset-prod` (same org). Pick a strong DB password and save it.
2. **Collect credentials** (Project Settings → API / Database):
   - `SUPABASE_URL` = `https://<prod-ref>.supabase.co`
   - `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (asyncpg form, for the app):
     `postgresql+asyncpg://postgres:<pwd>@db.<prod-ref>.supabase.co:5432/postgres`
   - Direct connection string (psql form, for migrations):
     `postgresql://postgres:<pwd>@db.<prod-ref>.supabase.co:5432/postgres`
3. **Apply all migrations** (`001` → `007`) to prod:
   ```bash
   supabase login                  # one token for the whole account — not per-DB
   SUPABASE_DB_URL="postgresql://postgres:<pwd>@db.<prod-ref>.supabase.co:5432/postgres" make migrate
   ```
   This applies RLS (`004`), the private `closet-images` Storage bucket + policies
   (`005`), and the realtime publication (`006`) — the security layer the mobile app
   relies on when it talks to Supabase directly.
4. **Verify**:
   ```bash
   supabase migration list --db-url "postgresql://postgres:<pwd>@db.<prod-ref>.supabase.co:5432/postgres"
   # Remote column must list 001..007
   ```
   
   ```bash
   supabase projects list 
   #check xem đang link tới project nào
   ```


> JWT verification is JWKS/ES256 (`core/auth.py`) — keys are fetched from the prod
> project's `/.well-known/jwks.json` at startup. No shared JWT secret to copy.

---

## 2. Railway

1. **New Project → Deploy from GitHub repo** → select this repo.
2. **Service `api`** (the first service Railway creates):
   - Build: Dockerfile (auto-detected).
   - Start command: leave default — the Dockerfile `CMD` runs uvicorn on `$PORT`.
   - Settings → **Deploy branch = `main`** (auto-deploy on every commit to main).
   - Networking → generate a public domain.
3. **Service `worker`**: **+ New → GitHub Repo** (same repo) →
   - Settings → **Custom Start Command**:
     `arq backend.workers.main.WorkerSettings`
   - Deploy branch = `main`. No public domain needed.
4. **Redis**: **+ New → Database → Redis** (managed). Railway exposes `REDIS_URL`.
5. **Environment variables** — set on **both** `api` and `worker` (Variables tab).
   Use the prod Supabase creds from step 1. Reference Redis via Railway:
   ```
   APP_ENV=production
   DATABASE_URL=postgresql+asyncpg://postgres:<pwd>@db.<prod-ref>.supabase.co:5432/postgres
   SUPABASE_URL=https://<prod-ref>.supabase.co
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   REDIS_URL=${{Redis.REDIS_URL}}
   GEMINI_API_KEY=...
   GEMINI_TAGGING_MODEL=gemini-2.0-flash
   GEMINI_SUGGESTION_MODEL=gemini-2.0-flash
   OPENWEATHERMAP_API_KEY=...
   SECRET_KEY=<random 32+ chars>
   REMOVEBG_API_KEY=...            # optional fallback
   ```
   `PORT` is injected by Railway — do not set it.
6. **Verify**: open `https://<api-domain>/health` → `{"status":"ok"}`.

---

## 3. CI / CD

No `cd.yml` needed: Railway auto-deploys on every commit to `main`, and **branch
protection** (require `ci-backend` + `ci-mobile`) ensures `main` only ever receives
CI-passed code. The CI gate lives at the PR, the deploy trigger lives on Railway.

Mobile (`EXPO_PUBLIC_*`) points at the **prod** Supabase URL/anon key and the Railway
api domain (`EXPO_PUBLIC_API_URL`) — set in `mobile/.env.local` / EAS build profile.

---

## 4. Adding a migration later (two-DB workflow)

The `supabase/migrations/` folder is shared. A new migration must be applied to **both**
projects — dev first to test, prod after release:

```bash
# 1. write supabase/migrations/008_xxx.sql
SUPABASE_DB_URL="<dev direct url>"  make migrate    # test on dev
# 2. after PR merged to main
SUPABASE_DB_URL="<prod direct url>" make migrate    # promote to prod
```

⚠️ Forgetting step 2 → prod schema drifts behind the code. Apply to prod as part of
every release that includes a migration.

---

## 5. Post-deploy smoke checklist

- [ ] `GET /health` → 200 on the public api domain
- [ ] Merge a PR to `main` → Railway redeploys api + worker in < 3 min
- [ ] Upload a photo from a real phone → status reaches `ready` (worker processed it)
- [ ] `supabase migration list` on prod shows `001..007`
- [ ] 51st upload in a day → `429 RATE_LIMITED`; 11th suggest in a day → `429`

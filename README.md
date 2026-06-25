# VisePanda

> Your China travel butler — English-native, mobile-first, AI-powered.
> 视野 · shìyě · the field of view.

VisePanda helps foreign visitors navigate China: ask anything in **Chat**,
translate instantly with one-tap voice in **Translate**, and browse a
city-anchored **Dashboard** of hotels, deals, weather, and tools.

- **Live:** https://claude.go2china.space
- **Design:** rooted in Chinese craft — paper-white surfaces, qinghua blue,
  cinnabar seal-chops — never Chinoiserie pastiche.
- **Spec:** [`docs/superpowers/specs/2026-06-24-visepanda-v7-design.md`](docs/superpowers/specs/2026-06-24-visepanda-v7-design.md)

## Architecture

| Layer    | Tech                                                   |
| -------- | ------------------------------------------------------ |
| Backend  | Python 3.11 stdlib (WSGI). HTTP via `urllib.request`.  |
| Frontend | Vanilla JS (ES modules) + CSS custom properties        |
| Hosting  | Vercel (`@vercel/python`)                              |
| Chat     | DeepSeek V4 Flash (`deepseek-chat`)                    |
| Translate| DeepSeek V4 Flash                                      |
| TTS      | Qwen3-TTS (Alibaba DashScope) — `qwen3-tts-flash`      |
| STT      | Qwen3-ASR (Alibaba DashScope) — `qwen3-asr-flash`      |
| Auth     | Email/password (PBKDF2-SHA256) + Google OAuth          |
| Email    | Resend                                                 |
| Storage  | Supabase REST (Postgres) + local JSON fallback (dev)   |
| Weather  | Open-Meteo (no key required)                           |

## Run locally

```bash
git clone https://github.com/JTCAO515/VP-Claude-Web.git
cd VP-Claude-Web
python -m api.index   # opens http://127.0.0.1:8765
```

The dev server uses `wsgiref` directly — no install, no dependencies.

For Vercel parity (full edge runtime + env-var resolution):
```bash
npx vercel dev
```

## Environment variables

All optional. The app boots with no keys; each integration degrades
gracefully when its key is absent.

| Variable                | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `DEEPSEEK_API_KEY`      | Chat + translation                                |
| `DEEPSEEK_BASE_URL`     | Default `https://api.deepseek.com`                |
| `DEEPSEEK_MODEL`        | Default `deepseek-chat`                           |
| `DASHSCOPE_API_KEY`     | Qwen3-TTS + Qwen3-ASR                             |
| `QWEN_TTS_MODEL`        | Default `qwen3-tts-flash`                         |
| `QWEN_TTS_VOICE`        | Default `Chelsie`                                 |
| `QWEN_ASR_MODEL`        | Default `qwen3-asr-flash`                         |
| `SUPABASE_URL`          | e.g. `https://abcd.supabase.co`                   |
| `SUPABASE_SERVICE_KEY`  | service-role key for server-side writes           |
| `SUPABASE_ANON_KEY`     | public anon key (reserved for future client use)  |
| `RESEND_API_KEY`        | sending verification emails                       |
| `RESEND_FROM`           | Default `VisePanda <hello@go2china.space>`        |
| `GOOGLE_CLIENT_ID`      | OAuth client id — from Google Cloud Console        |
| `GOOGLE_CLIENT_SECRET`  | OAuth secret                                      |
| `GOOGLE_REDIRECT_URI`   | Default `${APP_BASE_URL}/api/auth/callback`       |
| `AMAP_JS_KEY`           | 高德地图 (Amap) JS API key — used in Plan's map column |
| `AMAP_SECURITY_CODE`    | Amap's paired security code (safe to expose client-side per Amap's docs) |
| `AMAP_WEB_SERVICE_KEY`  | Amap **Web服务** key (different type from `AMAP_JS_KEY`) — server-side POI ratings |
| `CTRIP_UNION_API_KEY`   | 携程联盟 (Ctrip/Trip.com Union) affiliate app key  |
| `CTRIP_UNION_API_SECRET`| Ctrip Union signing secret                        |
| `CTRIP_UNION_PID`       | Ctrip Union promotion/affiliate id (for link attribution) |
| `MEITUAN_UNION_API_KEY` | 美团联盟 (Meituan Union) affiliate app key         |
| `MEITUAN_UNION_API_SECRET` | Meituan Union signing secret                  |
| `JWT_SECRET`            | 32+ char random hex; auto-generated if missing    |
| `APP_BASE_URL`          | Default `https://claude.go2china.space`           |
| `APP_ENV`               | `production` or `development`                     |

All of the above are placeholders in this repo (empty strings) — fill them
in via the Vercel dashboard under Project → Settings → Environment Variables,
then redeploy. None are required for the app to boot or to demo end-to-end.

**Fallback matrix:**

| Missing key            | Behavior                                          |
| ---------------------- | ------------------------------------------------- |
| `DEEPSEEK_API_KEY`     | Chat returns templated reply; itinerary Generate falls back to a 1-stop-per-day stub; Translate stub |
| `DASHSCOPE_API_KEY`    | TTS/STT fall back to Web Speech API in browser    |
| `SUPABASE_*`           | Dev: local JSON file; prod: auth endpoints 503    |
| `RESEND_API_KEY`       | Account auto-verified on register                 |
| `GOOGLE_CLIENT_*`      | "Continue with Google" button hidden              |
| `AMAP_JS_KEY`          | Plan's map column shows the striped placeholder + numbered pins instead of a live map |
| `AMAP_WEB_SERVICE_KEY` | Rating badges simply don't appear (not an error)  |
| `CTRIP_UNION_*`        | Hotels/Transport tools show curated local data + an untracked link to the right Trip.com section |
| `MEITUAN_UNION_*`      | Group deals tool shows curated local data + a link to meituan.com |
| `JWT_SECRET`           | Per-process random secret (sessions reset on boot)|

### Booking & ratings — what's actually possible

Dianping has **no public API** for third parties to pull reviews or ratings
— that data requires a formal licensing deal with Meituan/Dianping. Meituan
itself doesn't expose an order-placement API to outside apps either. What
*is* realistically available, and what this app integrates:

- **携程联盟 (Ctrip/Trip.com Union)** — an affiliate/CPS program. Search
  their hotel inventory and generate a tracked deep link; the user completes
  checkout on Trip.com. Apply at [union.ctrip.com](https://union.ctrip.com).
- **美团联盟 (Meituan Union)** — same affiliate model, scoped to group-buy
  deals. Apply at [union.meituan.com](https://union.meituan.com).
- **Amap (高德地图) POI ratings** — used as the realistic substitute for
  Dianping ratings. Amap's own POI search returns a `rating` field for
  dining/attraction categories, sourced from its own review data.

Until partner accounts are approved, `api/partners.py` returns curated
local data (`data` already in `api/dashboard.py`) plus a safe, untracked
link to the relevant Trip.com/Meituan section — never a guessed or
fabricated deep-link URL.

### Setting up Google Sign-In

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an OAuth 2.0 Client ID (type: Web application).
2. Authorized redirect URI: `https://claude.go2china.space/api/auth/callback`
   (or your `APP_BASE_URL` + `/api/auth/callback`).
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel.
4. Redeploy — the "Continue with Google" button appears automatically once
   `has_google` flips true in `/api/config/public`.

### Setting up Amap (高德地图) for the Plan map

1. Register at [console.amap.com](https://console.amap.com/) and create a
   **Web端 (JS API)** application key.
2. Amap's JS API requires a paired "安全密钥" (security code) for v2.0+ —
   copy both into `AMAP_JS_KEY` and `AMAP_SECURITY_CODE` in Vercel.
3. Redeploy. Plan's map column lazy-loads the Amap SDK only when a key is
   present (see `web/js/map.js`); with no key it shows the original striped
   placeholder with numbered pins, so the UI never breaks while waiting on
   a key.

## Supabase setup

When you provision a Supabase project, run this once in the SQL editor:

```sql
-- The full SQL is in api/storage.py (constant SCHEMA_SQL).
-- It creates: users, itineraries, favorites, chat_sessions, chat_messages.
```

Then set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in Vercel and redeploy.

## API surface

```
GET  /api/health
GET  /api/config/public
POST /api/auth/register          { email, password, name? }
POST /api/auth/login             { email, password }
POST /api/auth/verify            { email, code }
POST /api/auth/verify/resend     { email }
GET  /api/auth/google            → 302 to Google consent
GET  /api/auth/callback          OAuth callback
GET  /api/auth/profile
POST /api/auth/logout
DELETE /api/auth/account
POST /api/chat                   { message, history?, session_id? }
POST /api/translate              { text, direction: 'en->zh' | 'zh->en' }
POST /api/tts                    { text, voice?, model? } → audio/mpeg
POST /api/stt                    (multipart: audio file)  → { text }
GET  /api/translations           → categories + counts + data
GET  /api/translations/<slug>    phrases | attractions | culture | dining
GET  /api/cities                 → { cities: [...] }
GET  /api/cities?id=<id>
GET  /api/hotels?city=<id>
GET  /api/deals?city=<id>
GET  /api/tools
GET  /api/tools?id=<id>
GET  /api/maps?city=<id>
GET  /api/weather?lat=&lon=
GET  /api/itinerary              scratch itinerary (no trip bound)
PUT  /api/itinerary              { days: [...] }
POST /api/itinerary/generate     { cities, day_count, pace?, travelers? } → DeepSeek-drafted days
GET  /api/trips                  → { trips: [...] }
GET  /api/trips/<id>
POST /api/trips                  { name, start_date?, day_count?, cities?, status? }
PUT  /api/trips/<id>             { ...any of: name, start_date, day_count, cities, status, progress, days }
DELETE /api/trips/<id>
GET  /api/favorites?kind=<kind>
POST /api/favorites              { kind, ref_id, payload? }
DELETE /api/favorites/<id>
GET  /api/chat-history
GET  /api/chat-history/<id>
GET  /api/partners/hotels?city=<id>&checkin=&checkout=
GET  /api/partners/transport?from=&to=&date=&mode=train|flight
GET  /api/partners/deals?city=<id>
GET  /api/ratings?city=<id>&category=hotel|dining|attraction
```

All JSON responses are `{ ok: true, ...data }` or
`{ ok: false, error: "human-readable string", code?: "machine_code" }`.

## Project layout

```
api/                  WSGI handlers + integrations (stdlib only)
data/translations/    Curated EN/中 phrase library (preserved from v6)
docs/superpowers/     Spec + implementation plan
web/                  Static SPA — vanilla JS + CSS
vercel.json           Routes /api/* → api/index.py, /web/* → static
```

## License

Private project.

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
| `GOOGLE_CLIENT_ID`      | OAuth client id                                   |
| `GOOGLE_CLIENT_SECRET`  | OAuth secret                                      |
| `GOOGLE_REDIRECT_URI`   | Default `${APP_BASE_URL}/api/auth/callback`       |
| `JWT_SECRET`            | 32+ char random hex; auto-generated if missing    |
| `APP_BASE_URL`          | Default `https://claude.go2china.space`           |
| `APP_ENV`               | `production` or `development`                     |

**Fallback matrix:**

| Missing key            | Behavior                                          |
| ---------------------- | ------------------------------------------------- |
| `DEEPSEEK_API_KEY`     | Chat returns templated reply; Translate stub      |
| `DASHSCOPE_API_KEY`    | TTS/STT fall back to Web Speech API in browser    |
| `SUPABASE_*`           | Dev: local JSON file; prod: auth endpoints 503    |
| `RESEND_API_KEY`       | Account auto-verified on register                 |
| `GOOGLE_CLIENT_*`      | "Continue with Google" button hidden              |
| `JWT_SECRET`           | Per-process random secret (sessions reset on boot)|

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
GET  /api/itinerary
PUT  /api/itinerary              { days: [...] }
GET  /api/favorites?kind=<kind>
POST /api/favorites              { kind, ref_id, payload? }
DELETE /api/favorites/<id>
GET  /api/chat-history
GET  /api/chat-history/<id>
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

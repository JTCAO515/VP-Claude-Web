# VisePanda v7.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline batch execution authorized by user — no per-task review required).

**Goal:** Rewrite VisePanda from scratch as v7.0 — Chat-primary IA, Chinese visual identity, Qwen3 voice, Supabase auth, deployed to Vercel.

**Architecture:** Python stdlib WSGI backend (no third-party deps; HTTP via `urllib`) + Vanilla JS / CSS-custom-properties frontend, served as static files. All AI/voice/storage providers integrated via REST. Graceful degradation when API keys are missing.

**Tech Stack:** Python 3.11 stdlib · Vanilla JS (ES modules) · DeepSeek (chat + translate) · Qwen3-TTS / Qwen3-ASR via Alibaba DashScope · Supabase REST · Resend · Google OAuth · Vercel.

## Global Constraints

- **Stdlib only** on backend. HTTP via `urllib.request`. No `requests`, `flask`, `psycopg`, etc.
- **All API keys read from env vars**, all left empty by default. Code must gracefully degrade when any is empty.
- **Mobile-first.** Design viewport 360–430px, scale up to desktop.
- **English-native** UI copy. Chinese only inside translation content + chop characters.
- **Visual rules:**
  - Cinnabar `#c63d2f` appears ONLY inside seal-chops (square red boxes with one character). Never on CTAs/links/alerts.
  - Primary action color is qinghua-blue `#1e6f9f`. Errors are ink-on-dai-green-tint.
  - Border-radius max 4px; cards 2px; modals 0px.
  - Border-width 0.5px hairlines in `--stone-gray`.
  - Single body-level paper-noise SVG background at 4% opacity.
- **Preserve** `data/translations/*.json` verbatim.
- **Push directly to `main`**. No feature branches.
- **Spec reference:** `docs/superpowers/specs/2026-06-24-visepanda-v7-design.md`.

## File map

```
api/
├── __init__.py            (already exists, empty)
├── index.py               (rewrite — WSGI router)
├── common.py              (rewrite — http, json, cookies, parse_query, parse_json_body)
├── config.py              (rewrite — env reads + has_X helpers)
├── health.py              (rewrite — /api/health)
├── jwt_util.py            (NEW — stdlib HMAC-SHA256 JWT)
├── storage.py             (NEW — Supabase REST + JSON fallback)
├── email_resend.py        (NEW — Resend client)
├── google_oauth.py        (NEW — OAuth dance)
├── auth.py                (rewrite — register/login/verify/oauth/profile/logout)
├── chat.py                (rewrite — DeepSeek)
├── translate.py           (NEW — DeepSeek-as-translator)
├── tts.py                 (NEW — Qwen3-TTS proxy)
├── stt.py                 (NEW — Qwen3-ASR proxy)
├── dashboard.py           (already drafted — keep+polish)
├── translations.py        (rewrite — static JSON serve)
├── itinerary.py           (NEW)
├── favorites.py           (NEW)
└── chat_history.py        (NEW)

web/
├── index.html             (NEW — SPA shell)
├── manifest.json          (NEW)
├── sw.js                  (NEW)
├── favicon.svg            (NEW — paper-blue panda mark)
├── assets/
│   └── paper-noise.svg    (NEW)
├── css/
│   ├── tokens.css         (NEW)
│   ├── reset.css          (NEW)
│   ├── base.css           (NEW)
│   ├── components.css     (NEW — chop, bilingual-term, card, chip, button, sheet)
│   ├── chat.css           (NEW)
│   ├── dashboard.css      (NEW)
│   ├── translate.css      (NEW)
│   └── auth.css           (NEW)
└── js/
    ├── app.js             (NEW — boot, router, view switching, FAB+drawer)
    ├── api.js             (NEW — fetch wrapper + auth refresh)
    ├── auth.js            (NEW — sign-in sheet, verify, OAuth)
    ├── chat.js            (NEW)
    ├── dashboard.js       (NEW)
    ├── translate.js       (NEW)
    ├── voice.js           (NEW — MediaRecorder + audio playback)
    ├── itinerary.js       (NEW)
    ├── favorites.js       (NEW)
    └── components/
        ├── chop.js        (NEW)
        ├── bilingual-term.js (NEW)
        └── card.js        (NEW)

data/translations/         (PRESERVE — do not touch)
CHANGELOG.md               (NEW — fresh v7.0)
README.md                  (NEW — fresh v7.0)
vercel.json                (verify/adjust if needed)
requirements.txt           (keep stdlib-only)
.gitignore / .vercelignore (keep)
```

---

### Task 0: Wipe v6 + scaffold v7 directories

**Files:**
- All v6 files staged for deletion in working tree (already done by user).
- Create empty placeholder dirs.

**Steps:**
- [ ] `cd ~/projects/VP-Claude-Web`
- [ ] `git rm -r --cached -f` any tracked v6 files that need removal — actually use `git add -A` (it picks up staged deletions and new files together).
- [ ] Create empty dirs: `web/css web/js/components web/assets`.
- [ ] Commit:
  ```
  git add -A
  git commit -m "chore: v7.0 baseline — clear v6 scaffolding"
  ```

This commit lands the existing modifications + deletions on main. Subsequent tasks add v7 code on top.

---

### Task 1: Backend core — common, config, health, index router

**Files (rewrite):**
- `api/common.py`
- `api/config.py`
- `api/health.py`
- `api/index.py`

**Produces (for later tasks):**
- `common.json_response(start_response, payload, status="200 OK")`
- `common.error_response(start_response, message, status="400 Bad Request")`
- `common.parse_json_body(environ) -> dict`
- `common.parse_query(environ) -> dict`
- `common.parse_cookies(environ) -> dict`
- `common.set_cookie(name, value, max_age, secure=True, http_only=True, same_site="Lax") -> str` (returns header value)
- `common.http_request(url, method="GET", headers=None, data=None, timeout=15) -> (status, body_bytes, response_headers_dict)`
- `common.read_form_multipart(environ) -> dict` (for /api/stt audio upload)
- `config.has_deepseek() / has_voice() / has_supabase() / has_email() / has_google()`
- `config.DEEPSEEK_*`, `DASHSCOPE_*`, `SUPABASE_*`, `RESEND_*`, `GOOGLE_*`, `JWT_SECRET`, `APP_BASE_URL`, `APP_ENV`

**Implementation notes:**
- `api/index.py` route table maps path prefix to a handler module's `handle(environ, start_response, path)` function.
- Routes: `/api/health`, `/api/config/public`, `/api/auth/...`, `/api/chat`, `/api/translate`, `/api/tts`, `/api/stt`, `/api/cities|hotels|deals|tools|maps|weather`, `/api/translations/...`, `/api/itinerary`, `/api/favorites`, `/api/chat-history`.
- Add `GET /api/config/public` → `{ has_deepseek, has_voice, has_supabase, has_email, has_google }` for frontend feature-flag UI.
- `http_request`: returns `(int_status, bytes_body, dict_headers)`. Sets `Content-Type: application/json` when `data` is dict. Supports `Authorization` header. Catches `urllib.error.URLError` and returns `(0, b"", {})` on timeout.

**Tests** (informal smoke after each):
- `curl /api/health` → `{"ok": true, "version": "7.0.0"}`
- `curl /api/config/public` → returns 5 booleans, all `false` initially.

**Commit:** `feat(api): WSGI router, common helpers, config, health endpoint`

---

### Task 2: JWT util + storage abstraction (Supabase + JSON fallback)

**Files (new):**
- `api/jwt_util.py`
- `api/storage.py`

**Produces:**
- `jwt_util.encode(payload: dict, secret: str, exp_seconds: int = 7*86400) -> str`
- `jwt_util.decode(token: str, secret: str) -> dict | None` (None on invalid/expired)
- `storage.users.find_by_email(email) -> dict | None`
- `storage.users.find_by_id(id) -> dict | None`
- `storage.users.find_by_google_id(gid) -> dict | None`
- `storage.users.create(record) -> dict`
- `storage.users.update(id, patch) -> dict`
- `storage.users.delete(id) -> None`
- `storage.itineraries.upsert(user_id, days)`, `storage.itineraries.get(user_id)`
- `storage.favorites.list(user_id)`, `storage.favorites.add(user_id, kind, ref_id, payload)`, `storage.favorites.remove(id, user_id)`
- `storage.chat_sessions.list(user_id, limit=20)`, `storage.chat_sessions.create(user_id, title)`, `storage.chat_messages.append(session_id, role, content)`, `storage.chat_messages.list(session_id)`

**Implementation notes:**
- JWT: header `{"alg":"HS256","typ":"JWT"}`. Base64url-encode without padding (manual: `base64.urlsafe_b64encode(...).rstrip(b"=").decode()`). Sign with `hmac.new(secret.encode(), msg, hashlib.sha256).digest()`.
- `storage.py` exposes object-like namespaces (`users`, `itineraries`, `favorites`, `chat_sessions`, `chat_messages`). Internally branches on `config.has_supabase()`:
  - **Supabase mode**: REST calls to `${SUPABASE_URL}/rest/v1/${table}` with `Authorization: Bearer ${SUPABASE_SERVICE_KEY}` and `apikey` headers. PostgREST filter syntax (`?email=eq.${email}`). For inserts use `Prefer: return=representation`.
  - **JSON mode** (when `not has_supabase()`): file at `data/auth.db.json`. Read on each call (cheap enough for dev), write with `tempfile + os.replace` for atomicity. Allowed only when `APP_ENV != 'production'`; production raises 503.
- Schema sketch (for Supabase setup later — record in README):
  - `users(id uuid pk, email citext unique, password_hash text, google_id text unique, name text, avatar_url text, email_verified bool, verify_code_hash text, verify_expires timestamptz, created_at, updated_at)`
  - `itineraries(user_id uuid pk fk, days jsonb, updated_at)`
  - `favorites(id uuid pk, user_id fk, kind text, ref_id text, payload jsonb, created_at)`
  - `chat_sessions(id uuid pk, user_id fk, title text, created_at, updated_at)`
  - `chat_messages(id uuid pk, session_id fk, role text, content text, created_at)`
- Add `api/storage.py:SCHEMA_SQL` constant containing the CREATE TABLE statements for documentation (string only; not executed).

**Commit:** `feat(api): jwt_util + storage abstraction (supabase REST + JSON fallback)`

---

### Task 3: Auth handlers + Resend email + Google OAuth

**Files (new/rewrite):**
- `api/auth.py` (rewrite)
- `api/email_resend.py` (new)
- `api/google_oauth.py` (new)

**Produces:**
- WSGI handler at `api/auth.py:handle(environ, start_response, path)` dispatching to:
  - `POST /api/auth/register` — `{ email, password, name? }` → 201, sends verify code if Resend configured else marks verified immediately
  - `POST /api/auth/login` — `{ email, password }` → 200, sets `vp_session` cookie
  - `POST /api/auth/verify` — `{ email, code }` → 204
  - `POST /api/auth/verify/resend` — `{ email }` → 204
  - `GET /api/auth/google` — 302 to Google consent URL
  - `GET /api/auth/callback?code=...&state=...` — handles OAuth callback, creates/finds user, sets cookie, 302 to `/`
  - `GET /api/auth/profile` — requires session, returns user
  - `POST /api/auth/logout` — clears cookie
  - `DELETE /api/auth/account` — deletes user + cascades
- `email_resend.send_verify(email, code)` — POSTs to `https://api.resend.com/emails` with `from`, `to`, `subject="Your VisePanda code"`, simple HTML body. Returns bool.
- `google_oauth.consent_url(state)` and `google_oauth.exchange_code(code) -> { id, email, name, picture }` (verifies ID token via JWKs; for simplicity use `tokeninfo` endpoint).

**Implementation notes:**
- Password hashing: `hashlib.scrypt(password.encode(), salt=os.urandom(16), n=2**14, r=8, p=1, dklen=64)`. Store as `f"{salt_hex}:{hash_hex}"`.
- Verify code: 6 random digits via `secrets.choice("0123456789")`. Store SHA-256(code) + 10-minute expiry.
- Google OAuth: use `https://accounts.google.com/o/oauth2/v2/auth` for consent and `https://oauth2.googleapis.com/token` to exchange. Validate by calling `https://oauth2.googleapis.com/tokeninfo?id_token=...`. Store CSRF state in a short-lived cookie or signed param.
- `GOOGLE_REDIRECT_URI` defaults to `${APP_BASE_URL}/api/auth/callback`.
- When `RESEND_API_KEY` empty: `register` sets `email_verified=true` immediately; log warning to stderr.
- Session cookie: `vp_session`, 7-day expiry, refreshed on profile read (sliding).

**Helper:**
- `auth._require_session(environ) -> user_dict | None`. Other modules import this for protected endpoints.

**Commit:** `feat(api): auth — email/password + google oauth + resend verify`

---

### Task 4: Chat endpoint (DeepSeek)

**Files (rewrite):**
- `api/chat.py`

**Produces:**
- `POST /api/chat` body `{ message, history?, session_id? }` → `{ ok, reply, follow_ups[], provider, session_id? }`
- `GET /api/chat` → `{ ok, provider, model }`

**Implementation notes:**
- System prompt (verbatim): "You are VisePanda, an English-native, mobile-friendly China travel butler for foreign visitors. Answer concisely (under 220 words). Be specific to China travel: visas, transport (12306, Didi, metro), foreigner-friendly hotels, dining, payments (Alipay TourCard, WeChat Pay), SIM/eSIM, VPN context, etiquette, and emergency help. Use short paragraphs and small bullet lists when useful. After your answer, on a new line, output exactly: FOLLOWUPS: q1 | q2 | q3 (three short follow-up questions a curious traveler would ask next)."
- Truncate history to last 12 messages.
- Parse `FOLLOWUPS:` suffix; fall back to 3 canned questions if missing.
- When `not has_deepseek()`: return a templated local reply (echoes user, gives generic 3-bullet advice).
- When user is authed AND `session_id` provided: persist user + assistant message pair via `storage.chat_messages.append`.

**Commit:** `feat(api): chat endpoint via DeepSeek with follow-ups`

---

### Task 5: Translate, TTS, STT

**Files (new):**
- `api/translate.py`
- `api/tts.py`
- `api/stt.py`

**Produces:**
- `POST /api/translate` `{ text, direction: "en→zh"|"zh→en", mode? }` → `{ ok, source, target, pinyin?, romanization?, provider }`
- `POST /api/tts` `{ text, voice?, model? }` → `audio/mpeg` bytes (with ETag header `W/"<sha256-prefix>"`)
- `POST /api/stt` multipart form with `file` field (`audio/webm` or `audio/wav`) → `{ ok, text, language? }`

**Implementation notes:**

`translate.py`:
- Uses DeepSeek with a focused prompt:
  > "Translate the following from {src} to {tgt}. Output exactly three lines: line 1 the translation in {tgt}; line 2 pinyin with tones IF tgt is Chinese else empty line; line 3 a one-sentence cultural note IF helpful else empty. No other text."
- Direction `en→zh` → src=English, tgt=Chinese; reverse for `zh→en`.
- Parses 3 lines; returns the second as `pinyin` when present.

`tts.py`:
- DashScope endpoint: `POST https://dashscope.aliyuncs.com/api/v1/services/audio/tts/multimodal-generation/generation`
- Body: `{ "model": QWEN_TTS_MODEL, "input": { "text": text, "voice": voice }, "parameters": { "format": "mp3", "sample_rate": 24000 } }`
- Auth header: `Authorization: Bearer ${DASHSCOPE_API_KEY}`, plus `X-DashScope-DataInspection: disable`.
- Response includes a URL for the audio file — fetch and stream that. (DashScope returns either base64 or URL depending on model variant — try URL first, fall back to inline base64.)
- In-memory LRU cache (100 entries, 1-hour TTL): key = `sha256(text|voice|model)`.
- ETag header so the browser can cache: `If-None-Match` returns 304.
- When `DASHSCOPE_API_KEY` empty: return `503 + { ok: false, error: "tts_unavailable", fallback: "web_speech" }` so frontend can fall back to `speechSynthesis`.

`stt.py`:
- Accepts `multipart/form-data` with `file` field. Use `common.read_form_multipart` (stdlib `email.parser` based).
- DashScope ASR endpoint: `POST https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription`
- For short audio (<60s), send inline base64.
- Auth header same as TTS.
- When key empty: 503 + suggestion to use Web Speech API.

**Commit:** `feat(api): translate (DeepSeek) + Qwen3-TTS + Qwen3-ASR proxies`

---

### Task 6: Dashboard data + translations serving

**Files:**
- `api/dashboard.py` (keep current draft + tighten)
- `api/translations.py` (rewrite — serve `data/translations/{slug}.json`)

**Produces:**
- `GET /api/cities`, `GET /api/cities?id=<>`, `GET /api/hotels?city=<>`, `GET /api/deals?city=<>`, `GET /api/tools`, `GET /api/tools?id=<>`, `GET /api/maps?city=<>`, `GET /api/weather?lat=<>&lon=<>`
- `GET /api/translations/<slug>` reads `data/translations/<slug>.json` (whitelist: `phrases`, `attractions`, `culture`, `dining`).

**Implementation notes:**
- Keep curated `CITIES/HOTELS/DEALS/TOOLS` python dicts in dashboard.py (already there).
- Expand CITIES to ~12 to cover top foreign-tourist cities.
- `translations.py`: only allow whitelisted slugs; return `{ ok: true, slug, ...content }`.

**Commit:** `feat(api): dashboard data endpoints + static translations serving`

---

### Task 7: User data — itinerary, favorites, chat history

**Files (new):**
- `api/itinerary.py`, `api/favorites.py`, `api/chat_history.py`

**Produces:**
- `GET /api/itinerary` → `{ ok, days: [...] }` (empty array if unauthed)
- `PUT /api/itinerary` `{ days: [...] }` → `{ ok }` (requires auth)
- `GET /api/favorites?kind=<optional>` → `{ ok, items: [...] }`
- `POST /api/favorites` `{ kind, ref_id, payload? }` → `{ ok, id }`
- `DELETE /api/favorites/<id>` → 204
- `GET /api/chat-history` → `{ ok, sessions: [{ id, title, updated_at }] }`
- `GET /api/chat-history/<id>` → `{ ok, messages: [{ role, content }] }`

**Implementation notes:**
- All POST/PUT/DELETE require `auth._require_session`. Return `401 { ok: false, error: "auth_required" }` when unauthed.
- GETs return empty when unauthed (no error).
- Itinerary day shape (frontend contract): `{ day_index: 1, date: "2026-07-01", slots: { morning: [item], afternoon: [item], evening: [item] } }`. Item shape: `{ kind: "chat"|"hotel"|"deal"|"text", ref_id?, label, note? }`.

**Commit:** `feat(api): itinerary + favorites + chat-history endpoints`

---

### Task 8: Frontend foundation — shell, tokens, components, PWA

**Files (new):**
- `web/index.html`, `web/manifest.json`, `web/sw.js`, `web/favicon.svg`
- `web/assets/paper-noise.svg`
- `web/css/tokens.css`, `reset.css`, `base.css`, `components.css`
- `web/js/app.js`, `api.js`, `components/chop.js`, `bilingual-term.js`, `card.js`

**Implementation notes:**

`index.html` skeleton:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#f5f0e8">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" href="/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:wght@400;500;600&family=Noto+Serif+SC:wght@300;500;700&family=Noto+Sans+SC:wght@400;500&family=IBM+Plex+Mono:wght@400&display=swap">
  <link rel="stylesheet" href="/web/css/tokens.css">
  <link rel="stylesheet" href="/web/css/reset.css">
  <link rel="stylesheet" href="/web/css/base.css">
  <link rel="stylesheet" href="/web/css/components.css">
  <link rel="stylesheet" href="/web/css/chat.css">
  <link rel="stylesheet" href="/web/css/dashboard.css">
  <link rel="stylesheet" href="/web/css/translate.css">
  <link rel="stylesheet" href="/web/css/auth.css">
  <title>VisePanda — your China travel butler</title>
</head>
<body>
  <header class="app-header">
    <button id="open-dashboard" aria-label="Open dashboard">☰</button>
    <span class="wordmark">VisePanda</span>
    <button id="open-account" aria-label="Account">👤</button>
  </header>
  <main id="view-chat" class="view"></main>
  <aside id="view-dashboard" class="drawer" aria-hidden="true"></aside>
  <dialog id="view-translate" class="modal"></dialog>
  <dialog id="view-auth" class="sheet"></dialog>
  <button id="fab-translate" class="fab" aria-label="Open translate">译</button>
  <script type="module" src="/web/js/app.js"></script>
</body>
</html>
```

`tokens.css`:
```css
:root {
  --paper-white: #f5f0e8;
  --paper-warm: #ede5d4;
  --ink-black: #2c2c2c;
  --ink-soft: #5a5550;
  --stone-gray: #a8a195;
  --qinghua-blue: #1e6f9f;
  --qinghua-deep: #16567d;
  --cinnabar: #c63d2f;
  --dai-green: #5a6d54;
  --pale-gold: #c9a961;

  --font-sans: 'Inter', system-ui, sans-serif;
  --font-serif: 'Newsreader', 'Georgia', serif;
  --font-sc-serif: 'Noto Serif SC', serif;
  --font-sc-sans: 'Noto Sans SC', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;

  --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-4: 16px; --space-5: 24px; --space-6: 32px;
  --space-7: 48px; --space-8: 64px;

  --radius-card: 2px;
  --radius-button: 4px;
  --hairline: 0.5px solid var(--stone-gray);
}
```

`base.css`:
- Body: `background-color: var(--paper-white); color: var(--ink-black); font-family: var(--font-sans); font-size: 16px; line-height: 1.5;`
- Body background-image: paper-noise.svg at 4% opacity, fixed.
- Header: position-sticky, top:0, flex row, padding-y 12px, padding-x 16px, bottom hairline.
- Buttons: clean reset.

`components.css`:
- `.chop` — inline-block, font-family Noto Serif SC weight 600, color paper-white, background cinnabar, padding `0.2em 0.3em`, font-size 0.9em.
- `.bilingual-term` — vertical stack: `.en` (Newsreader), `.zh` (Noto Sans SC), `.py` (Inter italic 0.75em ink-soft).
- `.card` — paper-white background, hairline border, 16px padding, 2px radius, no shadow (or `0 1px 0 rgba(44,44,44,0.04)`).
- `.chip` — inline-flex, hairline border, 6px padding, 4px radius, hover qinghua-blue border.
- `.btn-primary` — qinghua-blue background, paper-white text, 12px-16px padding, 4px radius.
- `.btn-outline` — transparent, qinghua-blue text, qinghua-blue 0.5px border.
- `.fab` — fixed bottom-right, 56px square, qinghua-blue bg, paper-white character 1.5em, slight shadow.
- `.drawer` — fixed left, 85vw max-width 420px, translateX(-100%) hidden, transition 200ms ease-out.
- `.modal` — full-bleed mobile, max-width 600px desktop, paper-white background.
- `.sheet` — bottom sheet, full-width, max 480px, slide up.
- `prefers-reduced-motion: reduce` → all transitions 0ms.

`components/chop.js`:
```js
export function chop(character) {
  const el = document.createElement('span');
  el.className = 'chop';
  el.textContent = character;
  el.setAttribute('aria-hidden', 'true');
  return el;
}
```

`components/bilingual-term.js`:
```js
export function bilingualTerm({ en, zh, py }) {
  const el = document.createElement('div');
  el.className = 'bilingual-term';
  el.innerHTML = `
    <span class="en">${en}</span>
    ${zh ? `<span class="zh">${zh}</span>` : ''}
    ${py ? `<span class="py">${py}</span>` : ''}
  `;
  return el;
}
```

`app.js` responsibilities:
- Register service worker.
- Boot: fetch `/api/config/public`, store features in `window.vp.features`.
- Boot: fetch `/api/auth/profile`; if 200, store user in `window.vp.user`.
- Wire `#open-dashboard` → dashboard.open(), `#open-account` → auth.open(), `#fab-translate` → translate.open().
- Initial view: chat.render().

`api.js`:
- `api.get(path)`, `api.post(path, body)`, `api.put(path, body)`, `api.delete(path)`.
- Always sends `credentials: 'include'`.
- 401 → trigger `auth.openSheet()` (lazy import), reject.
- Returns parsed JSON or throws Error with `.status` and `.body`.

`manifest.json`:
```json
{
  "name": "VisePanda",
  "short_name": "VisePanda",
  "description": "Your China travel butler.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f5f0e8",
  "theme_color": "#f5f0e8",
  "icons": [
    { "src": "/web/favicon.svg", "sizes": "any", "type": "image/svg+xml" }
  ]
}
```

`sw.js` (minimal v1 — task 13 polishes):
```js
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => self.clients.claim());
self.addEventListener('fetch', e => { /* network-first, no caching yet */ });
```

`favicon.svg`: 64×64 — paper-white circle, qinghua-blue 笔 brush stroke forming an abstract 笔 character. Inline SVG ~1 KB.

`paper-noise.svg`: filter-based noise via `feTurbulence baseFrequency=0.9 numOctaves=2`, opacity 0.04, repeated as background.

**Commit:** `feat(web): shell + tokens + reusable components + PWA boot`

---

### Task 9: Chat UI

**Files (new):**
- `web/js/chat.js`
- `web/css/chat.css`

**Produces:**
- `chat.render(container)` — initial render
- `chat.send(message)` — sends, appends, parses follow-ups, renders

**Implementation notes:**

Empty state HTML structure:
```html
<section class="chat-empty">
  <div class="hero">
    <div class="vertical-greeting">你<br>好</div>
    <p class="tagline">What can I help you with in China?</p>
  </div>
  <ul class="suggestions">
    <li><button class="chip">How do I set up Alipay TourCard as a foreigner?</button></li>
    <li><button class="chip">Which Chinese cities for 10 days?</button></li>
    <li><button class="chip">Best foreigner-friendly hotels in Beijing?</button></li>
    <li><button class="chip">How do I take the high-speed rail with my passport?</button></li>
  </ul>
</section>
<div class="chat-compose">
  <form id="chat-form">
    <textarea id="chat-input" placeholder="Ask anything…" rows="1" autocomplete="off"></textarea>
    <button type="submit" class="btn-primary" aria-label="Send">→</button>
  </form>
</div>
```

Conversation state structure:
- `<ol class="chat-log">` of `.msg.msg-user` / `.msg.msg-ai` items.
- AI bubble contains `.chop` (问) at top-right corner.
- Below AI bubble, `<ul class="followups">` of 3 chips.

`chat.css` highlights:
- `.vertical-greeting` — `font-family: var(--font-sc-serif); font-weight: 300; font-size: clamp(6em, 18vw, 9em); line-height: 0.9; letter-spacing: 0.08em; writing-mode: horizontal-tb;` (we render 你<br>好 stacked, not via CSS writing-mode, so it remains accessible).
- `.tagline` — Newsreader 1.25em, margin-top 32px.
- `.msg-user` — align-self end, background paper-warm, border-radius 2px, padding 12px 16px, max-width 78%.
- `.msg-ai` — align-self start, background paper-white, border-left 2px qinghua-blue, position relative for chop, max-width 88%.
- `.followups .chip` — qinghua-blue 0.5px border, padding 6px 10px, font-size 0.875em.
- `.chat-compose` — sticky bottom, top hairline, padding 12px 16px, paper-white background.
- `#chat-input` — auto-grow up to ~6 rows, no border, just paper-warm background, 4px radius, padding 10px 12px.

State: keep `messages = []` in module scope; persist `chat.draft` to localStorage on input.

If authed: after each round-trip, POST to `/api/chat` with `session_id`. If no session_id yet, server creates one and returns it; client stores `current_session_id` for the next turn.

**Commit:** `feat(web): chat UI with vertical 你好 hero + followups`

---

### Task 10: Translate UI + voice

**Files (new):**
- `web/js/translate.js`, `web/js/voice.js`
- `web/css/translate.css`

**Produces:**
- `translate.open()` / `translate.close()`
- Internal: input flow, hero card, fullscreen mode, phrase chips, history stack
- `voice.record({ onResult })` returns `{ stop }` — wraps MediaRecorder + POST to /api/stt
- `voice.play(text, { voice? })` — fetches `/api/tts`, plays via `<audio>`; falls back to `speechSynthesis` if 503

**Implementation notes:**

Modal HTML:
```html
<header class="modal-bar">
  <button class="close" aria-label="Close">✕</button>
  <span class="chop">译</span>
</header>
<section class="hero-card" id="hero-card">
  <!-- bilingual-term injected -->
  <div class="actions">
    <button class="play"  >▶ play</button>
    <button class="save"  >♥ save</button>
    <button class="full"  >⤢ show driver</button>
  </div>
</section>
<form class="translate-compose">
  <input type="text" placeholder="Type to translate…">
  <button type="button" id="mic" aria-label="Record">🎤</button>
  <button type="submit" aria-label="Translate">→</button>
</form>
<section class="phrase-chips">
  <button class="chip" data-cat="Taxi">🚕 Taxi</button>
  <button class="chip" data-cat="Hotel">🏨 Hotel</button>
  <button class="chip" data-cat="Restaurant">🍜 Food</button>
  <button class="chip" data-cat="Emergency">🚨 SOS</button>
  <button class="chip" data-cat="Shopping">🛍️ Shop</button>
</section>
<section class="phrase-list" id="phrase-list" hidden></section>
<section class="history" id="translate-history"></section>
```

Fullscreen "show driver":
- Toggle `body.translate-full` class.
- Inside `.translate-full`, hero card fills viewport with black background, paper-white Chinese huge.
- Listen for `orientationchange` to keep layout sensible.
- Use Wake Lock API if available: `navigator.wakeLock.request('screen')` — silently ignore if unsupported (out of scope to debug).

`voice.js` MediaRecorder:
```js
export async function record({ onResult }) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
  const chunks = [];
  mr.addEventListener('dataavailable', e => chunks.push(e.data));
  mr.addEventListener('stop', async () => {
    stream.getTracks().forEach(t => t.stop());
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const fd = new FormData(); fd.append('file', blob, 'audio.webm');
    try {
      const res = await fetch('/api/stt', { method: 'POST', body: fd, credentials: 'include' });
      if (!res.ok) throw new Error('stt_unavailable');
      const data = await res.json();
      onResult({ text: data.text, provider: 'qwen' });
    } catch {
      onResult({ error: 'stt_unavailable' });
    }
  });
  mr.start();
  return { stop: () => mr.stop() };
}
```

`voice.play`:
```js
export async function play(text, opts = {}) {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: opts.voice }),
    });
    if (!res.ok) throw new Error('tts_unavailable');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.addEventListener('ended', () => URL.revokeObjectURL(url));
    audio.play();
  } catch {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = /[一-鿿]/.test(text) ? 'zh-CN' : 'en-US';
      speechSynthesis.speak(u);
    }
  }
}
```

`translate.css` highlights:
- `.hero-card` — paper-white card, 24px padding, hairline border, position relative for chop top-right.
- `.hero-card .bilingual-term .zh` — Noto Serif SC, 2em, ink-black.
- `body.translate-full .modal` — fills viewport, black background.
- `body.translate-full .hero-card .zh` — `font-size: clamp(4em, 20vw, 8em);`, color paper-white.
- `.mic.recording` — qinghua-blue ring animation (`box-shadow` keyframes, respect reduced-motion).

**Commit:** `feat(web): translate modal — bilingual hero, show-driver fullscreen, Qwen voice`

---

### Task 11: Dashboard UI (drawer, city chips, 6 chapters)

**Files (new):**
- `web/js/dashboard.js`, `web/js/itinerary.js`, `web/js/favorites.js`
- `web/css/dashboard.css`

**Produces:**
- `dashboard.open()` / `dashboard.close()`
- City state in `localStorage.vp.city`
- Chapter renderers: now / stay / eat / move / plan / toolbox

**Implementation notes:**

Drawer HTML:
```html
<header class="drawer-bar">
  <button class="close">←</button>
  <span class="wordmark">VisePanda</span>
  <span class="chop">览</span>
</header>
<nav class="city-chips" id="city-chips"></nav>
<section class="chapter" data-key="now">
  <h2><span>Now <em>此刻</em></span><span class="chop">今</span></h2>
  <div class="chapter-body" id="now-body"></div>
</section>
<section class="chapter" data-key="stay">
  <h2><span>Stay <em>居</em></span><span class="chop">居</span></h2>
  <div class="chapter-body" id="stay-body"></div>
</section>
<section class="chapter" data-key="eat">
  <h2><span>Eat & Do <em>食</em></span><span class="chop">食</span></h2>
  <div class="chapter-body" id="eat-body"></div>
</section>
<section class="chapter" data-key="move">
  <h2><span>Move <em>行</em></span><span class="chop">行</span></h2>
  <div class="chapter-body" id="move-body"></div>
</section>
<section class="chapter" data-key="plan">
  <h2><span>Plan <em>程</em></span><span class="chop">程</span></h2>
  <div class="chapter-body" id="plan-body"></div>
</section>
<section class="chapter" data-key="toolbox">
  <h2><span>Toolbox <em>具</em></span><span class="chop">具</span></h2>
  <div class="chapter-body" id="toolbox-body"></div>
</section>
```

`dashboard.js` flow on open:
1. Read `localStorage.vp.city` (default to `beijing`).
2. Fetch `/api/cities` once and cache.
3. Render city chip row with active state.
4. For active city: parallel fetches `/api/weather?lat&lon`, `/api/hotels?city`, `/api/deals?city`, `/api/maps?city`, `/api/tools` (universal).
5. Render each chapter as data arrives (skeleton first).
6. Now chapter shows: weather card + first deal (today's "spotlight") + next itinerary slot.

`itinerary.js`:
- `getItinerary()` — if authed, fetch `/api/itinerary`; else read localStorage `vp.itinerary`.
- `saveItinerary(days)` — write localStorage AND PUT to `/api/itinerary` if authed.
- UI: render Day 1 / Day 2 / Day 3 default; "+ Add day"; each day has 3 slot rows (Morning/Afternoon/Evening).
- Tap empty slot → action sheet: `Ask AI to plan this slot` (opens chat with prefilled prompt) / `Pick a hotel` / `Pick a deal` / `Type free text`.

`favorites.js`:
- Heart icon component on hotels, deals, translations.
- `toggle(kind, ref_id, payload)` — calls POST/DELETE on `/api/favorites` when authed; localStorage shadow when unauthed.

`dashboard.css` highlights:
- `.drawer` shown via `aria-hidden="false"` and `transform: translateX(0)`. Backdrop is a separate `.drawer-backdrop` div.
- `.city-chips` — horizontal scroll, no scrollbar (mobile), each chip 12px padding, qinghua-blue when active.
- `.chapter h2` — flex row, justify-between, Newsreader 1.25em, ink-black; small bilingual `em` in ink-soft.
- `.chapter` separated by 48px vertical, with hairline above each except first.
- `.card-hotel` — flex row: name + meta column, badges row, price-band tag right.

**Commit:** `feat(web): dashboard drawer with city anchoring + 6 chapters`

---

### Task 12: Auth UI — bottom sheet, verify, OAuth

**Files (new):**
- `web/js/auth.js`
- `web/css/auth.css`

**Produces:**
- `auth.openSheet(reason?)` — opens sign-in sheet
- `auth.openVerify(email)` — shows code input
- `auth.signOut()`

**Implementation notes:**

Bottom sheet HTML (rendered by JS into `#view-auth`):
```html
<div class="sheet-content">
  <h2>Sign in to save</h2>
  <p class="sheet-sub">Chat history, itinerary, and favorites stay with you across devices.</p>
  <button class="btn-primary btn-google" id="btn-google">
    <span class="g-icon"></span> Continue with Google
  </button>
  <div class="divider"><span>or</span></div>
  <form id="email-form">
    <label>Email <input type="email" required></label>
    <label>Password <input type="password" required minlength="8"></label>
    <button class="btn-primary" type="submit">Continue</button>
  </form>
  <button class="link-btn" id="have-account">Already have an account? Sign in</button>
  <button class="link-btn" id="skip">Skip for now</button>
</div>
```

Logic:
- Form submit: try `/api/auth/login` first; on 404/401 try `/api/auth/register`; on 201 (new account) → openVerify(email).
- Google button hidden if `!window.vp.features.has_google`.
- Verify view: 6 input boxes for digits (autofocus and forward-focus on input).

`auth.css`:
- Sheet slides up from bottom on mobile, centered modal on desktop.
- `.btn-google` is qinghua-blue background with paper-white text — *not* the multicolor Google brand button (we maintain visual restraint). Small G icon SVG inline.

**Commit:** `feat(web): auth bottom sheet — email/password + google + email verify`

---

### Task 13: Service worker — cache shell + translations

**Files (modify):**
- `web/sw.js`

**Implementation:**
```js
const CACHE = 'vp-shell-v1';
const SHELL = [
  '/', '/web/index.html', '/web/manifest.json', '/web/favicon.svg',
  '/web/assets/paper-noise.svg',
  '/web/css/tokens.css', '/web/css/reset.css', '/web/css/base.css',
  '/web/css/components.css', '/web/css/chat.css', '/web/css/dashboard.css',
  '/web/css/translate.css', '/web/css/auth.css',
  '/web/js/app.js', '/web/js/api.js', '/web/js/chat.js',
  '/web/js/dashboard.js', '/web/js/translate.js', '/web/js/voice.js',
  '/web/js/auth.js', '/web/js/itinerary.js', '/web/js/favorites.js',
  '/web/js/components/chop.js', '/web/js/components/bilingual-term.js',
  '/web/js/components/card.js',
];
const TRANSLATIONS = [
  '/api/translations/phrases', '/api/translations/attractions',
  '/api/translations/culture',  '/api/translations/dining',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll([...SHELL, ...TRANSLATIONS])));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // App shell + translations: cache-first
  if (SHELL.some(p => url.pathname === p) || TRANSLATIONS.includes(url.pathname)) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
    return;
  }
  // Everything else: network
});
```

**Commit:** `feat(web): service worker — cache shell + translation JSON`

---

### Task 14: Documentation — CHANGELOG, README

**Files (new/rewrite):**
- `CHANGELOG.md`
- `README.md`

**CHANGELOG.md content** (matches spec §15):

```markdown
# Changelog

## v7.0.0 — 2026-06-24

### Added
- Complete rewrite of frontend (Vanilla JS + CSS custom properties)
- Chat-primary IA with persistent Translate FAB and Dashboard drawer
- Chinese visual system: paper-white surfaces, qinghua blue actions, cinnabar seal-chops
- Qwen3-TTS (Alibaba DashScope) for voice playback
- Qwen3-ASR (Alibaba DashScope) for voice input
- Auth system: email/password + Google OAuth + Resend email verification
- City-anchored Dashboard with six chapters (Now / Stay / Eat / Move / Plan / Toolbox)
- "Show driver" fullscreen translation mode
- Itinerary builder with local persistence + cloud sync
- Favorites for translations, hotels, deals
- PWA with service worker for offline phrase library

### Changed
- Replaced WSGI dispatcher (cleaner module layout)
- DeepSeek upgraded to `deepseek-chat` (V4 Flash tier)
- All Chinese text now has structural pinyin track

### Preserved
- `data/translations/*.json` content (verbatim from v6)
- Vercel deployment topology
- Python stdlib-only constraint on backend

### Removed
- Three-tab equal-weight IA (replaced by Chat-primary)
- Web Speech API as primary TTS/STT (now fallback only)
```

**README.md content** (concise, production-oriented):

```markdown
# VisePanda

> Your China travel butler — English-native, mobile-first, AI-powered.

VisePanda helps foreign visitors navigate China: ask anything in Chat, translate
instantly with one-tap voice, and browse a city-anchored Dashboard of hotels,
deals, weather, and tools.

**Live:** https://claude.go2china.space
**Stack:** Python 3.11 stdlib (WSGI) · Vanilla JS · DeepSeek · Qwen3-TTS/ASR
(Alibaba DashScope) · Supabase REST · Resend · Google OAuth · Vercel

## Quick start

```bash
git clone https://github.com/JTCAO515/VP-Claude-Web.git
cd VP-Claude-Web
# Backend has no dependencies. To preview locally:
python -m http.server --cgi 3000  # NOT exact — Vercel CLI recommended:
npx vercel dev
```

## Environment variables

All optional — VisePanda degrades gracefully when keys are missing.

| Variable | Purpose |
|----------|---------|
| `DEEPSEEK_API_KEY` | Chat + translation (DeepSeek V4 Flash) |
| `DASHSCOPE_API_KEY` | Voice (Qwen3-TTS, Qwen3-ASR) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | User accounts, itinerary, favorites |
| `RESEND_API_KEY` | Email verification codes |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `JWT_SECRET` | Session signing (auto-generated if missing) |
| `APP_BASE_URL` | OAuth redirect base |

## Supabase schema

See `api/storage.py` constant `SCHEMA_SQL` for the canonical CREATE TABLE
statements. Run them once in the Supabase SQL editor.

## Architecture

See [`docs/superpowers/specs/2026-06-24-visepanda-v7-design.md`](docs/superpowers/specs/2026-06-24-visepanda-v7-design.md)
for the full v7 design spec.

## License

Private project.
```

**Commit:** `docs: CHANGELOG + README for v7.0`

---

### Task 15: Smoke + push + deploy

**Steps:**
- [ ] Local smoke: `python -c "from api import index"` should not error.
- [ ] Verify `vercel.json` still matches new file layout. Routes already accommodate `/web/*` and `/api/*`.
- [ ] `git add -A && git push origin main`.
- [ ] Vercel auto-deploys. Confirm at https://claude.go2china.space within ~60s.
- [ ] No env vars filled → app should still load and show graceful fallbacks (no white screen).

**Commit (if any tweaks):** `chore: final v7.0 tweaks for deploy`

---

## Self-review

**Spec coverage** (each section → task):
- §1–4 Subject / IA / Goals / Visual identity → encoded as Global Constraints + Task 8 (tokens + components)
- §5 Chat → Task 4 (backend) + Task 9 (frontend)
- §6 Dashboard → Task 6 (data) + Task 11 (UI)
- §7 Translate → Task 5 (backend) + Task 10 (UI)
- §8 Auth → Task 3 (backend) + Task 12 (UI)
- §9 Storage → Task 2
- §10 API surface → Tasks 1, 3, 4, 5, 6, 7
- §11 Project structure → file map at top of plan
- §12 Env vars → Task 1 (`config.py`) + Task 14 (README)
- §13 Fallback strategy → encoded in every backend task
- §14 Deployment → Task 15
- §15 CHANGELOG → Task 14
- §16 Open questions → resolved in tasks (cache TTL = 1h in §5; SW caches translations only in §13; pagination deferred)
- §17 Definition of done → Task 15 + manual verification

**Placeholder scan:** No "TBD/TODO/etc." in plan body.

**Type consistency:**
- `storage.users.find_by_email`, `find_by_id`, `find_by_google_id`, `create`, `update`, `delete` → consistent across Task 2 and Task 3.
- `auth._require_session(environ)` → used by Tasks 4, 5, 7.
- `voice.play(text, opts)`, `voice.record({onResult})` → consistent.
- API contract: every response `{ok, ...}` or `{ok:false, error}` — consistent.
- Itinerary item shape defined once in Task 7, used by Task 11.

Plan is complete.

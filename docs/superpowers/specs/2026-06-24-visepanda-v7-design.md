# VisePanda v7.0 — Design Spec

- **Date**: 2026-06-24
- **Status**: Approved for implementation planning
- **Authors**: Claude (brainstorming) + JTCAO515 (product owner)
- **Predecessor**: v6.2.1 (icon-rail travel butler MVP)

## 1. Subject & audience

A foreigner has just landed in China. It is their first hour: tired, anxious, can't read signs. **VisePanda is the calm Chinese friend who already lives here** — English-native, mobile-first, deferentially helpful, never noisy.

- **Primary user**: foreign tourist, business traveler, exchange student in China (English-native)
- **Job to be done**: *Get me unstuck right now*, plus *Help me plan what's next*
- **Device**: 95% mobile, 5% desktop. Designed mobile-first, responsive up
- **Network**: variable — often hotel Wi-Fi or local SIM through VPN. Tolerant of timeouts

## 2. Goals & non-goals

### Goals
1. Single-screen "ask anything" chat that handles 70% of needs (DeepSeek)
2. One-tap real-time translation, including a "show this to the driver" hero moment
3. Curated city-by-city travel reference for the remaining 30% (Dashboard)
4. Account system that is **optional for usage** but **necessary for memory** (history, favorites, itinerary)
5. A visual identity rooted in Chinese craft that is not Chinoiserie pastiche

### Non-goals (out of scope for v7.0)
- Native iOS/Android apps (PWA only)
- In-app booking (hotels/flights/tickets) — we link out
- Multi-language UI (English-only UI in v7.0; Chinese strings only inside translation content)
- Real-time location tracking
- User-generated content / reviews
- Camera OCR menu translation (parked for v7.1)

## 3. Information architecture

**Decision**: Chat-primary with Translate floating action button (FAB) and Dashboard drawer.

```
┌─ Header ─────────────────── [☰ Dashboard]      [👤 Account]
│
│            CHAT (always the main screen)
│            • Vertical 你好 hero on empty state
│            • DeepSeek conversation with 3 follow-up chips
│            • Compose bar pinned bottom
│
└─ FAB (right-bottom) ──── [🐼 译]   one-tap to Translate
```

- **Chat** is the home screen. Always shown on cold open.
- **Translate** is invoked via a persistent FAB (right-bottom). Opens as full-screen modal (not a tab). Closes back to Chat.
- **Dashboard** is invoked from the top-left ☰. Opens as a slide-from-left drawer (full height, ~85% width on mobile).
- **Account** is the top-right avatar. Unauthed → bottom-sheet sign-in. Authed → profile menu.

### Why not three tabs?
The three concerns have different mental loads. Chat is open-ended. Translate is panic / real-time. Dashboard is reference / browse. Putting them at equal weight (three tabs) under-serves the panic case (Translate needs one tap from anywhere) and over-promotes Dashboard (which is read more like a book than visited like a tab).

## 4. Visual identity

### Color tokens
```
--paper-white   #f5f0e8   /* xuan paper, primary surface              */
--paper-warm    #ede5d4   /* secondary surface (cards, drawer)        */
--ink-black     #2c2c2c   /* primary text                             */
--ink-soft      #5a5550   /* secondary text                           */
--stone-gray    #a8a195   /* hairline borders, captions               */
--qinghua-blue  #1e6f9f   /* primary action, links, key brand color   */
--qinghua-deep  #16567d   /* hover / pressed                          */
--cinnabar      #c63d2f   /* CHOPS ONLY — earned, never decorative    */
--dai-green     #5a6d54   /* success, secondary signal                */
--pale-gold     #c9a961   /* subtle accent, sparingly                 */
```

**Discipline**: cinnabar (`#c63d2f`) appears *only* inside square seal-chops. Not CTAs, not links, not alerts. CTAs are qinghua blue. Errors are ink-black on a dai-green-tinted band, not red. This is the single most important visual rule.

### Typography
- **Display SC** (Chinese headlines): Noto Serif SC, weight 300 (Light), wide letter-spacing (`0.08em`)
- **Display EN** (English headlines): Newsreader (variable serif from Google Fonts, weight 400-600). **Not Inter or Söhne** — serif-vs-serif bilingual conversation
- **Body EN**: Inter (regular 400 / medium 500 / semibold 600)
- **Body CN inline**: Noto Sans SC
- **Pinyin / caption**: Inter italic, 0.75em, `--ink-soft`
- **Mono** (codes like 12306 reservation, pinyin tone marks if shown): IBM Plex Mono

### Layout vocabulary
- **Border radius**: 0–4px max. Paper has straight edges. Buttons 4px, cards 2px, modals 0px on mobile (full-bleed)
- **Borders**: 0.5px hairline of `--stone-gray` (use `border-width: 0.5px` — modern browsers honor sub-pixel on retina)
- **Shadows**: extremely light — `0 1px 0 rgba(44,44,44,0.04)` for cards. No drop shadows on buttons
- **Spacing scale**: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 (px)
- **Texture**: a single very-faint paper-noise SVG (`<feTurbulence>`) as global `<body>` background. Opacity 4%. Never use a raster scroll/banner PNG
- **Animations**: respect `prefers-reduced-motion`. Default: 200ms ease-out on enter, instant on exit. No bouncing, no parallax

### Signature element: the seal-chop (印章) system
Cinnabar exists only inside small square chops (≈1.5em × 1.5em). Each major surface or section gets one chop with a single Chinese character:

| Chop | Surface |
|------|---------|
| **问** | Chat (asking) |
| **览** | Dashboard root |
| **译** | Translate modal |
| **今** | Dashboard § Now (this moment) |
| **居** | Dashboard § Stay (hotels) |
| **食** | Dashboard § Eat & Do (deals) |
| **行** | Dashboard § Move (map/transit) |
| **程** | Dashboard § Plan (itinerary) |
| **具** | Dashboard § Toolbox (payment/SIM/VPN/emergency) |

Chop is rendered with `font-family: 'Noto Serif SC'; font-weight: 600; color: var(--paper-white); background: var(--cinnabar); padding: 0.2em 0.3em;` and a single hairline `box-shadow: 0 0 0 0.5px var(--cinnabar)`. No fake stone texture, no rotation, no skew. Flat.

### Second signature: the bilingual / pinyin lane
Wherever a Chinese term appears alongside English, render in a deliberate stack:
```
English term                  (Inter / Newsreader)
中文                          (Noto Sans SC)
pīnyīn                        (Inter italic 0.75em, --ink-soft)
```
This stack appears in: city names, neighborhood names, dish names, phrase entries, and the Translate hero card. It is *structural*, not decorative — meaning the rendering component (`<BilingualTerm>`) is reused throughout.

### Aesthetic risk taken
The Chat empty-state hero uses **vertical** Chinese typography (你 / 好 stacked top-to-bottom in tall Noto Serif SC), with the English `What can I help you with in China?` set horizontally beneath. Vertical Chinese is the risk most AI-generated "Chinese aesthetic" UIs are afraid to take. Reasoning: it's how serious Chinese typography (scrolls, signage, calligraphy) reads. Used once on the most prominent surface; nowhere else.

## 5. Chat (primary screen)

### Empty state
```
┌────────────────────────────────────────┐
│         ☰                        👤    │
│                                        │
│            你                          │  ← vertical, Noto Serif SC 6em
│            好                          │     ink-black, generous tracking
│                                        │
│   What can I help you with in China?   │  ← Newsreader 1.2em
│                                        │
│   ┌─────────────────────────────────┐  │
│   │ Suggested: How do I set up      │  │  ← 4 suggestion chips
│   │ Alipay TourCard as a foreigner? │  │
│   └─────────────────────────────────┘  │
│   ┌─────────────────────────────────┐  │
│   │ Which Chinese cities for 10 days│  │
│   └─────────────────────────────────┘  │
│   …                                    │
│                                        │
│ ┌──────────────────────────┬─────────┐ │
│ │ Ask anything…            │ Send →  │ │  ← compose bar pinned bottom
│ └──────────────────────────┴─────────┘ │
│                                  🐼译  │  ← Translate FAB
└────────────────────────────────────────┘
```

### Conversation state
- User bubble: `--paper-warm` background, ink-black text, right-aligned, max-width 78%
- AI bubble: `--paper-white` background with a left hairline border in `--qinghua-blue`, left-aligned, max-width 88%. The 「问」 chop sits at the top-right of the AI bubble
- After each AI reply, 3 follow-up chips render below in `--qinghua-blue` hairline outline. Tap = send that question
- Long-press AI message → menu: copy, regenerate, save (auth-only)

### Backend
- `POST /api/chat` with `{ message, history[] }` → `{ reply, follow_ups[], provider }`
- DeepSeek model: **`deepseek-chat`** (DeepSeek-V4 "Flash" tier; map to whatever `DEEPSEEK_MODEL` env var holds, default `deepseek-chat`)
- System prompt: "You are VisePanda, an English-native, mobile-friendly China travel butler for foreign visitors..." (full text in `api/chat.py`)
- Follow-ups format: AI appends `FOLLOWUPS: q1 | q2 | q3` on its own line; server parses and strips
- Fallback when `DEEPSEEK_API_KEY` empty: local templated reply with 3 canned follow-ups

### Auth interaction
- Unauthed: chat works, history kept in-memory only (cleared on refresh)
- Authed: history persisted to Supabase, sidebar shows last 20 conversations (out of scope for v7.0 UI — just save to DB)

## 6. Dashboard (drawer)

### Drawer chrome
- Slides from left, 85% width (mobile) / 420px (desktop)
- Dim backdrop (`rgba(44,44,44,0.4)`)
- Top: app wordmark + close
- Below wordmark: **city chip row** (auto-picked from Chat context if available; manual override). Chips show city name + tiny 中文 underneath
- Below city chips: vertical scroll of six chapters

### Chapter structure
Each chapter is a section with:
- A 1-line title in Newsreader (e.g. *Now* / 此刻 / cǐkè) with the section chop right-aligned
- A hairline divider beneath
- Chapter body (varies)

```
─── 此刻  Now              [今]
   weather card (temp, feel, "wear a jacket today")
   one deal-of-the-day card (curated)
   next itinerary item (if logged in & exists)

─── 居  Stay              [居]
   hotels for selected city, foreigner-friendly first

─── 食  Eat & Do          [食]
   deals (dining + experience) for selected city

─── 行  Move              [行]
   small map tile (city center pin) + transit tool shortcuts

─── 程  Plan              [程]
   itinerary builder (local storage; synced when logged in)

─── 具  Toolbox           [具]
   universal: Payment / SIM-eSIM / VPN / Emergency
```

### Chapter cards
- All cards share one component: hairline-bordered rectangle, 16px inner padding, no shadow
- Card title: Inter semibold 1rem, ink-black
- Card meta: Inter regular 0.875rem, ink-soft
- Foreigner-friendly hotels get a small dai-green badge "EN service ✓ · 外卡 ✓"
- Tap card → bottom sheet with full detail (no separate page)

### Itinerary § (Plan)
- Days are vertical lanes ("Day 1", "Day 2", ...)
- Each day has time-of-day slots (Morning / Afternoon / Evening)
- Tap empty slot → choose from: chat with AI to plan it / pick a hotel / pick a deal / type free text
- Saved to `localStorage` when unauthed; mirrored to Supabase when authed

### Toolbox § (Toolbox)
- 5 cards: Payment, SIM/eSIM, VPN, Transit, Emergency
- Each opens a bottom sheet with a 3-step checklist + relevant external links

## 7. Translate (FAB modal)

### Hero card (top of modal)
```
┌────────────────────────────────────────┐
│  ✕                                译  │  ← top bar, chop right
│                                        │
│  Where is the train station?           │  ← EN, Newsreader 1.5em
│  火车站在哪里？                          │  ← CN, Noto Serif SC 2em
│  Huǒchēzhàn zài nǎlǐ?                  │  ← pinyin, italic
│                                        │
│  [▶ play CN]   [♥ save]   [⤢ fullscreen]│
└────────────────────────────────────────┘
```

### "Show driver" fullscreen mode
- Tap the Chinese line → enter fullscreen
- Background: ink-black `#000000`
- Chinese text: `--paper-white`, font-size `min(20vw, 6em)`, centered
- Below: pinyin in stone-gray, smaller
- A single small 「译」 chop in the bottom-right
- Auto-rotate to landscape if device tilts
- Tap anywhere to exit

### Input
- Compose row below hero card:
  - `⌨️` text input (default focus)
  - `🎤` mic button (tap = single recording, hold = continuous)
- Submitting → calls `/api/translate` with `{ text, direction: 'en→zh' | 'zh→en' }`

### Bi-directional conversation
- After first translation, the hero is replaced by a vertical stack of translation pairs (last 3 shown, expandable)
- Long-press the `🎤` button → switches to "they're speaking" mode (red ring on mic; STT now expects Chinese input, output is English)
- A small ↕ icon toggles direction explicitly

### Quick-phrase chips (below input)
- Horizontal scroll of category chips: 🚕 Taxi · 🏨 Hotel · 🍜 Restaurant · 🚨 Emergency · 🛍️ Shopping · 文化 Culture · 景点 Attractions · 餐饮 Dining
- Tap chip → expands a small list of 6–12 canned phrases (data from `data/translations/`)
- Tap canned phrase → fills hero card AND speaks it immediately (one-tap-to-show-driver flow)

### Voice (TTS & STT)
- **TTS = Qwen3-TTS** via DashScope. Server proxy at `POST /api/tts`. Returns `audio/mpeg`
  - Default voice: `Chelsie` (mandarin female, natural); configurable via `QWEN_TTS_VOICE` env var
  - Default model: `qwen3-tts-flash`; configurable via `QWEN_TTS_MODEL` env var
  - Server caches identical `(text, voice, model)` for 1 hour via ETag (in-memory)
  - Fallback when `DASHSCOPE_API_KEY` empty: `speechSynthesis.speak()` browser native (announced in dev console)
- **STT = Qwen3-ASR** via DashScope. Server proxy at `POST /api/stt`. Accepts `audio/webm` or `audio/wav` blob
  - Frontend records via `MediaRecorder` API (16kHz, mono, webm/opus)
  - Returns `{ text, language_detected }`
  - Default model: `qwen3-asr-flash`; configurable via `QWEN_ASR_MODEL` env var
  - Fallback when `DASHSCOPE_API_KEY` empty: Web Speech Recognition API (Chrome only, less accurate)

### Translation engine
- `POST /api/translate` with `{ text, direction, mode? }` → `{ source, target, pinyin?, romanization?, provider }`
- Provider: DeepSeek (we already have the key path). Prompt:
  > Translate the following to {target language}. Output ONLY: line 1 the translation; line 2 pinyin (if target is Chinese); line 3 nothing else.
- This re-uses `DEEPSEEK_API_KEY`; no separate translation key

## 8. Auth system

### Surfaces
1. **Bottom sheet sign-in** (default, non-blocking): triggered from any "Save" attempt while unauthed, OR from the avatar tap when unauthed
   - Two primary CTAs: `Continue with Google` (qinghua blue) and `Sign up with email` (qinghua outline)
   - Existing-user link at the bottom: `Already have an account? Sign in`
2. **Email verify code screen**: 6-digit code input, "Resend in 0:60" countdown, "Skip for now" if Resend not configured
3. **Profile sheet** (authed): avatar, email, "Sign out", danger zone (delete account)

### API surface
```
POST /api/auth/register          { email, password, name? } → 201 + verify email sent
POST /api/auth/login             { email, password } → 200 + sets HttpOnly cookie
POST /api/auth/verify            { email, code }    → 204 + activates account
POST /api/auth/verify/resend     { email }          → 204
GET  /api/auth/google            302 → Google OAuth consent
GET  /api/auth/callback          OAuth callback     → 302 to "/" + sets cookie
GET  /api/auth/profile           → { id, email, name, avatar_url, email_verified, created_at }
POST /api/auth/logout            → 204 + clears cookie
DELETE /api/auth/account         → 204 + clears all user data
```

### Session
- JWT stored in **HttpOnly + Secure + SameSite=Lax cookie** named `vp_session`
- 7-day expiry, refreshed silently on each authed API call (sliding window)
- `JWT_SECRET` env var; auto-generated 32-byte hex if missing (warning logged)

### Data model (Supabase `users` table)
```
id              uuid PK default gen_random_uuid()
email           citext UNIQUE NOT NULL
password_hash   text NULL              -- nullable for google-only accounts
google_id       text UNIQUE NULL
name            text NULL
avatar_url      text NULL
email_verified  boolean NOT NULL default false
verify_code     text NULL              -- 6-digit, hashed with sha256
verify_expires  timestamptz NULL
created_at      timestamptz NOT NULL default now()
updated_at      timestamptz NOT NULL default now()
```

Plus a `sessions` table for active JWT IDs (optional, for explicit logout-everywhere). v7.0 keeps it stateless — logout clears the cookie client-side.

### Unauthed behavior
- Chat: works. History in-memory only, cleared on refresh
- Dashboard: city/hotels/deals/tools all visible. Itinerary persisted in `localStorage`
- Translate: works. Recent translations in-memory; "favorites" prompts sign-in

### Authed behavior
- Chat history persisted (best-effort write to Supabase after each round-trip)
- Itinerary synced
- Favorites (translations, hotels, deals) synced
- Account email gets weekly "China travel tip" digest (out of scope for v7.0 — just record the consent)

## 9. Storage architecture

### Persistent (Supabase REST)
- `users`, `sessions`, `chat_sessions`, `chat_messages`, `itineraries`, `itinerary_items`, `favorites`
- Accessed via Supabase REST API + `SUPABASE_SERVICE_KEY` for server-side writes
- All requests use `urllib.request` with a 5-second timeout

### Static (in-repo)
- `data/translations/*.json` (phrases, attractions, culture, dining) — preserved verbatim from v6
- Curated `CITIES`, `HOTELS`, `DEALS`, `TOOLS` in `api/dashboard.py` (Python dicts; easy to hand-edit)

### Client-side (localStorage)
- `vp.itinerary` (when unauthed)
- `vp.favorites` (when unauthed)
- `vp.chat.draft` (current compose)
- `vp.city` (last selected city)
- `vp.tts_cache_keys` (for cache busting only)

### Fallback (JSON file)
When `SUPABASE_URL` is empty (local dev), the storage layer transparently falls back to `data/auth.db.json` (in `.gitignore`). Reads and writes are atomic via a temp-file-rename pattern. This is **not** safe for production (concurrent writes will race) and is gated by `APP_ENV != 'production'`.

## 10. API surface (complete)

```
# Health
GET  /api/health

# Chat
POST /api/chat                         { message, history? } → { reply, follow_ups, provider }
GET  /api/chat                         → { ok, provider, model }

# Translation
POST /api/translate                    { text, direction, mode? }
POST /api/tts                          { text, voice?, model? } → audio/mpeg
POST /api/stt                          (multipart: audio file)  → { text }
GET  /api/translations/:slug           → { phrases: [...] }   (static JSON proxy)

# Dashboard data
GET  /api/cities                       → { cities: [...] }
GET  /api/cities?id=beijing            → { city: {...} }
GET  /api/hotels?city=beijing
GET  /api/deals?city=beijing
GET  /api/tools                        → { tools: [...] }
GET  /api/tools?id=payment             → { tool: {...} }
GET  /api/maps?city=beijing
GET  /api/weather?lat=...&lon=...

# Auth
POST /api/auth/register
POST /api/auth/login
POST /api/auth/verify
POST /api/auth/verify/resend
GET  /api/auth/google
GET  /api/auth/callback
GET  /api/auth/profile
POST /api/auth/logout
DELETE /api/auth/account

# User data (authed)
GET  /api/itinerary
PUT  /api/itinerary                    { days: [...] }
GET  /api/favorites
POST /api/favorites                    { kind, ref_id, payload? }
DELETE /api/favorites/:id
GET  /api/chat-history                 → list of last N sessions
GET  /api/chat-history/:id             → { messages: [...] }
```

All non-trivial JSON responses have shape `{ ok: true, ...data }` or `{ ok: false, error: "human-readable string" }`.

## 11. Project structure

```
VP-Claude-Web/
├── api/
│   ├── __init__.py
│   ├── index.py              # WSGI entry / dispatcher
│   ├── common.py             # http_request, json_response, parse_query, parse_json_body, cookies
│   ├── config.py             # env-var helpers, has_X() checks
│   ├── health.py
│   ├── chat.py               # DeepSeek
│   ├── translate.py          # DeepSeek-as-translator
│   ├── tts.py                # Qwen3-TTS proxy
│   ├── stt.py                # Qwen3-ASR proxy
│   ├── dashboard.py          # cities/hotels/deals/tools/maps/weather
│   ├── translations.py       # static JSON serve
│   ├── auth.py               # register/login/verify/oauth/profile/logout
│   ├── itinerary.py
│   ├── favorites.py
│   ├── chat_history.py
│   ├── storage.py            # Supabase REST client + JSON fallback
│   ├── jwt_util.py           # HMAC-SHA256 JWT (stdlib only)
│   ├── email_resend.py       # Resend API client
│   └── google_oauth.py
├── web/
│   ├── index.html            # single-page shell
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # service worker (cache shell + translations)
│   ├── favicon.svg
│   ├── assets/
│   │   ├── paper-noise.svg
│   │   └── chop-strokes/     # SVG outlines of 问/览/译/…
│   ├── css/
│   │   ├── tokens.css        # CSS custom properties (color/spacing/type)
│   │   ├── reset.css
│   │   ├── base.css          # layout primitives
│   │   ├── components.css    # chop, bilingual-term, card, chip, button
│   │   ├── chat.css
│   │   ├── dashboard.css
│   │   ├── translate.css
│   │   └── auth.css
│   └── js/
│       ├── app.js            # bootstrap, router, view-switching
│       ├── api.js            # fetch wrapper, error handling, auth refresh
│       ├── auth.js           # sign-in sheet, OAuth dance
│       ├── chat.js           # chat view + compose + DeepSeek round-trip
│       ├── dashboard.js      # drawer + city chips + chapter sections
│       ├── translate.js      # FAB modal + TTS/STT
│       ├── voice.js          # MediaRecorder + audio playback
│       ├── itinerary.js      # localStorage + sync
│       ├── favorites.js
│       └── components/
│           ├── chop.js
│           ├── bilingual-term.js
│           └── card.js
├── data/
│   └── translations/
│       ├── phrases.json      # PRESERVED from v6
│       ├── attractions.json  # PRESERVED from v6
│       ├── culture.json      # PRESERVED from v6
│       └── dining.json       # PRESERVED from v6
├── docs/
│   └── superpowers/specs/
│       └── 2026-06-24-visepanda-v7-design.md   # this file
├── vercel.json
├── requirements.txt
├── CHANGELOG.md
├── README.md
└── .gitignore / .vercelignore
```

## 12. Environment variables (Vercel)

All values left empty in code; user fills them in Vercel dashboard after first deploy. Code gracefully degrades when any is empty (see § Fallback strategy below).

```
# AI
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# Voice (Alibaba DashScope)
DASHSCOPE_API_KEY=
QWEN_TTS_MODEL=qwen3-tts-flash
QWEN_TTS_VOICE=Chelsie
QWEN_ASR_MODEL=qwen3-asr-flash

# Storage
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Email
RESEND_API_KEY=
RESEND_FROM="VisePanda <hello@go2china.space>"

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://claude.go2china.space/api/auth/callback

# App
JWT_SECRET=
APP_BASE_URL=https://claude.go2china.space
APP_ENV=production
```

## 13. Fallback strategy (graceful degradation)

| Missing env var | Behavior |
|-----------------|----------|
| `DEEPSEEK_API_KEY` | Chat returns templated reply; Translate returns "translation requires API key" message |
| `DASHSCOPE_API_KEY` | TTS falls back to `speechSynthesis`; STT falls back to Web Speech API (Chrome) |
| `SUPABASE_URL` or `SUPABASE_SERVICE_KEY` | Falls back to local JSON file (`data/auth.db.json`); only allowed when `APP_ENV != 'production'` — otherwise auth endpoints return 503 |
| `RESEND_API_KEY` | Verification is auto-skipped on register (account is created with `email_verified=true`); a console warning is logged |
| `GOOGLE_CLIENT_ID` | `/api/auth/google` returns 503; the "Continue with Google" button is hidden in the UI based on `GET /api/config/public` |
| `JWT_SECRET` | Server auto-generates a per-process random secret; sessions invalidate on every cold start (warning logged) |

A new `GET /api/config/public` endpoint returns booleans (`has_deepseek`, `has_voice`, `has_supabase`, `has_email`, `has_google`) so the frontend can hide unavailable features.

## 14. Deployment

- `git push origin main` → Vercel auto-deploys (`vp-claude-web` project)
- Domain: `claude.go2china.space` (already bound)
- Python runtime: `python3.11` (from existing `vercel.json`)
- Build: none — static files served directly; `api/index.py` is the WSGI entry
- Post-deploy: user fills env vars in Vercel UI, then re-deploys to pick up

## 15. CHANGELOG entry

```markdown
## v7.0.0 — 2026-06-XX

### Added
- Complete rewrite of frontend (Vanilla JS + CSS custom properties)
- Chat-primary IA with persistent Translate FAB and Dashboard drawer
- Chinese visual system: paper-white surfaces, qinghua blue actions, cinnabar seal-chops
- Qwen3-TTS (Alibaba DashScope) for voice playback (Chinese-quality voices)
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

## 16. Open questions (will be resolved in writing-plans phase)

1. Should chat history be paginated or just "last N" trimmed? Suggest last 20 sessions in v7.0; pagination is v7.1
2. Service worker scope: cache only translation JSON, or also a "frozen" version of dashboard data? Suggest only translations for v7.0
3. How aggressive should TTS cache be? Suggest server-side LRU with 100 entries, 1-hour TTL
4. Should "show driver" mode actively switch screen brightness to max via the Wake Lock API? Out of scope for v7.0 — note for v7.1

## 17. Definition of done

- All Chat / Dashboard / Translate flows work end-to-end with valid env vars
- All flows degrade gracefully with missing env vars (no white screens, no thrown errors visible to user)
- Auth happy path verified (register → verify email → login → access protected endpoint)
- Google OAuth happy path verified
- PWA installable on mobile Safari and Chrome
- Lighthouse scores: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95 on mobile
- CHANGELOG updated, README updated, this spec referenced in commit messages
- Single push to `main` includes everything; Vercel deploy is green

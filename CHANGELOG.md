# Changelog

All notable changes to VisePanda.

## v7.0.0 — 2026-06-24

Complete rewrite. Single push, single coherent design.

### Added

- **Chat-primary IA.** The home screen is always the AI chat. The Translate
  function lives in a persistent FAB (bottom-right) and the Dashboard lives
  in a drawer (top-left ☰). Removed the old three-tab layout.
- **Chinese visual system.** Xuan-paper white surfaces (#f5f0e8), qinghua blue
  for primary actions (#1e6f9f), cinnabar (#c63d2f) reserved *exclusively* for
  seal-chops (问 / 览 / 译 / 今 / 居 / 食 / 行 / 程 / 具). A vertical 你好 hero
  on the chat empty state. Serif-on-serif bilingual pairing (Newsreader +
  Noto Serif SC) with a structural pinyin track.
- **Qwen3-TTS** (Alibaba DashScope) for voice playback via `/api/tts`. Server
  caches identical (text, voice, model) for 1 hour with ETags.
- **Qwen3-ASR** (Alibaba DashScope) for voice input via `/api/stt` (multipart
  audio upload).
- **Auth.** Email/password + Google OAuth + Resend email verification. JWT
  session cookie (`vp_session`, 7 days, HttpOnly + SameSite=Lax). Profile,
  delete-account, sign-out endpoints.
- **City-anchored Dashboard.** Six chapters in fixed order:
  Now / Stay / Eat & Do / Move / Plan / Toolbox. City chips at the top set
  the scope for all chapters at once.
- **"Show driver" fullscreen translation mode.** Black background, Chinese
  text at ~18vw. Designed for handing the phone to a taxi driver.
- **Itinerary builder.** Day-by-day morning/afternoon/evening slots.
  Persists to localStorage, syncs to Supabase when authed.
- **Favorites** for translations, hotels, and deals. Same dual-track
  persistence (local first, cloud when authed).
- **PWA.** Manifest + service worker that caches the app shell and the four
  translation JSONs for offline use.
- **Graceful degradation.** Every external integration has a fallback when
  its key is empty: DeepSeek → templated reply, Qwen → Web Speech API,
  Supabase → local JSON file (dev only), Resend → auto-verify on register,
  Google → button hidden.
- **Storage abstraction.** `api/storage.py` exposes `users`, `itineraries`,
  `favorites`, `chat_sessions`, `chat_messages` with identical APIs against
  Supabase REST or a local JSON file. Schema SQL embedded in the module.

### Changed

- WSGI router (`api/index.py`) uses lazy imports and a flat route table.
- DeepSeek client targets the `deepseek-chat` model (V4 Flash tier) by
  default; configurable via `DEEPSEEK_MODEL`.
- All Chinese text now carries a structural pinyin track in UI components.

### Preserved

- `data/translations/*.json` (phrases, attractions, culture, dining)
  retained verbatim from v6.
- `vercel.json` deployment topology.
- Python-stdlib-only constraint on the backend (HTTP via `urllib`).

### Removed

- Three-tab equal-weight IA.
- Web Speech API as the primary TTS/STT path (now fallback only).
- v6 frontend, openspec change folders, static city/food images, the
  trip-map prototype, and 26 legacy docs/plans.

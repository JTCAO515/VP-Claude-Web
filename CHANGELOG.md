# Changelog

All notable changes to VisePanda.

## v8.4.0 — 2026-06-25

Ctrip Union retired the callable hotel-search API this project originally
integrated against. Switched to their current integration surface (an H5
deep-link URL builder) and synced all docs that still described the old
API-key model.

### Changed
- `api/partners.py` rewritten: `_hotels`/`_transport` no longer attempt an
  API call to Ctrip Union. Instead `_ctrip_url()` builds four kinds of H5
  deep links directly — hotel list, hotel detail, train list, flight list
  — with the affiliate ID/sub-ID baked into the query string per Ctrip's
  current "URL生成工具" (URL builder) model. New `GET /api/partners/hotel-detail`
  endpoint for the hotel-detail link type.
  ⚠️ Exact query-parameter names (`allianceid`, `sid`, `dcity`/`acity`,
  `triptype`, etc.) are a best-effort reconstruction from Ctrip's public
  affiliate docs — **not yet verified against a real generated link**.
  See the module docstring for how to confirm once the product owner
  pastes a real example link from their open-platform console.
- `api/config.py`: replaced `CTRIP_UNION_API_KEY`/`CTRIP_UNION_API_SECRET`/
  `CTRIP_UNION_PID` (signed-API model) with `CTRIP_AID`/`CTRIP_SID`
  (affiliate-attribution IDs baked into the URL, not secrets — both ship
  with working defaults so hotel/transport links work out of the box with
  zero configuration).
- `web/js/components/booking-panel.js`: Hotels panel gained check-in/out
  date fields (defaults to tomorrow + 2 nights). Transport panel split
  into Train and Flight sub-forms — Flight supports one-way/round-trip
  with a return-date field, matching what Ctrip's H5 pages actually need.
- Synced `README.md`, `docs/HANDOFF.md`, and `docs/VERCEL_KEYS_GUIDE.md` —
  all three still described the retired Ctrip Union API-key flow. The
  Vercel guide now explains the URL-builder model in plain language and
  notes the booking feature works immediately, no application/approval
  needed (unlike Meituan Union, which is still a signed API requiring
  partner approval).

### Why this matters for whoever reads the docs next
This is the kind of "the third party changed their integration model
out from under us" gap that's easy to miss if you only read the code —
the docs kept describing an API that no longer exists. Worth specifically
checking partner-integration docs against the actual code after any
external API change, not just after a redesign.

## v8.3.0 — 2026-06-25

Merged Plan+Trips into one tab; Cities detail sheet now browses Hotels/
Dining/Attractions by category; two handoff docs added.

### Added
- `docs/VERCEL_KEYS_GUIDE.md` — plain-language (Chinese), non-technical
  walkthrough for every environment variable: what it's for, where to get
  it, how to paste it into Vercel. Flags the `APP_ENV=production` gotcha
  (without it, auth silently tries to write to a local JSON file that
  doesn't persist on Vercel's serverless filesystem).
- `docs/HANDOFF.md` — full project handoff: intent, architecture, every
  major version's backstory, this session's work, known gaps, the
  product owner's working style, and a prioritized roadmap. Written so
  a cold-start session (human or AI) can pick up without re-deriving
  context from git history alone.
- `ATTRACTIONS` curated list + `/api/attractions` + `/api/partners/attractions`
  (curated data + a `things-to-do` Trip.com link, same fallback pattern as
  hotels/deals).
- Cities' detail sheet now has three tabs — **Hotels / Dining / Attractions**
  — each lazy-loaded once and cached per-sheet-session, with rating badges
  and a category-appropriate book/view link (Trip.com or Meituan).

### Changed
- **Plan and Trips merged into one sidebar tab.** The sidebar nav now has
  4 rows (Ask / Trips / Cities / Tools) instead of 5. "Trips" shows the
  saved-trip list; opening or creating a trip switches the same tab into
  the Plan-style itinerary builder, with a "← All trips" link back to the
  list. `sidebar.js` highlights the Trips row whenever the active view is
  `'plan'` (the internal view name is unchanged — only the nav row was
  removed — to minimize churn in `app.js`/`plan.js`).
- Cities' "Add to Plan" button renamed to "Add to Trip" for consistency
  with the merged tab.
- SW cache bumped to `vp-v8-5`.

## v8.2.0 — 2026-06-25

Booking + ratings: 携程联盟 (Ctrip/Trip.com Union), 美团联盟 (Meituan Union),
Amap POI ratings as the realistic substitute for Dianping data (which has
no public third-party API).

### Added
- `api/partners.py` — `/api/partners/hotels`, `/api/partners/transport`,
  `/api/partners/deals`. When `CTRIP_UNION_*`/`MEITUAN_UNION_*` keys are
  configured, calls the respective Union (affiliate/CPS) API for live
  search + a tracked deep link. Without keys, returns curated local data
  (already in `api/dashboard.py`) plus a safe, verified-stable link to the
  right Trip.com/Meituan section — never a guessed deep-link URL.
- `api/ratings.py` — `/api/ratings?city=&category=` via Amap's Web Service
  POI search (`AMAP_WEB_SERVICE_KEY`, a different key type from the JS-API
  `AMAP_JS_KEY` already used for the Plan map). Returns `rating` per POI
  when available; empty list (not an error) when the key is unset.
- Tools gained a third section, **Book & Reviews**: Hotels, Transport, and
  Group deals cards, each opening a sheet (`components/booking-panel.js`)
  that searches via the new endpoints and opens the book_url in a new tab.
- Cities' detail sheet now shows a ★ rating badge next to hotels/deals
  (fuzzy name-matched against Amap POI data) and "Book on Trip.com" /
  "Book on Meituan" buttons.

### Why not a direct Dianping/Meituan integration?
Dianping review/rating data and Meituan order placement are not exposed via
any public third-party API — both require a formal business/data-licensing
agreement, not just an API key signup. Building a fake "integration" that
can't actually fetch real data would be worse than being upfront about it.
Ctrip/Trip.com Union and Meituan Union are real, application-based affiliate
programs that this app is wired for; Amap's POI ratings are a genuine public
API that approximates what Dianping ratings would have shown.

## v8.1.0 — 2026-06-25

Fills in the v8 sidebar redesign's placeholder interactions.

### Fixed
- **Auth sheet was never visible.** `<dialog>` without `.showModal()` stays
  `display:none` per the UA stylesheet regardless of class toggles — this
  silently broke sign-in since v7. Changed to a plain `<div>`.

### Added
- **Google Sign-In** documented end-to-end (Cloud Console setup steps in
  README); backend was already wired, now confirmed reachable from a visible
  sign-in sheet.
- **City picker drawer** (`components/citypicker.js`) replaces `prompt()`
  for adding Plan destinations — searchable, multi-select, checkmarked rows.
- **Trip-bound planning.** Trips now own their own itinerary (`day_count` +
  `days[]`). Plan can operate in scratch mode (`/api/itinerary`, no trip
  selected) or bound to a trip (`/api/trips/<id>`). Creating a trip uses a
  sheet (name + optional start date + day-count stepper) instead of
  `prompt()`; opening a trip card jumps to Plan bound to it.
- **Dates simplified.** Plan's toolbar no longer asks for a date range —
  just a day-count stepper. Specific calendar dates live on the Trip
  (set once, at creation).
- **Amap (高德地图) integration** (`web/js/map.js`) — lazy-loads the Amap JS
  SDK and renders real markers when `AMAP_JS_KEY`/`AMAP_SECURITY_CODE` are
  set; falls back to the original striped placeholder + numbered pins
  otherwise.
- **Generate wired to DeepSeek.** Plan's "Generate"/"Optimize" button now
  calls `POST /api/itinerary/generate`, which prompts DeepSeek for a
  structured JSON itinerary (falls back to a one-stop-per-day stub without
  a key).
- **Cities detail sheet** — clicking a card now opens hotels/deals for that
  city plus "Add to Plan", instead of an `alert()`.
- **Translate & scan restored** as a Tools panel (`components/translate-panel.js`
  + `voice.js`), wired to the existing `/api/translate`, `/api/tts`,
  `/api/stt` endpoints with a "show driver" fullscreen mode.
- **Generic sheet component** (`components/sheet.js`) — single reusable
  overlay used by the city picker, city detail, trip creation, and translate
  panel; tears down on close so call sites never collide.

### Changed
- `api/trips.py` rewritten: trips now carry `start_date`, `day_count`, and
  inline `days[]`; added `GET /api/trips/<id>`.
- `api/itinerary.py` gained `POST /api/itinerary/generate`.
- `api/config.py` gained `AMAP_JS_KEY`, `AMAP_SECURITY_CODE`, `has_map()`,
  both exposed via `/api/config/public` (safe per Amap's client-side model).
- Service worker cache bumped to `vp-v8-2` with the new component files.

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

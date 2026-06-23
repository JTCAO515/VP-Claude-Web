# VisePanda Handoff

Last updated: 2026-06-23
Current version: v7.0.0
Latest commit: `e3e5764` (Rewrite VisePanda from scratch as v7.0.0)
Branch: `claude/friendly-dirac-sn2iet`
Repository: https://github.com/JTCAO515/VP-Claude-Web
Deployment target: Vercel, routed through `api/index.py`

## 1. Project Summary

VisePanda is an English-native China travel butler for foreign visitors: pre-trip planning, an AI travel guide, and native translation in one small app.

v7.0.0 is a full from-scratch rewrite of both frontend and backend. No code from `web/` or `api/` in v6.2.1 or earlier was reused; only the curated JSON knowledge base under `data/` was kept. Auth, the admin panel, and all v6.2.1-era automated tests were removed as part of the rewrite and are **not** part of current scope. See `CHANGELOG.md` and `OPTIMIZATION_REPORT.md` for the full rationale.

Treat everything below as the current source of truth. `CONTEXT.md`, `DESIGN.md`, and `README.md` still describe the pre-v7.0.0 product (three tabs with similar names but a different stack, plus auth/admin) and have not been updated yet — do not trust their architecture or API sections.

## 2. Current Product Surface

Three tabs, one shared `<main>` with `role="tabpanel"` sections toggled by `hidden`:

### Chat (default view)

- Streaming or non-streaming AI travel guide via DeepSeek (`deepseek-chat` by default).
- Deterministic local fallback (`api/lib/deepseek.py:local_answer`) grounded in `data/` when `DEEPSEEK_API_KEY` is unset or the remote call fails — the assistant always answers, never errors out to the user.
- No auth required; conversation state lives in the page only (not persisted across reloads).

### Dashboard

Lazy-loaded on first activation (`web/js/main.js`):

- recent questions (from `localStorage`);
- saved trips (from `localStorage`);
- featured cities (`/api/cities?featured=1`);
- hotels (`/api/hotels/search`);
- deals (`/api/deals/search`);
- travel tool cards and visa lookup (`/api/tools`, `/api/tools/visa`).

### Translate

Lazy-loaded on first activation:

- text translation/lookup against `data/translations/{phrases,dining,attractions,culture}.json` via `/api/translations`;
- local translation history with clear-history control;
- voice-readiness affordance only (no STT/TTS wiring yet).

### Removed in v7.0.0

- Admin panel (`web/admin.html`).
- Auth (`api/auth.py` and all `/api/auth/*`, `/api/trips`, `/api/admin/*` routes).
- All v6.2.1-era contract tests (`tests/`, `web/tests/`).

These are gone, not stubbed. Do not assume any auth/session state exists anywhere in the current app.

## 3. Architecture

```text
web/index.html                    one shell, three <section role="tabpanel">
web/css/app.css                   single design-system stylesheet
web/js/main.js                    view switching + lazy panel loaders
web/js/{chat,dashboard,translate}.js   per-panel logic
web/js/api.js                     fetch wrapper + SSE chat streaming
web/js/store.js                   localStorage helpers (vp_*_v7 keys)
web/js/toast.js                   lightweight toast notifications
web/manifest.json, web/sw.js      PWA shell, cache name visepanda-shell-v7.0.0
        |
        v  (same WSGI entrypoint serves both static assets and /api/*)
api/index.py                      WSGI app: static resolver for non-/api/ paths,
                                   Router.dispatch() for /api/*
api/lib/http.py                   regex Router + Request/Response primitives
api/lib/data.py                   cached JSON data-access layer over data/
api/lib/deepseek.py                DeepSeek streaming client + local_answer fallback
api/lib/amap.py                   Amap geocode/place proxy + local fixture fallback
api/lib/static.py                 static file resolver for web/ and static/
api/routes/{health,chat,cities,hotels,deals,maps,translations,tools}.py
        |
        v
data/*.json, data/translations/*.json, data/hotels/hotels.json, data/deals/deals.json
optional external DeepSeek / Amap providers
```

Frontend: static HTML/CSS/native ES modules, no bundler. Backend: Python WSGI, standard library only (`requirements.txt` has no external dependencies), matching the `vercel.json` catch-all route to `api/index.py`.

## 4. Important Files

| File | Purpose |
| --- | --- |
| `CHANGELOG.md` | Release notes, including the full v7.0.0 rewrite rationale |
| `OPTIMIZATION_REPORT.md` | v7.0.0 rewrite scope, architecture decisions, and manual verification results |
| `PRD_PRODUCT_ANALYSIS.md` | Product positioning and phase plan (updated for v7.0.0) |
| `PLAN.md` | Active implementation roadmap (updated for v7.0.0) |
| `api/index.py` | WSGI entrypoint: static serving + `/api/*` dispatch |
| `api/lib/http.py` | `Router`, `Request`, `Response` |
| `api/lib/data.py` | Cached JSON loaders (`cities()`, `hotels()`, `deals()`, `translations()`, `tips()`, `dining_tags()`, `attraction_signs()`) |
| `api/lib/deepseek.py` | Chat client + offline fallback |
| `api/lib/amap.py` | Maps proxy + offline fallback |
| `api/routes/*.py` | One module per API resource |
| `data/*.json`, `data/translations/*.json` | Knowledge base, reused as-is from pre-v7.0.0 |
| `web/index.html` | App shell markup |
| `web/css/app.css` | Ink-and-porcelain design system, light/dark via `prefers-color-scheme` |
| `web/js/*.js` | Frontend modules (see Architecture above) |

## 5. Version State

### v7.0.0 (current)

Full rewrite — see `CHANGELOG.md` for the complete list. Highlights:

- New stdlib-only WSGI backend with a regex `Router` and one-module-per-resource routes.
- New native-ES-module frontend, no bundler, three lazy-loaded tabpanels.
- New ink-and-porcelain visual identity (porcelain blue / rice-paper / vermillion), serif display type, light/dark via `prefers-color-scheme`.
- `localStorage` keys versioned with `_v7` suffix so old client data is never read.
- Auth, admin panel, and all old tests removed (not carried forward).

Everything in this document describes v7.0.0 only. Version history before v7.0.0 (v6.2.1 and earlier) is preserved in `CHANGELOG.md` for record-keeping but describes a codebase that no longer exists.

## 6. Local Development

Run from repository root:

```powershell
python -c "from api.index import app; from wsgiref.simple_server import make_server; server = make_server('127.0.0.1', 8765, app); print('http://127.0.0.1:8765'); server.serve_forever()"
```

Health:

```json
{"ok":true,"service":"VisePanda","version":"7.0.0","llm":{"provider":"deepseek","status":"fallback"},"maps":{"provider":"amap","status":"fallback"}}
```

(`status` becomes `"configured"` once `DEEPSEEK_API_KEY` / `AMAP_KEY` are set.)

## 7. Verification

There is currently **no automated test suite** — `tests/` and `web/tests/` were deleted with the old code and have not been replaced yet (see Next Recommended Work, item 1).

Until tests exist, verify manually:

```powershell
node --check web/js/*.js
python -m py_compile api/index.py api/lib/*.py api/routes/*.py
git diff --check
```

Then exercise the WSGI app directly (no server needed) by calling `api.index:app` with a constructed `environ` dict, or run the dev server above and hit each route in `9. API Surface`. `OPTIMIZATION_REPORT.md` documents the exact routes manually verified for v7.0.0 and their expected status codes.

## 8. Environment Variables

Do not commit secrets.

- `DEEPSEEK_API_KEY` — optional; enables remote chat completions. Without it, `/api/chat` always returns a local fallback answer.
- `DEEPSEEK_MODEL` — optional; defaults to `deepseek-chat`.
- `AMAP_KEY` — optional; enables real Amap geocode/place lookups. Without it, `/api/maps/*` falls back to local attraction fixtures in `data/translations/attractions.json`. Never expose this to frontend code.

No auth-related environment variables exist in v7.0.0 — `AUTH_DB_PATH`, `ADMIN_EMAIL`, `RESEND_API_KEY`, `GOOGLE_CLIENT_*`, etc. from earlier versions are obsolete.

## 9. API Surface

- `GET /api/health`
- `POST /api/chat` (`{message, history, stream}`; SSE when `stream: true`)
- `GET /api/cities` / `GET /api/cities?featured=1`
- `GET /api/cities/<city_id>`
- `GET /api/hotels/search?city=`
- `GET /api/hotels/detail?id=`
- `POST /api/hotels/book`
- `GET /api/deals/search?city=&type=`
- `GET /api/deals/detail?id=`
- `GET /api/translations?category=&q=`
- `GET /api/tools`
- `GET /api/tools/visa?nationality=`

No auth, trips, or admin routes exist in v7.0.0.

## 10. Next Recommended Work

1. Rebuild a contract test suite for `api/lib/http.py` routing and each `api/routes/*` module — there is currently zero automated coverage.
2. Re-verify `/api/chat` streaming and `/api/maps/*` against real `DEEPSEEK_API_KEY` / `AMAP_KEY` credentials; v7.0.0 was only verified against the local fallback paths.
3. Update `CONTEXT.md`, `DESIGN.md`, and `README.md` to match v7.0.0 — they still describe the pre-rewrite architecture and API surface.
4. Implement push-to-talk voice translation using browser STT/TTS in `web/js/translate.js`; the voice-readiness UI is currently a placeholder.
5. Expand `data/translations/` content (more dishes/attractions) now that the rewrite has a clean consumer (`api/routes/translations.py`) for it.

## 11. Do Not Do First

- Do not re-add auth, the admin panel, or Phase 2 community features in this cycle.
- Do not assume `CONTEXT.md`, `DESIGN.md`, or `README.md` are accurate until they are updated — verify against the code in `api/` and `web/` instead.
- Do not add a frontend framework/bundler without a concrete reason; the no-build native-ES-module approach is deliberate.
- Do not commit API keys.

## 12. New-Agent Start

1. Read this `HANDOFF.md`.
2. Read `OPTIMIZATION_REPORT.md` for the rewrite rationale and what was manually verified.
3. Read `CHANGELOG.md` v7.0.0 entry for the full diff narrative.
4. Run the local dev server above and manually exercise the routes in section 9.
5. Open the app and check Chat, Dashboard, and Translate.
6. Check mobile portrait (~390x844) and desktop (>=860px, icon rail) layouts.

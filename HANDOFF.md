# VisePanda / VP-Codex-Web Handoff

Last updated: 2026-06-23
Current version: v6.2.1
Latest commit: pending local commit for travel-butler translation iteration
Repository: https://github.com/JTCAO515/VP-Codex-Web
Production domain: https://go2china.space
Deployment target: Vercel, routed through `api/index.py`

## 1. Project Summary

VisePanda is an English-native China travel butler for foreign visitors.

The product has moved beyond "travel planning tool." The current direction is a full journey assistant:

```text
Pre-trip planning -> During-trip butler -> Post-trip community later
```

Phase 1 pre-trip planning exists as a working foundation. Phase 1.5 is now the main direction: translation, restaurants, local routes, taxi help, and practical in-China service guidance. Phase 2 community, journals, companion matching, and social feedback are documented only and are not part of this release.

## 2. Current Product Surface

### Dashboard

Command center for:

- destination and trip-length input;
- recent Ask question summary;
- saved trip summary;
- next-action prompt;
- featured cities;
- readiness checklist.

### Ask

Default first screen. It behaves like a mainstream LLM chat after conversation starts:

- no visible mode/model/depth controls;
- no preset panel after first message;
- AI answers end with generated follow-up question buttons;
- recent user questions are stored locally for Dashboard context.

### Translate

New Phase 1.5 surface.

Current v6.2.1 scope:

- voice-translation readiness card;
- text translator using local travel dictionary lookup;
- phrase cards;
- local translation history;
- clear-history control;
- data loaded from `/api/translations`.

Translation data lives in:

- `data/translations/phrases.json`
- `data/translations/dining.json`
- `data/translations/attractions.json`
- `data/translations/culture.json`

This is not yet a full machine translation engine. Voice STT/TTS is prepared as a browser capability path and should be completed in a later iteration.

### Cities

Searchable China destination cards from `data/cities.json`.

### Map

Route and geography intelligence from `/api/map`, with a starter fallback in the frontend.

### Tools

Practical helper cards. Future Phase 1.5 work should add Meituan/Dianping group-buying guidance, taxi helper cards, and stronger payment/SIM/VPN support here.

### Trips

Guest local drafts and authenticated saved trips.

### Account

Email/password login, registration without name, email verification, resend code, password reset, optional Google OAuth, profile update, logout.

### Admin

Minimal internal user-management surface at `web/admin.html`.

## 3. Architecture

```text
web/index.html
web/app.css
web/app.js
        |
        v
api/index.py
        |
        +-- api/auth.py
        +-- api/chat.py
        +-- api/cities.py
        +-- api/tools.py
        +-- api/translations.py
        +-- api/visa.py
        +-- api/config.py
        |
        v
data/*.json
data/translations/*.json
SQLite auth/trips storage
optional external model/email/OAuth providers
```

Frontend remains static HTML/CSS/vanilla JS. Backend remains Python WSGI with standard-library-first implementation.

## 4. Important Files

| File | Purpose |
| --- | --- |
| `README.md` | Fast project overview |
| `PRD_PRODUCT_ANALYSIS.md` | Product positioning and phase plan |
| `PLAN.md` | Active implementation roadmap |
| `CONTEXT.md` | Current product and architecture context |
| `DESIGN.md` | UI system and mobile rules |
| `CHANGELOG.md` | Release notes |
| `api/index.py` | Main WSGI router |
| `api/translations.py` | Translation library API |
| `data/translations/*.json` | Native travel translation dictionaries |
| `web/index.html` | Main UI |
| `web/app.css` | Responsive visual system |
| `web/app.js` | Frontend state and interactions |
| `web/tests/*.test.js` | Frontend structure tests |
| `tests/*.py` | Python API and contract tests |

## 5. Version State

### v6.2.1

- Repositioned product as all-in-one China travel butler.
- Added native Translate tab.
- Added translation JSON datasets.
- Added `/api/translations`.
- Updated app version to `6.2.1`.
- Updated cache marker to `20260623-v621-travel-butler-translate`.
- Updated service worker cache to `visepanda-shell-v621-travel-butler-translate`.
- Added frontend and backend regression coverage for translation.

### v6.1.4

- Removed started-chat mode/model/depth and preset panels.
- Added follow-up suggestions after AI answers.
- Converted Overview into Dashboard.
- Added Map tab.
- Expanded colorful icon rail.

## 6. Local Development

Run from repository root:

```powershell
python -c "from api.index import app; from wsgiref.simple_server import make_server; server = make_server('127.0.0.1', 8765, app); print('http://127.0.0.1:8765'); server.serve_forever()"
```

Health:

```json
{"ok":true,"service":"VisePanda","version":"6.2.1"}
```

## 7. Verification

Run:

```powershell
python -m unittest discover -s tests -v
node --test web/tests/*.test.js
python -m py_compile api/config.py api/index.py api/translations.py
node --check web/app.js
git diff --check
```

Latest known passing state for v6.2.1:

- Python tests: 19/19 passing
- Frontend tests: 21/21 passing

## 8. Environment Variables

Do not commit secrets.

- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL`
- `OPENAI_COMPATIBLE_API_KEY`
- `OPENAI_COMPATIBLE_BASE_URL`
- `OPENAI_COMPATIBLE_MODEL`
- `APP_BASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `AUTH_DB_PATH`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `AUTH_EXPOSE_EMAIL_CODE=1` test only
- `AUTH_EXPOSE_RESET_TOKEN=1` test only

## 9. API Surface

Public:

- `GET /api/health`
- `GET /api/config`
- `GET /api/cities`
- `GET /api/cities/:id`
- `GET /api/map`
- `GET /api/translations`
- `GET /api/tools`
- `GET /api/tools/:id`
- `GET /api/visa/countries`
- `GET /api/visa/info?nationality=us`
- `POST /api/visa/generate`
- `GET /api/chat`
- `POST /api/chat`

Auth and trips:

- `POST /api/auth/register`
- `POST /api/auth/verify-email`
- `POST /api/auth/resend-verification`
- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/update-profile`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/config`
- `GET /api/trips`
- `POST /api/trips`
- `DELETE /api/trips/:id`

Admin:

- `GET /api/admin/users`
- `DELETE /api/admin/users/:id`

## 10. Next Recommended Work

1. Harden Translate with search, categories, copy buttons, and TTS playback.
2. Add real push-to-talk voice translation using browser STT/TTS where available.
3. Expand `data/translations/` toward 200+ attractions and 500+ dishes.
4. Add Dining Butler filters for spice, allergens, vegetarian, halal, English menu, and foreign cards.
5. Add taxi driver-facing address cards and route handoff from Map to Translate.
6. Add Meituan/Dianping group-buying guidance inside Tools.
7. Connect active Trip city/day context to Translate suggestions.

## 11. Do Not Do First

- Do not build Phase 2 community in this cycle.
- Do not claim full offline machine translation before it exists.
- Do not add a frontend framework migration without a concrete reason.
- Do not commit API keys or OAuth secrets.
- Do not enable test-only auth exposure flags in production.

## 12. New-Agent Start

1. Read `README.md`.
2. Read this `HANDOFF.md`.
3. Run the verification commands above.
4. Open local app.
5. Check Dashboard, Ask, Translate, Cities, Map, Tools, Trips.
6. Check mobile portrait around 390x844.

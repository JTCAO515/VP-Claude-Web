# VisePanda

VisePanda is an English-language China travel workspace for international visitors. It combines city discovery, visa readiness, saved trips, practical travel tools, and a streaming AI guide behind a small Vercel + Python WSGI deployment.

Active repository: `https://github.com/JTCAO515/VP-Codex-Web`

## Current Version

`v6.0.4` upgrades the front-end visual system: shared design tokens, steadier cards, clearer controls, and a more polished mobile portrait workspace.

## Product Surface

- Plan: first-screen travel workspace with destination input, featured cities, and readiness checklist.
- Ask: streaming AI travel guide with a deterministic local fallback when no DeepSeek key is configured.
- Cities: searchable China destination cards built from the curated city dataset.
- Tools: packing, pricing, phrase, emergency, and visa helper views.
- Trips: authenticated saved trips with a guest local draft mode.
- Admin: minimal user management console gated by explicit admin credentials.

## Tech Stack

- Backend: Python WSGI, standard library only.
- Frontend: static HTML, CSS, and vanilla JavaScript.
- Deployment: Vercel `@vercel/python`, all routes through `api/index.py`.
- Storage: SQLite for users, sessions, password resets, and trips.
- Data: JSON datasets in `data/` plus image assets in `static/img/`.

## Local Run

```powershell
python -c "from api.index import app; from wsgiref.simple_server import make_server; server = make_server('127.0.0.1', 8765, app); print('http://127.0.0.1:8765'); server.serve_forever()"
```

Useful checks:

```powershell
python -m unittest discover -s tests -v
node --test web/tests/*.test.js
```

## Environment

- `DEEPSEEK_API_KEY`: optional; enables remote AI answers for `/api/chat`.
- `DEEPSEEK_MODEL`: optional; defaults to `deepseek-chat`.
- `AUTH_DB_PATH`: optional SQLite path for local or test storage.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: optional admin seed. Weak defaults such as `admin123` are ignored.
- `AUTH_EXPOSE_RESET_TOKEN=1`: test-only reset token exposure.

## API

- `GET /api/health`
- `GET /api/config`
- `POST /api/chat`
- `GET /api/cities`
- `GET /api/cities/:id`
- `GET /api/map`
- `GET /api/tools`
- `GET /api/tools/:id`
- `GET /api/visa/countries`
- `GET /api/visa/info?nationality=us`
- `POST /api/visa/generate`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/update-profile`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/trips`
- `POST /api/trips`
- `DELETE /api/trips/:id`
- `GET /api/admin/users`
- `DELETE /api/admin/users/:id`

## Structure

```text
api/        WSGI router and API modules
data/       JSON knowledge and policy datasets
static/img/ Visual assets used by the app
tests/      Python contract tests
web/        Static app, PWA manifest, service worker, and Node tests
vercel.json Vercel routing configuration
```

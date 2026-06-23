# VisePanda Active Plan

Last updated: 2026-06-23
Current version: v7.0.0

## Current Objective

v7.0.0 just completed a full from-scratch rewrite of the frontend and backend (see `CHANGELOG.md`, `OPTIMIZATION_REPORT.md`). The current objective is to bring the rewritten codebase up to the same operational maturity the old codebase had — automated tests, real-credential verification, and consistent docs — before adding new product surface.

The active product loop is unchanged from before the rewrite:

```text
Chat before/during trip -> Dashboard for hotels/deals/tools -> Translate during trip
```

## Current Baseline (v7.0.0)

Already shipped:

- English-native static frontend, native ES modules, no bundler.
- Mobile-first shell: bottom tab bar under 860px, fixed icon rail at/above 860px.
- Three tabs: Chat, Dashboard, Translate, sharing one `<main>` via `hidden` toggling.
- Chat: streaming/non-streaming DeepSeek client with a deterministic local fallback.
- Dashboard: featured cities, hotels, deals, tools/visa lookup, recent questions, saved trips (all client-local, no account).
- Translate: category-filtered phrase/dining/attractions/culture lookup with local history.
- `api/lib/` (data, http, deepseek, amap, static) + `api/routes/` (one module per resource) backend structure.
- `localStorage` persistence under `vp_*_v7` keys.
- New ink-and-porcelain visual identity with light/dark via `prefers-color-scheme`.

Explicitly **not** in the baseline (removed during the rewrite, not yet rebuilt):

- Auth / accounts.
- Admin console.
- Any automated test suite (`tests/`, `web/tests/` were deleted, not replaced).

## Phase Plan

### Phase 1: Pre-Trip Planning

Status: implemented via Chat + Dashboard tools/visa card.

- Improve `local_answer()` coverage (more cities, more question patterns) so the offline fallback stays useful without an API key.
- Add hotel-area and foreigner-friendly accommodation guidance to Dashboard hotel cards.

### Phase 1.5: During-Trip Butler

Status: current core direction; Translate and Dashboard hotels/deals are implemented, voice is not.

- Implement push-to-talk voice translation using browser STT/TTS where available (`web/js/translate.js` currently only shows a voice-readiness affordance).
- Expand dining/attractions translation depth in `data/translations/`.
- Add city-context handoff between Chat and Translate (e.g. "open Translate for this city").

### Phase 2: After-Trip Community

Status: documented only, out of current scope. Do not build in this cycle.

## Next Iterations

### Round 1: Stabilize the Rewrite

- Rebuild a contract test suite covering `api/lib/http.py` routing and every `api/routes/*` module (currently zero coverage post-rewrite).
- Add frontend structure checks for `web/js/*.js` modules (at minimum `node --check`, ideally behavior tests for view switching and lazy loading).
- Verify `/api/chat` streaming and `/api/maps/*` against real `DEEPSEEK_API_KEY` / `AMAP_KEY` credentials in a non-production environment; v7.0.0 was only exercised against local fallback paths.
- Update `CONTEXT.md`, `DESIGN.md`, and `README.md` to match the v7.0.0 architecture and API surface (`HANDOFF.md` and this file are already current; those three are not).

### Round 2: Voice Translation

- Implement press-to-speak where browser STT is available.
- Auto-detect Chinese/English and show both text directions.
- Add TTS playback for translated output.
- Keep text fallback visible when voice permission fails.

### Round 3: Translation Content Depth

- Expand `data/translations/dining.json` and `attractions.json` coverage.
- Add spice/allergen/halal/vegetarian tags to dining entries and surface them in Translate filters.

### Round 4: Trip Context Loop

- Connect Dashboard's locally-saved trips to Translate suggestions (surface city-specific phrases when a trip city is set).
- Add "use in Chat" from Translate/Dashboard cards.

## Near-Term Rules

- UI stays English-native.
- Mobile portrait comes first; verify both <860px (tab bar) and >=860px (icon rail) layouts when touching layout CSS.
- Keep the stack vanilla JS (native ES modules) + Python WSGI stdlib-only — no bundler, no external Python dependencies, per `requirements.txt` and `vercel.json`.
- Do not reintroduce auth/admin or start Phase 2 community work in this cycle.
- Add tests for any change to routing, chat, translations data shape, or view switching — there is no existing suite to lean on, so new code should bring its own coverage.
- Bump the PWA cache name (`web/sw.js`, `web/manifest.json`) and `localStorage` key suffixes together if making a breaking client-state change.
- Do not commit secrets.

# Changelog

## v6.2.1 - 2026-06-23

### Changed

- Repositioned VisePanda as an all-in-one China travel butler for foreign visitors.
- Added Phase 1.5 during-trip service direction: translation, dining, routes, taxi help, and local-service guidance.
- Added a native Translate tab with voice-readiness, text translation, phrase cards, and local translation history.
- Added `data/translations/` JSON dictionaries for phrases, dining, attractions, and culture.
- Added `/api/translations`.
- Updated the app shell cache marker to `20260623-v621-travel-butler-translate`.
- Marked Phase 2 community features as future scope only.

### Regression

- Added frontend structure coverage for the Translate tab and translation database files.
- Added backend contract coverage for `/api/translations`.
- Updated version contract coverage to `6.2.1`.

## v6.1.4 - 2026-06-23

### Changed

- Removed the started-chat mode, model route, depth, and professional preset panels so the conversation stays focused like Claude/Gemini.
- Added generated follow-up question buttons after completed AI answers.
- Converted Home/Overview into a Dashboard command center with recent question summaries, saved trip summaries, quick planning, featured cities, and readiness state.
- Added a dedicated Map tab for route and geography intelligence.
- Expanded the icon rail to Dashboard, Ask, Cities, Map, Tools, and Trips with stronger per-tab colors.
- Updated cache busting and service worker naming for the new frontend shell.

### Regression

- Updated frontend structure coverage for the simplified chat surface, follow-up suggestions, Dashboard, Map tab, colorful icon rail, and v6.1.4 cache marker.
- Updated backend version contract coverage to `6.1.4`.

## v6.1.3 - 2026-06-23

### Changed

- Moved desktop primary tabs into a fixed left rail with icon-only controls.
- Made mobile tabs icon-only while preserving bottom thumb reach.
- Removed the pre-chat glass shell so the greeting and input float directly on the background.
- Hid the initial starter prompt chips and agent mark before the first message.
- Updated the greeting to a shorter conversational line.

### Regression

- Added frontend structure coverage for the icon-only rail and frameless initial Ask surface.

## v6.1.2 - 2026-06-23

### Changed

- Simplified the initial Ask screen into a mainstream LLM-style prompt surface.
- Reduced above-the-fold copy to a single question, one large input, and four short starter prompts.
- Restyled the pre-chat state with a darker Chinese-tech stage, subtle grid lines, glass panel treatment, and icon-first send action.
- Kept the professional chat controls available after the first message so the simplified entry does not remove deeper planning functionality.

### Regression

- Added frontend structure coverage for the simplified initial Ask screen, reduced copy, and large prompt input.

## v6.1.1 - 2026-06-23

### Fixed

- Fixed the guest Trips empty-state action so it returns to Ask instead of the removed dashboard nav target.
- Expanded the AI chat shell on wide desktop screens and raised the usable message width.
- Reworked mobile chat layout so the shell stays inside the viewport, the message log scrolls internally, and the tab bar hides while composing.
- Compressed mobile chat settings into a two-column layout after the conversation starts.
- Replaced the root `100vh` minimum height with `100dvh` for mobile browser chrome stability.

### Verified

- Rechecked the v2 optimization report against code and browser measurements before changing behavior.
- Confirmed the desktop auth dialog was already centered and the bottom nav already had four tabs.

## v6.1.0 - 2026-06-23

### Changed

- Shifted the default app entry from Plan to Ask so users land directly in the AI travel agent.
- Reworked the mobile primary navigation to four core tabs: Ask, Cities, Tools, and Trips.
- Moved Overview into the top bar as a secondary planning surface.
- Added an AI-first chat welcome state with six high-value quick prompts and first-screen input access.
- Made chat controls progressive: mode, provider, depth, and detailed presets appear after the user starts a conversation.
- Updated the visual direction with a deep travel-agent chat stage, Great Wall texture, sky-blue surfaces, and orange send action.

### Fixed

- Added request timeouts for shared API calls and chat requests.
- Hardened SSE parsing so malformed `data:` lines no longer crash the chat session.
- Preserved chat Authorization headers for future authenticated chat flows.
- Fixed quick planner duration handling.
- Added city image fallback handling.
- Added clearer session/config failure feedback.
- Wrapped trip saving errors with visible toast feedback.

### Regression

- Updated backend version tests to `6.1.0`.
- Updated frontend structure tests for AI-first navigation, progressive chat controls, cache busting, and streaming resilience.
- Browser-verified desktop and mobile portrait rendering with the in-app browser.

## v6.0.8 - 2026-06-22

### Changed

- Reworked the first screen into a mobile-first planning workspace with quicker prompts, a compact visual panel, and entry/route/local snapshot cards.
- Strengthened the bottom navigation into clearer app-style tabs with selected state semantics and a more visible active indicator.
- Added a thumb-friendly mobile Ask AI shortcut that jumps directly into the chat workflow.
- Refined the visual system with a brighter sky travel palette, cleaner card rhythm, and improved mobile spacing.

### Docs

- Rebuilt `HANDOFF.md`, `CONTEXT.md`, `PLAN.md`, `DESIGN.md`, and the active docs under `docs/` around the v6.0.8 project state.
- Replaced outdated v3/v5 user-system and product-analysis documents with current account, roadmap, and mobile-first planning direction.
- Added a clean documentation index and refreshed agent instructions for future Codex handoff work.

### Regression

- Updated frontend structure tests for tab semantics, mobile Ask access, and the new planning surface.

## v6.0.7 - 2026-06-22

### Changed

- Modernized authentication with email/password registration that no longer asks for a name.
- Added email verification and resend-verification support.
- Added optional Resend delivery for verification messages.
- Added optional Google OAuth start and callback flow.
- Added auth feature configuration for the frontend.

## v6.0.6 - 2026-06-22

### Changed

- Configured chat defaults around DeepSeek V4 Flash.
- Preserved deterministic local fallback behavior when external providers are unavailable.

## v6.0.5 - 2026-06-22

### Changed

- Upgraded Ask into a more professional consultation workflow.
- Added richer planning modes, presets, model-provider routing, and more detailed prompt context.

## v6.0.4 - 2026-06-22

### Changed

- Improved the overall visual system.
- Continued the shift toward a brighter travel-product interface.

## v6.0.3 - 2026-06-22

### Changed

- Hardened mobile UX states.
- Improved mobile interaction safety around core navigation and app surfaces.

## v6.0.2 - 2026-06-22

### Changed

- Polished the mobile portrait experience.
- Focused on thumb-friendly navigation and tighter screen structure.

## v6.0.1 - 2026-06-21

### Changed

- Rewrote VisePanda from a clean foundation in the new `JTCAO515/VP-Codex-Web` repository.
- Preserved the core product idea while avoiding direct reuse of old frontend code.

## Historical Baseline

The project was copied from the `VP-Hermes-Web` v5.0.9 baseline before the v6 clean rewrite path began. Earlier v4 and v5 entries are historical archive material and should not be treated as the current product plan.

# Changelog

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

# VisePanda Active Plan

Last updated: 2026-06-23
Current version: v6.2.1

## Current Objective

Upgrade VisePanda from a China trip planning workspace into an all-in-one China travel butler for foreign visitors.

The active product loop is now:

```text
Ask before trip -> save/organize in Dashboard and Trips -> use Translate/Map/Tools during trip -> refine Ask with real context
```

## Current Baseline

Already shipped or actively implemented:

- English-native static frontend.
- Mobile-first app shell.
- Dashboard command center.
- Clean Ask conversation with follow-up suggestions.
- Native Translate tab foundation.
- Translation JSON datasets under `data/translations/`.
- `/api/translations` endpoint.
- City, map, tools, trips, auth, and admin foundations.
- Email verification, optional Resend, optional Google OAuth.
- Local fallback behavior for AI and translation dictionary use.

## Phase Plan

### Phase 1: Pre-Trip Planning

Status: foundation complete, still needs depth.

- Improve trip-intake quality.
- Convert strong Ask outputs into saved trip drafts.
- Add hotel-area and foreigner-friendly accommodation guidance.
- Add high-speed rail and 12306 foreign passport guidance.
- Keep visa/payment/SIM/VPN readiness practical and conservative.

### Phase 1.5: During-Trip Butler

Status: current core direction.

- Translate text and phrase-library content natively.
- Add browser speech recognition and TTS flow when available.
- Expand dining translation: dishes, spice, allergens, vegetarian, halal, foreign-card signals.
- Expand attractions translation: names, aliases, signs, opening notes, ticket reminders.
- Add taxi snippets with Chinese driver-facing address templates.
- Add local route tools for one-day city routing.
- Add Meituan/Dianping group-buying guidance inside Tools, without pretending to purchase directly.

### Phase 2: After-Trip Community

Status: documented only, out of current scope.

- Community.
- Travel journals.
- Companion matching.
- Ratings and feedback.
- Shared itinerary stories.

## Next Five Iterations

### Round 1: Translation MVP Hardening

- Improve phrase search and category filters.
- Add phrase copy and speaker playback.
- Add more emergency, hotel, taxi, and restaurant phrases.
- Add tests for `/api/translations` shape and frontend Translate structure.

### Round 2: Voice Translation

- Implement press-to-speak where browser STT is available.
- Auto-detect Chinese/English and show both text directions.
- Add TTS playback for translated output.
- Keep text fallback visible when voice permission fails.

### Round 3: Dining Butler

- Expand dish database.
- Add spice/allergen filters.
- Add restaurant-friendly labels: English menu, foreign cards, halal, vegetarian.
- Add point-and-show ordering cards.

### Round 4: Route/Ride Butler

- Add taxi driver cards.
- Add route handoff from Map to Translate.
- Add city one-day route templates.
- Add Gaode/Didi guidance without deep integration claims.

### Round 5: Trip Context Loop

- Connect saved trips to Translate suggestions.
- Surface city-specific phrases based on active trip city.
- Add "use in Ask" from Translate cards.
- Add trip-day context to Dashboard.

## Near-Term Rules

- UI must remain English-native.
- Mobile portrait comes first.
- Do not build Phase 2 community in this cycle.
- Keep the stack vanilla JS + Python WSGI.
- Add tests when changing navigation, APIs, chat, auth, trips, or translation data.
- Update cache busting when CSS/JS changes.
- Do not commit secrets.

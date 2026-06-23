# VisePanda Product Analysis

Last updated: 2026-06-23
Current version: v6.2.1
Domain: `go2china.space`

## One-Line Product

VisePanda is your all-in-one China travel butler: from planning your first trip to navigating every meal, ride, and sign along the way.

## New Positioning

VisePanda is no longer only a travel planning workspace. It is an English-native full-trip butler for foreigners visiting China, covering the full journey:

```text
Before trip -> During trip -> After trip
```

The product should answer planning questions, preserve trip context, help users move through China day by day, and reduce language, payment, route, restaurant, and local-service friction.

## Vision

Make China feel navigable for international visitors who do not read Chinese, do not know local apps, and need practical help at the exact moment of travel.

The product promise:

- plan the trip before departure;
- help with entry readiness, hotels, rail, flights, payments, phone setup, and culture;
- translate real-world situations during the trip;
- recommend restaurants, local routes, rides, and group-buying steps;
- preserve useful trip context without forcing a heavy booking platform;
- postpone community/social features until the core butler loop is strong.

## Primary Users

| Segment | Need | Product Fit |
| --- | --- | --- |
| First-time foreign visitors | Understand China logistics before booking | Ask, Dashboard, Cities, visa/readiness tools |
| Independent travelers already in China | Translate, eat, move, and solve local friction | Translate, Map, Tools, phrase library |
| Families and older travelers | Reduce anxiety around taxis, hotels, restaurants, and emergencies | Voice/text translation, emergency phrases, readiness checklist |
| High-intent itinerary builders | Turn ideas into concrete trip plans | Ask, Trips, city context, route intelligence |
| English-speaking helpers | Explain China travel clearly for someone else | Dashboard, saved trips, structured answers |

## Phase Plan

### Phase 1: Pre-Trip Planning

Current foundation is already usable.

- Consultation: when to go, where to go, how many days, route suggestions.
- Readiness: visa type, entry policy, phone/SIM/VPN, payment setup, culture reminders.
- Itinerary: AI-generated city sequence, daily plan, recommended pacing.
- Hotels: foreigner-friendly hotel guidance, location, English service, booking direction.
- Major transport: flight logic, high-speed rail guidance, foreign passport 12306 notes.

### Phase 1.5: During-Trip Butler

This is the current core expansion.

- Native Translate view.
- Voice translation direction and browser speech capability detection.
- Text translation with local travel dictionary lookup.
- Phrase cards for taxi, hotel, restaurants, shopping, attractions, and emergencies.
- Restaurant help: dishes, spice, allergens, English-menu and foreign-card context.
- Route help: city route and transfer logic through Map.
- Taxi help: Chinese address phrases and driver-facing snippets.
- Group-buying guidance: Meituan/Dianping steps should be added later inside Tools.

### Phase 2: After-Trip Community

Not in this release scope.

Future ideas: community, travel journals, companions, review loops, scoring, and feedback. These should remain documented only until Phase 1 and Phase 1.5 become reliable.

## Translation Differentiator

The translation product must be native to VisePanda, not a redirect to a third party.

Current v6.2.1 foundation:

- `data/translations/phrases.json`
- `data/translations/dining.json`
- `data/translations/attractions.json`
- `data/translations/culture.json`
- `/api/translations`
- `Translate` tab in the app shell
- local translation history with clear-history control

Planned expansion:

- 200+ attraction records.
- 500+ dish records.
- richer allergen, spice, halal, vegetarian, and foreigner-friendly restaurant tags.
- voice STT/TTS flow once browser/provider support is finalized.
- offline packs for core phrases and emergency content.

## Current Product Surface

- Dashboard: recent questions, saved trip summary, quick planning, featured cities, readiness state.
- Ask: clean AI travel conversation with follow-up question suggestions.
- Translate: native text/phrase translation and voice-readiness surface.
- Cities: searchable China destination cards.
- Map: route and geography intelligence.
- Tools: practical helper cards.
- Trips: guest and authenticated trip drafts.
- Account: email/password, email verification, optional Google OAuth.
- Admin: minimal internal user-management console.

## Success Metrics

| Metric | Signal |
| --- | --- |
| Pre-trip completion | User reaches a useful route or checklist |
| During-trip usage | User opens Translate/Map/Tools after trip context exists |
| Translation usefulness | Phrase card clicks and text translations produce repeat use |
| Save rate | User saves a trip after Ask output |
| Mobile usability | No input/nav overlap on portrait phones |
| Provider resilience | Local dictionary and fallback flows remain useful offline or without API keys |

## Non-Goals For v6.2.1

- Phase 2 community.
- Real booking engine.
- Native mobile app.
- Full offline machine translation engine.
- Payment/subscription system.
- Large database migration.

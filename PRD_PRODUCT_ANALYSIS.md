# VisePanda Product Analysis

Last updated: 2026-06-23
Current version: v7.0.0

## One-Line Product

VisePanda is your all-in-one China travel butler: from planning your first trip to navigating every meal, ride, and sign along the way.

## Positioning

VisePanda is an English-native full-trip butler for foreigners visiting China, covering the full journey:

```text
Before trip -> During trip -> After trip (future)
```

v7.0.0 is a full from-scratch rewrite of the product's frontend and backend. The product positioning and three-tab IA below carry forward unchanged from v6.2.1; what changed is the implementation underneath, plus the removal of auth and the admin panel as out-of-scope for the rewrite's functional target (Chat, Dashboard, Translate). See `CHANGELOG.md` and `OPTIMIZATION_REPORT.md` for what was rebuilt and why.

The product should answer planning questions, help users move through China day by day, and reduce language, payment, route, restaurant, and local-service friction — without requiring an account.

## Vision

Make China feel navigable for international visitors who do not read Chinese, do not know local apps, and need practical help at the exact moment of travel.

The product promise:

- plan the trip before departure via an AI travel guide;
- translate real-world situations during the trip with a native (not redirected) translator;
- recommend hotels, restaurants, deals, and tools relevant to a destination;
- keep the surface small and account-free so there is no signup friction;
- postpone community/social features until the core butler loop is strong.

## Primary Users

| Segment | Need | Product Fit |
| --- | --- | --- |
| First-time foreign visitors | Understand China logistics before booking | Chat, Dashboard tools/visa lookup |
| Independent travelers already in China | Translate, eat, move, and solve local friction | Translate, Dashboard hotels/deals |
| Families and older travelers | Reduce anxiety around restaurants and emergencies | Translate phrase cards, emergency content |
| High-intent itinerary builders | Turn ideas into concrete trip plans | Chat, Dashboard featured cities |

## Phase Plan

### Phase 1: Pre-Trip Planning

Current foundation, implemented in v7.0.0 as the Chat tab plus Dashboard's tools/visa card.

- Chat answers planning questions with city, food, money, and visa guidance, backed by `data/cities.json`, `data/visa_policies.json`, and `data/tips.json`.
- Dashboard surfaces featured cities, hotels, deals, and a visa lookup tool without requiring the user to leave the destination context.

### Phase 1.5: During-Trip Butler

Current core direction, implemented as the Translate tab plus Dashboard hotels/deals.

- Native text translation and phrase lookup across phrases, dining, attractions, and culture categories.
- Local translation history kept client-side (no account needed).
- Hotel and deals search scoped by city.
- Voice translation (STT/TTS) is **not yet implemented** — the Translate tab has a voice-readiness affordance only. This is the most visible gap between the documented Phase 1.5 vision and the current v7.0.0 implementation.

### Phase 2: After-Trip Community

Not in scope. Community, travel journals, companion matching, and review loops remain documented-only ideas and should not be built until Phase 1 and 1.5 are solid on the new v7.0.0 base.

## Translation Differentiator

The translation product is native to VisePanda, not a redirect to a third party.

Current v7.0.0 foundation (data layer unchanged from pre-rewrite, served through the new `/api/translations` route):

- `data/translations/phrases.json`
- `data/translations/dining.json`
- `data/translations/attractions.json`
- `data/translations/culture.json`
- `/api/translations?category=&q=`
- `Translate` tab with category lookup and local history

Planned expansion:

- voice STT/TTS once a browser/provider approach is chosen and implemented;
- broader dish and attraction coverage in `data/translations/`;
- richer allergen, spice, halal, vegetarian, and foreigner-friendly restaurant tags.

## Current Product Surface (v7.0.0)

- **Chat**: default view, streaming AI travel guide (DeepSeek) with a deterministic local fallback so it never fails to answer.
- **Dashboard**: lazy-loaded hub for recent questions, saved trips (local only), featured cities, hotels, deals, and tools/visa lookup.
- **Translate**: lazy-loaded native text/phrase translation with local history.

No account system and no admin console exist in v7.0.0 — both were removed in the rewrite as out of scope. If an account system is wanted again later, it needs to be redesigned and rebuilt from scratch against the new `api/lib`/`api/routes` structure, not restored from old code.

## Success Metrics

| Metric | Signal |
| --- | --- |
| Pre-trip usefulness | Chat produces a specific, city-grounded answer (local fallback or DeepSeek) |
| During-trip usage | User opens Translate and looks up more than one phrase per session |
| Translation usefulness | Phrase lookups and category filters lead to repeat use within a session |
| Dashboard engagement | Hotels/deals/tools cards get opened after a city is mentioned in Chat |
| Provider resilience | Local fallback paths (`local_answer`, Amap fixtures) remain useful with no API keys configured |

## Non-Goals For v7.0.0

- Phase 2 community.
- Real booking engine (hotel "book" is an explicit request-stub, not a transaction).
- Native mobile app.
- Account system / auth (removed; was present in v6.2.1, not carried forward).
- Admin console (removed; was present in v6.2.1, not carried forward).
- Full offline machine translation engine.
- Payment/subscription system.

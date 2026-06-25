"""Partner booking links — Ctrip/Trip.com H5 deep links (hotels, flights,
trains) and Meituan Union (group-buy deals).

## Ctrip — URL builder, not an API call

Ctrip Union retired the callable search API this integration originally
targeted. The current integration surface is their **URL生成工具**
(URL builder) in the open-platform console: you pick a page type, fill in
search parameters, and it hands you a templated H5 deep link — there is no
request/response, just a query string the user's browser opens directly.

`_ctrip_url()` below builds four kinds of links:
  - hotel list   (city + check-in/out dates)
  - hotel detail (hotel id + check-in/out dates)
  - train list   (origin + destination + date)
  - flight list  (origin + destination + trip type + dates)

⚠️ **The exact path and query-parameter names below are not yet verified
against the product owner's real account.** `allianceid`/`sid` are the
affiliate-attribution parameters used consistently across Ctrip's public
affiliate documentation, and the URL skeletons follow their documented H5
page structure — but until the product owner pastes a real generated link
from their open-platform console (see docs/HANDOFF.md), treat these as
best-effort and re-check the query param names if a link doesn't resolve
to the right page.

## Meituan — still an affiliate API, not yet swapped

Meituan Union has not announced the same API retirement, so `_deals()`
still attempts a Union API call when keys are present (same best-effort,
needs-verification caveat as before) and falls back to curated local data
+ a generic meituan.com link otherwise.

## Dianping ratings

No public API exists for third parties; `api/ratings.py` uses Amap POI
ratings as the realistic substitute — unrelated to the Ctrip change above,
documented here only so this isn't mistaken for an oversight.

GET /api/partners/hotels?city=<id>&checkin=&checkout=
GET /api/partners/hotel-detail?hotel_id=<id>&checkin=&checkout=
GET /api/partners/transport?from=<city>&to=<city>&date=&mode=train|flight&return_date=&trip_type=oneway|roundtrip
GET /api/partners/deals?city=<id>
GET /api/partners/attractions?city=<id>
"""
from __future__ import annotations

import json
import urllib.parse

from . import config
from .common import error_response, http_request, json_response, parse_query
from .dashboard import ATTRACTIONS, CITIES, DEALS, HOTELS


def _city(city_id: str) -> dict | None:
    return next((c for c in CITIES if c["id"] == city_id), None)


# ============================================================
# Ctrip / Trip.com H5 deep-link builder (URL工具, no API call)
# ============================================================

def _ctrip_affiliate_params() -> dict:
    return {"allianceid": config.CTRIP_AID, "sid": config.CTRIP_SID}


def _ctrip_url(kind: str, **params) -> str:
    """Build a Ctrip/Trip.com H5 deep link. `kind` is one of:
    'hotel_list', 'hotel_detail', 'train_list', 'flight_list'.
    Unset params are simply omitted from the query string.
    """
    base_by_kind = {
        "hotel_list": "https://hotels.ctrip.com/domestic/list",
        "hotel_detail": "https://hotels.ctrip.com/hotel",
        "train_list": "https://trains.ctrip.com/webapp/train/list",
        "flight_list": "https://flights.ctrip.com/online/list",
    }
    base = base_by_kind[kind]
    query = {k: v for k, v in params.items() if v}
    query.update(_ctrip_affiliate_params())
    return f"{base}?{urllib.parse.urlencode(query)}"


def _hotels(environ, start_response):
    params = parse_query(environ)
    city = _city(params.get("city", ""))
    if not city:
        return error_response(start_response, "Unknown city")
    checkin = params.get("checkin", "")
    checkout = params.get("checkout", "")

    curated = [h for h in HOTELS if h["city"] == city["id"]]
    book_url = _ctrip_url("hotel_list", city=city["name"], checkin=checkin, checkout=checkout)
    return json_response(start_response, {
        "ok": True, "provider": "ctrip_h5",
        "hotels": curated,
        "book_url": book_url,
    })


def _hotel_detail(environ, start_response):
    params = parse_query(environ)
    hotel_id = params.get("hotel_id", "")
    if not hotel_id:
        return error_response(start_response, "hotel_id is required")
    checkin = params.get("checkin", "")
    checkout = params.get("checkout", "")
    book_url = _ctrip_url("hotel_detail", hotelId=hotel_id, checkin=checkin, checkout=checkout)
    return json_response(start_response, {"ok": True, "provider": "ctrip_h5", "book_url": book_url})


def _transport(environ, start_response):
    params = parse_query(environ)
    origin = params.get("from", "")
    dest = params.get("to", "")
    date = params.get("date", "")
    return_date = params.get("return_date", "")
    mode = params.get("mode", "train")
    trip_type = params.get("trip_type", "oneway")  # 'oneway' | 'roundtrip'

    if mode == "flight":
        book_url = _ctrip_url(
            "flight_list",
            dcity=origin, acity=dest, ddate=date,
            rdate=return_date if trip_type == "roundtrip" else "",
            triptype="1" if trip_type == "oneway" else "2",
        )
    else:
        book_url = _ctrip_url("train_list", dstation=origin, astation=dest, date=date)

    return json_response(start_response, {
        "ok": True, "provider": "ctrip_h5",
        "book_url": book_url,
        "note": f"Search {origin or 'your origin'} → {dest or 'destination'}"
                f" on {date or 'your travel date'} once there.",
    })


# ============================================================
# Meituan Union (美团联盟) — still an affiliate API (unverified scaffold)
# ============================================================

def _meituan_deal_search(city: dict) -> dict | None:
    """NOTE: exact 美团联盟 (Meituan Union) endpoint/signing must be
    confirmed against current docs once a partner account is approved —
    unlike Ctrip, Meituan has not (as of this writing) announced retiring
    its callable API, so this path is left as a best-effort scaffold.
    """
    if not config.has_meituan():
        return None
    try:
        code, body, _ = http_request(
            "https://union.meituan.com/api/deal/list",
            method="POST",
            data={"apikey": config.MEITUAN_UNION_API_KEY, "city": city["name"]},
            timeout=10,
        )
        if code != 200:
            return None
        data = json.loads(body.decode("utf-8"))
        return data if data.get("deals") else None
    except Exception:  # noqa: BLE001
        return None


def _deals(environ, start_response):
    params = parse_query(environ)
    city = _city(params.get("city", ""))
    if not city:
        return error_response(start_response, "Unknown city")

    live = _meituan_deal_search(city)
    if live:
        return json_response(start_response, {
            "ok": True, "provider": "meituan_union",
            "deals": live.get("deals", []),
            "book_url": live.get("deep_link") or "https://www.meituan.com/",
        })

    curated = [d for d in DEALS if d["city"] == city["id"]]
    return json_response(start_response, {
        "ok": True, "provider": "local",
        "deals": curated,
        "book_url": "https://www.meituan.com/",
    })


def _attractions(environ, start_response):
    """Curated attraction list + a Ctrip H5 hotel-list-style link is wrong
    for activities, so this stays on Trip.com's "things to do" page (no
    affiliate params confirmed for this page type yet — add when verified).
    """
    params = parse_query(environ)
    city = _city(params.get("city", ""))
    if not city:
        return error_response(start_response, "Unknown city")

    curated = [a for a in ATTRACTIONS if a["city"] == city["id"]]
    qs = urllib.parse.urlencode({"city": city["name"]})
    return json_response(start_response, {
        "ok": True, "provider": "local",
        "attractions": curated,
        "book_url": f"https://www.trip.com/things-to-do/?{qs}",
    })


def handle(environ, start_response, path: str):
    if path == "/api/partners/hotels":
        return _hotels(environ, start_response)
    if path == "/api/partners/hotel-detail":
        return _hotel_detail(environ, start_response)
    if path == "/api/partners/transport":
        return _transport(environ, start_response)
    if path == "/api/partners/deals":
        return _deals(environ, start_response)
    if path == "/api/partners/attractions":
        return _attractions(environ, start_response)
    return error_response(start_response, "Route not found", "404 Not Found")

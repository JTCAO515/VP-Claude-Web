"""Partner booking links — Ctrip/Trip.com Union (hotels, flights, trains)
and Meituan Union (group-buy deals).

Both are CPS/affiliate programs, not order-placement APIs: the realistic
integration is searching their inventory (once the partner account is
approved and keys are set) and producing a tracked deep link for the user
to complete checkout on the partner's own site. Dianping/Meituan review
data has no public ratings API for third parties — see api/ratings.py for
the Amap-based substitute.

Without keys, every endpoint still returns curated local data plus a
working (untracked) link to the right top-level section of the partner
site, so this feature is useful immediately and never breaks while
waiting on partner approval. We deliberately do NOT fabricate deep-link
query parameters we haven't verified — only the stable, well-known
top-level paths are used as fallback targets.

GET /api/partners/hotels?city=<id>&checkin=&checkout=
GET /api/partners/transport?from=<city>&to=<city>&date=&mode=train|flight
GET /api/partners/deals?city=<id>
"""
from __future__ import annotations

import hashlib
import hmac
import json
import time
import urllib.parse

from . import config
from .common import error_response, http_request, json_response, parse_query
from .dashboard import ATTRACTIONS, CITIES, DEALS, HOTELS


def _city(city_id: str) -> dict | None:
    return next((c for c in CITIES if c["id"] == city_id), None)


# ============================================================
# Ctrip / Trip.com Union (携程联盟)
# ============================================================

def _ctrip_hotel_search(city: dict, checkin: str, checkout: str) -> dict | None:
    """Best-effort Union API call — returns None on any failure so the
    caller falls back to curated data + a generic link.

    NOTE: the exact endpoint path and signing scheme below must be
    validated against the current 携程联盟 (Ctrip Union) API docs once a
    partner account is approved; this scaffold follows their documented
    appkey + HMAC-SHA256-over-sorted-params pattern but has not been
    tested against a live account.
    """
    if not config.has_ctrip():
        return None
    try:
        ts = str(int(time.time()))
        payload = {
            "appkey": config.CTRIP_UNION_API_KEY,
            "pid": config.CTRIP_UNION_PID,
            "city": city["name"],
            "checkin": checkin,
            "checkout": checkout,
            "timestamp": ts,
        }
        sign_str = "&".join(f"{k}={v}" for k, v in sorted(payload.items()) if v)
        signature = hmac.new(
            config.CTRIP_UNION_API_SECRET.encode(), sign_str.encode(), hashlib.sha256
        ).hexdigest()
        payload["sign"] = signature
        code, body, _ = http_request(
            "https://openapi.ctrip.com/osp/apiplatform/union/hotel/list",
            method="POST", data=payload, timeout=10,
        )
        if code != 200:
            return None
        data = json.loads(body.decode("utf-8"))
        return data if data.get("hotels") else None
    except Exception:  # noqa: BLE001
        return None


def _hotels(environ, start_response):
    params = parse_query(environ)
    city = _city(params.get("city", ""))
    if not city:
        return error_response(start_response, "Unknown city")
    checkin = params.get("checkin", "")
    checkout = params.get("checkout", "")

    live = _ctrip_hotel_search(city, checkin, checkout)
    if live:
        return json_response(start_response, {
            "ok": True, "provider": "ctrip_union",
            "hotels": live.get("hotels", []),
            "book_url": live.get("deep_link") or "https://www.trip.com/hotels/",
        })

    curated = [h for h in HOTELS if h["city"] == city["id"]]
    qs = urllib.parse.urlencode({"city": city["name"]})
    return json_response(start_response, {
        "ok": True, "provider": "local",
        "hotels": curated,
        "book_url": f"https://www.trip.com/hotels/?{qs}",
    })


def _transport(environ, start_response):
    params = parse_query(environ)
    origin = params.get("from", "")
    dest = params.get("to", "")
    date = params.get("date", "")
    mode = params.get("mode", "train")
    section = "trains" if mode == "train" else "flights"

    # NOTE: Ctrip Union also exposes flight/train search; left as a
    # fallback-only path until a partner account + endpoint docs confirm
    # the exact request shape (same caveat as _ctrip_hotel_search above).

    return json_response(start_response, {
        "ok": True, "provider": "local",
        "book_url": f"https://www.trip.com/{section}/",
        "note": f"Search {origin or 'your city'} → {dest or 'destination'}"
                f" on {date or 'your travel date'} once there.",
    })


# ============================================================
# Meituan Union (美团联盟)
# ============================================================

def _meituan_deal_search(city: dict) -> dict | None:
    """NOTE: exact 美团联盟 (Meituan Union) endpoint/signing must be
    confirmed against current docs once a partner account is approved —
    same scaffold-not-yet-verified caveat as the Ctrip path above.
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
    """Curated attraction list + a link to Trip.com's "things to do" section.
    Ctrip Union also sells tickets/activities, but the exact endpoint isn't
    confirmed against current docs yet — same caveat as hotels/transport.
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
    if path == "/api/partners/transport":
        return _transport(environ, start_response)
    if path == "/api/partners/deals":
        return _deals(environ, start_response)
    if path == "/api/partners/attractions":
        return _attractions(environ, start_response)
    return error_response(start_response, "Route not found", "404 Not Found")

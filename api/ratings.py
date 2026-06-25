"""POI ratings via Amap (高德地图) Web Service API.

This is the realistic substitute for Dianping/Meituan review data: neither
offers a public ratings API to third parties without a formal data-licensing
deal, but Amap's POI text-search returns a `rating` field (inside biz_ext)
for dining and attraction categories, sourced from its own review data.

GET /api/ratings?city=<id>&category=hotel|dining|attraction
  → { ok, pois: [{ name, rating, address }], provider }
  pois is empty (not an error) when AMAP_WEB_SERVICE_KEY is unset.
"""
from __future__ import annotations

import json

from . import config
from .common import error_response, http_request, json_response, parse_query
from .dashboard import CITIES

# Amap POI category codes — https://lbs.amap.com/api/webservice/guide/api/search
TYPE_CODES = {
    "hotel": "100000",       # 住宿服务
    "dining": "050000",      # 餐饮服务
    "attraction": "110000",  # 风景名胜
}


def handle(environ, start_response, path: str):
    params = parse_query(environ)
    city_id = params.get("city", "")
    category = params.get("category", "hotel")
    city = next((c for c in CITIES if c["id"] == city_id), None)
    if not city:
        return error_response(start_response, "Unknown city")

    if not config.has_amap_ratings():
        return json_response(start_response, {
            "ok": True, "pois": [], "provider": "unavailable",
        })

    types = TYPE_CODES.get(category, TYPE_CODES["hotel"])
    url = (
        "https://restapi.amap.com/v3/place/text"
        f"?city={city['name']}&types={types}&offset=20&page=1"
        f"&key={config.AMAP_WEB_SERVICE_KEY}&extensions=all"
    )
    code, body, _ = http_request(url, timeout=8)
    if code != 200:
        return json_response(start_response, {
            "ok": True, "pois": [], "provider": "amap_unavailable",
        })
    try:
        data = json.loads(body.decode("utf-8"))
        pois = []
        for p in data.get("pois", []):
            biz = p.get("biz_ext") or {}
            rating = biz.get("rating")
            try:
                rating_val = float(rating) if rating and rating != "暂无评分" else None
            except (TypeError, ValueError):
                rating_val = None
            pois.append({
                "name": p.get("name"),
                "rating": rating_val,
                "address": p.get("address"),
            })
        return json_response(start_response, {"ok": True, "pois": pois, "provider": "amap"})
    except (ValueError, KeyError):
        return json_response(start_response, {
            "ok": True, "pois": [], "provider": "amap_bad_response",
        })

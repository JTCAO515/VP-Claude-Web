"""Server-side Amap (高德地图) proxy.

The Amap key never reaches the frontend. When AMAP_KEY is not configured,
callers fall back to curated attraction/POI fixtures from /data so the map
card still shows something useful in development and in demos.
"""
import json
import os
import urllib.error
import urllib.parse
import urllib.request

from . import data

GEOCODE_URL = "https://restapi.amap.com/v3/geocode/geo"
PLACE_URL = "https://restapi.amap.com/v3/place/text"


def is_configured():
    return bool(os.environ.get("AMAP_KEY"))


def _get(url, params):
    key = os.environ.get("AMAP_KEY")
    query = dict(params, key=key, output="JSON")
    full_url = f"{url}?{urllib.parse.urlencode(query)}"
    with urllib.request.urlopen(full_url, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


def geocode(address):
    if is_configured():
        try:
            result = _get(GEOCODE_URL, {"address": address})
            geocodes = result.get("geocodes") or []
            if geocodes:
                location = geocodes[0]["location"]
                lng, lat = location.split(",")
                return {"source": "amap", "address": address, "lng": float(lng), "lat": float(lat),
                        "formatted_address": geocodes[0].get("formatted_address", address)}
        except (urllib.error.URLError, KeyError, ValueError, json.JSONDecodeError):
            pass
    return {"source": "fallback", "address": address, "lng": None, "lat": None,
            "formatted_address": address}


def search_places(keyword, city=None):
    if is_configured():
        try:
            params = {"keywords": keyword}
            if city:
                params["city"] = city
            result = _get(PLACE_URL, params)
            pois = result.get("pois") or []
            return {"source": "amap", "results": [
                {"name": poi.get("name"), "address": poi.get("address"), "location": poi.get("location")}
                for poi in pois[:10]
            ]}
        except (urllib.error.URLError, KeyError, json.JSONDecodeError):
            pass
    return {"source": "fallback", "results": _fallback_pois(keyword, city)}


def _fallback_pois(keyword, city):
    keyword_lower = (keyword or "").lower()
    city_lower = (city or "").lower()
    matches = []
    for attraction in data.translations("attractions"):
        haystack = f"{attraction['chinese']} {attraction['english']} {' '.join(attraction.get('aliases', []))}".lower()
        if (not keyword_lower or keyword_lower in haystack) and (not city_lower or city_lower in haystack):
            matches.append({
                "name": attraction["english"],
                "address": attraction["notes"],
                "location": None,
            })
    return matches[:10]

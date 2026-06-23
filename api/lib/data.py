"""Read-only access to the curated JSON knowledge base under /data."""
import json
import os
import threading

_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_DATA_DIR = os.path.join(_ROOT, "data")

_lock = threading.Lock()
_cache = {}


def _path(*parts):
    return os.path.join(_DATA_DIR, *parts)


def load(*parts):
    """Load and cache a JSON file from /data, keyed by its relative path."""
    key = parts
    with _lock:
        if key in _cache:
            return _cache[key]
        with open(_path(*parts), "r", encoding="utf-8") as handle:
            value = json.load(handle)
        _cache[key] = value
        return value


def cities():
    return load("cities.json")


def city_images():
    return load("city_images.json")


def hotels():
    return load("hotels", "hotels.json")["hotels"]


def deals():
    return load("deals", "deals.json")["deals"]


def translations(category):
    mapping = {
        "phrases": ("translations", "phrases.json", "phrases"),
        "dining": ("translations", "dining.json", "dishes"),
        "attractions": ("translations", "attractions.json", "attractions"),
        "culture": ("translations", "culture.json", "culture"),
    }
    folder, filename, key = mapping[category]
    return load(folder, filename)[key]


def dining_tags():
    return load("translations", "dining.json").get("restaurantTags", [])


def attraction_signs():
    return load("translations", "attractions.json").get("signs", [])


def tools_bundle():
    return load("tools.json")


def tips():
    return load("tips.json")


def faq():
    return load("faq.json")

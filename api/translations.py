"""Serve curated translation datasets from data/translations/*.json.

Routes:
  GET /api/translations              → { ok, categories, counts, data }
  GET /api/translations/<slug>       → { ok, slug, ...content }
  GET /api/translations?category=X   → { ok, category, items } (legacy)
"""
from __future__ import annotations

from .common import error_response, json_response, load_translation, parse_query

CATEGORIES = ["phrases", "dining", "attractions", "culture"]


def _serve_slug(start_response, slug: str):
    if slug not in CATEGORIES:
        return error_response(start_response, "Unknown translation slug",
                              "404 Not Found")
    content = load_translation(slug)
    return json_response(start_response, {"ok": True, "slug": slug, **(
        content if isinstance(content, dict) else {"items": content}
    )})


def handle(environ, start_response, path: str):
    # /api/translations/<slug>
    if path.startswith("/api/translations/"):
        slug = path[len("/api/translations/"):].strip("/").lower()
        if slug:
            return _serve_slug(start_response, slug)
    # Legacy ?category= form
    params = parse_query(environ)
    category = (params.get("category") or "").strip().lower()
    if category and category in CATEGORIES:
        return _serve_slug(start_response, category)
    data = {c: load_translation(c) for c in CATEGORIES}
    counts = {}
    for c, v in data.items():
        if isinstance(v, dict) and "phrases" in v:
            counts[c] = len(v["phrases"])
        elif isinstance(v, list):
            counts[c] = len(v)
        else:
            counts[c] = 0
    return json_response(start_response, {
        "ok": True,
        "categories": CATEGORIES,
        "counts": counts,
        "data": data,
    })

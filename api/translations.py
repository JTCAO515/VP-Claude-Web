"""Serve curated translation datasets."""
from __future__ import annotations

from .common import json_response, load_translation, parse_query

CATEGORIES = ["phrases", "dining", "attractions", "culture"]


def handle(environ, start_response, path: str):
    params = parse_query(environ)
    category = (params.get("category") or "").strip().lower()
    if category and category in CATEGORIES:
        return json_response(start_response, {
            "ok": True,
            "category": category,
            "items": load_translation(category),
        })
    data = {c: load_translation(c) for c in CATEGORIES}
    counts = {c: len(v) if isinstance(v, list) else 0 for c, v in data.items()}
    return json_response(start_response, {
        "ok": True,
        "categories": CATEGORIES,
        "counts": counts,
        "data": data,
    })

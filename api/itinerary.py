"""Itinerary endpoints.

GET  /api/itinerary           → { ok, days: [...] } (empty when unauthed)
PUT  /api/itinerary           body { days: [...] } → { ok } (auth required)
"""
from __future__ import annotations

from . import storage
from .auth import require_session
from .common import error_response, json_response, parse_json_body


def handle(environ, start_response, path: str):
    method = environ.get("REQUEST_METHOD", "GET").upper()
    user = require_session(environ)
    if method == "GET":
        days = storage.itineraries.get(user["id"]) if user else []
        return json_response(start_response, {"ok": True, "days": days})
    if method == "PUT":
        if not user:
            return error_response(start_response, "Sign in to save your itinerary",
                                  status="401 Unauthorized", code="auth_required")
        body = parse_json_body(environ)
        days = body.get("days") or []
        if not isinstance(days, list):
            return error_response(start_response, "days must be a list")
        # Light validation: cap depth + sizes to avoid abuse.
        if len(days) > 60:
            return error_response(start_response, "Too many days (max 60)")
        ok = storage.itineraries.upsert(user["id"], days)
        if not ok:
            return error_response(start_response, "Could not save itinerary",
                                  status="503 Service Unavailable",
                                  code="storage_unavailable")
        return json_response(start_response, {"ok": True})
    return error_response(start_response, "Method not allowed",
                          status="405 Method Not Allowed")

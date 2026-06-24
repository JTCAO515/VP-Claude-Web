"""Favorites endpoints.

GET    /api/favorites?kind=<optional>   → { ok, items }
POST   /api/favorites                   body { kind, ref_id, payload? } → { ok, id }
DELETE /api/favorites/<id>              → 204
"""
from __future__ import annotations

from . import storage
from .auth import require_session
from .common import error_response, json_response, no_content, parse_json_body, parse_query


def handle(environ, start_response, path: str):
    method = environ.get("REQUEST_METHOD", "GET").upper()
    user = require_session(environ)
    # GET list
    if path == "/api/favorites" and method == "GET":
        if not user:
            return json_response(start_response, {"ok": True, "items": []})
        kind = parse_query(environ).get("kind") or None
        items = storage.favorites.list(user["id"], kind=kind)
        return json_response(start_response, {"ok": True, "items": items})
    # POST add
    if path == "/api/favorites" and method == "POST":
        if not user:
            return error_response(start_response, "Sign in to save favorites",
                                  status="401 Unauthorized", code="auth_required")
        body = parse_json_body(environ)
        kind = (body.get("kind") or "").strip()
        ref_id = (body.get("ref_id") or "").strip()
        payload = body.get("payload") or {}
        if not kind or not ref_id:
            return error_response(start_response, "kind and ref_id are required")
        item = storage.favorites.add(user["id"], kind, ref_id, payload)
        if not item:
            return error_response(start_response, "Could not save favorite",
                                  status="503 Service Unavailable",
                                  code="storage_unavailable")
        return json_response(start_response, {"ok": True, "id": item.get("id")})
    # DELETE /api/favorites/<id>
    if path.startswith("/api/favorites/") and method == "DELETE":
        if not user:
            return error_response(start_response, "Not signed in",
                                  status="401 Unauthorized", code="auth_required")
        fav_id = path[len("/api/favorites/"):].strip("/")
        if not fav_id:
            return error_response(start_response, "favorite id required")
        ok = storage.favorites.remove(fav_id, user["id"])
        if not ok:
            return error_response(start_response, "Favorite not found",
                                  status="404 Not Found")
        return no_content(start_response)
    return error_response(start_response, "Method not allowed",
                          status="405 Method Not Allowed")

"""Chat history endpoints (read-only).

GET /api/chat-history             → { ok, sessions: [...] }
GET /api/chat-history/<id>        → { ok, messages: [...] }
"""
from __future__ import annotations

from . import storage
from .auth import require_session
from .common import error_response, json_response


def handle(environ, start_response, path: str):
    method = environ.get("REQUEST_METHOD", "GET").upper()
    if method != "GET":
        return error_response(start_response, "Method not allowed",
                              status="405 Method Not Allowed")
    user = require_session(environ)
    if not user:
        # Unauthed: empty (no error)
        if path == "/api/chat-history":
            return json_response(start_response, {"ok": True, "sessions": []})
        return error_response(start_response, "Not signed in",
                              status="401 Unauthorized", code="auth_required")
    if path == "/api/chat-history":
        sessions = storage.chat_sessions.list(user["id"], limit=20)
        return json_response(start_response, {"ok": True, "sessions": sessions})
    if path.startswith("/api/chat-history/"):
        sid = path[len("/api/chat-history/"):].strip("/")
        if not sid:
            return error_response(start_response, "session id required")
        # Confirm the session belongs to this user before serving messages.
        sessions = storage.chat_sessions.list(user["id"], limit=200)
        if not any(s.get("id") == sid for s in sessions):
            return error_response(start_response, "Session not found",
                                  status="404 Not Found")
        msgs = storage.chat_messages.list(sid)
        return json_response(start_response, {"ok": True, "messages": msgs})
    return error_response(start_response, "Endpoint not found", "404 Not Found")

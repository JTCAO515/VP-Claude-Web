"""VisePanda v7 WSGI entrypoint. Routes everything: APIs + static frontend.

Compatible with Vercel @vercel/python (exposes `app`) and the stdlib WSGI server.
"""
from __future__ import annotations

import sys
import traceback
from pathlib import Path

# Make the project root importable when Vercel invokes from /api.
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from api import auth as auth_routes  # noqa: E402
from api import chat as chat_routes  # noqa: E402
from api import dashboard as dashboard_routes  # noqa: E402
from api import health as health_routes  # noqa: E402
from api import translations as translations_routes  # noqa: E402
from api.common import error_response, json_response, safe_join, serve_file  # noqa: E402
from api.config import ROOT_DIR, WEB_DIR, feature_flags  # noqa: E402


def _cors_preflight(start_response):
    headers = [
        ("Access-Control-Allow-Origin", "*"),
        ("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"),
        ("Access-Control-Allow-Headers", "Content-Type, Authorization"),
        ("Content-Length", "0"),
    ]
    start_response("204 No Content", headers)
    return [b""]


def _route_api(environ, start_response, path: str):
    if path == "/api/health":
        return health_routes.handle(environ, start_response, path)
    if path == "/api/config":
        return json_response(start_response, {"ok": True, **feature_flags()})
    if path.startswith("/api/auth") or path.startswith("/api/trips"):
        return auth_routes.handle(environ, start_response, path)
    if path == "/api/chat":
        return chat_routes.handle(environ, start_response, path)
    if path == "/api/translations":
        return translations_routes.handle(environ, start_response, path)
    if path in {"/api/cities", "/api/hotels", "/api/deals", "/api/tools", "/api/maps", "/api/weather"}:
        return dashboard_routes.handle(environ, start_response, path)
    return error_response(start_response, "Endpoint not found", "404 Not Found")


def _serve_static(environ, start_response, path: str):
    if path in ("", "/"):
        return serve_file(start_response, WEB_DIR / "index.html", cache="no-cache")
    if path == "/manifest.json":
        return serve_file(start_response, WEB_DIR / "manifest.json")
    if path == "/sw.js":
        return serve_file(start_response, WEB_DIR / "sw.js", cache="no-cache")
    if path == "/favicon.ico" or path == "/favicon.svg":
        return serve_file(start_response, WEB_DIR / "favicon.svg")
    if path.startswith("/web/"):
        target = safe_join(WEB_DIR, path[len("/web/"):])
        if target:
            return serve_file(start_response, target)
    if path.startswith("/data/translations/"):
        target = safe_join(ROOT_DIR / "data" / "translations", path[len("/data/translations/"):])
        if target:
            return serve_file(start_response, target)
    # SPA fallback — any unknown route returns index.html so the client router can resolve.
    return serve_file(start_response, WEB_DIR / "index.html", cache="no-cache")


def app(environ, start_response):
    method = environ.get("REQUEST_METHOD", "GET").upper()
    path = environ.get("PATH_INFO", "/") or "/"
    if method == "OPTIONS":
        return _cors_preflight(start_response)
    try:
        if path.startswith("/api/"):
            return _route_api(environ, start_response, path)
        return _serve_static(environ, start_response, path)
    except Exception:  # noqa: BLE001
        tb = traceback.format_exc(limit=4)
        return error_response(start_response, f"Internal error: {tb.splitlines()[-1]}", "500 Internal Server Error")


# Vercel detects `app`. The dev `python -m api.index` block runs locally.
if __name__ == "__main__":
    from wsgiref.simple_server import make_server
    port = 8765
    print(f"VisePanda v7 → http://127.0.0.1:{port}")
    make_server("127.0.0.1", port, app).serve_forever()

"""VisePanda v7.0 WSGI entrypoint. Routes APIs + static frontend.

Compatible with Vercel @vercel/python (exposes `app`) and the stdlib WSGI server.
"""
from __future__ import annotations

import sys
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from api.common import error_response, json_response, safe_join, serve_file  # noqa: E402
from api.config import ROOT_DIR, WEB_DIR, public_features  # noqa: E402


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
    # Lazy imports keep cold-start light.
    if path == "/api/health":
        from api import health
        return health.handle(environ, start_response, path)
    if path in ("/api/config", "/api/config/public"):
        return json_response(start_response, {"ok": True, **public_features()})
    if path.startswith("/api/auth"):
        from api import auth
        return auth.handle(environ, start_response, path)
    if path == "/api/chat":
        from api import chat
        return chat.handle(environ, start_response, path)
    if path == "/api/translate":
        from api import translate
        return translate.handle(environ, start_response, path)
    if path == "/api/tts":
        from api import tts
        return tts.handle(environ, start_response, path)
    if path == "/api/stt":
        from api import stt
        return stt.handle(environ, start_response, path)
    if path.startswith("/api/translations"):
        from api import translations
        return translations.handle(environ, start_response, path)
    if path in {"/api/cities", "/api/hotels", "/api/deals", "/api/attractions",
                "/api/tools", "/api/maps", "/api/weather"}:
        from api import dashboard
        return dashboard.handle(environ, start_response, path)
    if path.startswith("/api/itinerary"):
        from api import itinerary
        return itinerary.handle(environ, start_response, path)
    if path.startswith("/api/favorites"):
        from api import favorites
        return favorites.handle(environ, start_response, path)
    if path.startswith("/api/chat-history"):
        from api import chat_history
        return chat_history.handle(environ, start_response, path)
    if path.startswith("/api/trips"):
        from api import trips
        return trips.handle(environ, start_response, path)
    if path.startswith("/api/partners"):
        from api import partners
        return partners.handle(environ, start_response, path)
    if path == "/api/ratings":
        from api import ratings
        return ratings.handle(environ, start_response, path)
    return error_response(start_response, "Endpoint not found", "404 Not Found")


def _serve_static(environ, start_response, path: str):
    if path in ("", "/"):
        return serve_file(start_response, WEB_DIR / "index.html", cache="no-cache")
    if path == "/manifest.json":
        return serve_file(start_response, WEB_DIR / "manifest.json", cache="no-cache")
    if path == "/sw.js":
        return serve_file(start_response, WEB_DIR / "sw.js", cache="no-cache")
    if path in ("/favicon.ico", "/favicon.svg"):
        return serve_file(start_response, WEB_DIR / "favicon.svg")
    if path.startswith("/web/"):
        target = safe_join(WEB_DIR, path[len("/web/"):])
        if target:
            return serve_file(start_response, target)
    if path.startswith("/data/translations/"):
        target = safe_join(ROOT_DIR / "data" / "translations",
                           path[len("/data/translations/"):])
        if target:
            return serve_file(start_response, target)
    # SPA fallback: any unknown route returns index.html so the client router can resolve.
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
        tb = traceback.format_exc(limit=6)
        last = tb.strip().splitlines()[-1] if tb.strip() else "Unknown error"
        return error_response(start_response, f"Internal error: {last}",
                              "500 Internal Server Error")


if __name__ == "__main__":
    from wsgiref.simple_server import make_server
    port = 8765
    print(f"VisePanda v7 → http://127.0.0.1:{port}")
    make_server("127.0.0.1", port, app).serve_forever()

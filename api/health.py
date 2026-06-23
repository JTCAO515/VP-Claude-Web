"""Health endpoint."""
from __future__ import annotations

from .common import http_request, json_response
from .config import APP_NAME, DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, VERSION, feature_flags


def _deepseek_status() -> dict:
    if not DEEPSEEK_API_KEY:
        return {"provider": "deepseek", "status": "not_configured"}
    code, _body, _hdrs = http_request(
        f"{DEEPSEEK_BASE_URL}/v1/models",
        headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}"},
        timeout=5,
    )
    return {
        "provider": "deepseek",
        "status": "available" if 200 <= code < 300 else "unavailable",
        "http": code,
    }


def handle(environ, start_response, path: str):
    return json_response(start_response, {
        "ok": True,
        "service": APP_NAME,
        "version": VERSION,
        "llm": _deepseek_status(),
        "features": feature_flags(),
    })

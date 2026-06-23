"""Health endpoint."""
from __future__ import annotations

from .common import json_response
from .config import APP_NAME, VERSION, public_features


def handle(environ, start_response, path: str):
    return json_response(start_response, {
        "ok": True,
        "service": APP_NAME,
        "version": VERSION,
        "features": public_features(),
    })

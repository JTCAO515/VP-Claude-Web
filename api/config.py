"""Centralized environment / runtime configuration for VisePanda v7."""
from __future__ import annotations

import os
from pathlib import Path

VERSION = "7.0.0"
APP_NAME = "VisePanda"

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
TRANSLATIONS_DIR = DATA_DIR / "translations"
WEB_DIR = ROOT_DIR / "web"


def _env(name: str, default: str = "") -> str:
    value = os.environ.get(name)
    return value if value not in (None, "") else default


APP_BASE_URL = _env("APP_BASE_URL", "https://go2china.space")

# AI providers
DEEPSEEK_API_KEY = _env("DEEPSEEK_API_KEY")
DEEPSEEK_MODEL = _env("DEEPSEEK_MODEL", "deepseek-chat")
DEEPSEEK_BASE_URL = _env("DEEPSEEK_BASE_URL", "https://api.deepseek.com")

# Email
RESEND_API_KEY = _env("RESEND_API_KEY")
EMAIL_FROM = _env("EMAIL_FROM", "VisePanda <noreply@go2china.space>")

# Google OAuth
GOOGLE_CLIENT_ID = _env("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = _env("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = _env("GOOGLE_REDIRECT_URI", f"{APP_BASE_URL}/api/auth/google/callback")

# Auth / session
JWT_SECRET = _env("JWT_SECRET", "vp-v7-dev-secret-change-me")
JWT_TTL_DAYS = int(_env("JWT_TTL_DAYS", "30"))

# Storage (SQLite path; falls back to /tmp on serverless)
_default_db = "/tmp/visepanda_auth.db" if os.environ.get("VERCEL") else str(DATA_DIR / "auth.db")
AUTH_DB_PATH = _env("AUTH_DB_PATH", _default_db)

# Admin bootstrap
ADMIN_EMAIL = _env("ADMIN_EMAIL")
ADMIN_PASSWORD = _env("ADMIN_PASSWORD")

# Test-only flags
AUTH_EXPOSE_EMAIL_CODE = _env("AUTH_EXPOSE_EMAIL_CODE") == "1"

# Weather (open-meteo is keyless)
WEATHER_PROVIDER = _env("WEATHER_PROVIDER", "open-meteo")


def has_deepseek() -> bool:
    return bool(DEEPSEEK_API_KEY)


def has_google_oauth() -> bool:
    return bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)


def has_resend() -> bool:
    return bool(RESEND_API_KEY)


def feature_flags() -> dict:
    return {
        "version": VERSION,
        "deepseek": has_deepseek(),
        "google_oauth": has_google_oauth(),
        "email_verification": has_resend(),
    }

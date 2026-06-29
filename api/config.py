"""Centralized environment / runtime configuration for VisePanda v7.

Every secret defaults to an empty string so the app boots cleanly with no env
vars. Feature endpoints branch on has_*() helpers and degrade gracefully.
"""
from __future__ import annotations

import os
import secrets
from pathlib import Path

VERSION = "9.0.2"
APP_NAME = "VisePanda"

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
TRANSLATIONS_DIR = DATA_DIR / "translations"
WEB_DIR = ROOT_DIR / "web"
LOCAL_DB_PATH = DATA_DIR / "auth.db.json"


def _env(name: str, default: str = "") -> str:
    value = os.environ.get(name)
    return value.strip() if value not in (None, "") else default


# ---------- App ----------
APP_BASE_URL = _env("APP_BASE_URL", "https://claude.go2china.space").rstrip("/")
APP_ENV = _env("APP_ENV", "development").lower()

# ---------- AI: DeepSeek (chat + translate) ----------
DEEPSEEK_API_KEY = _env("DEEPSEEK_API_KEY")
DEEPSEEK_BASE_URL = _env("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
DEEPSEEK_MODEL = _env("DEEPSEEK_MODEL", "deepseek-chat")

# ---------- Voice: Alibaba DashScope (Qwen3-TTS, Qwen3-ASR) ----------
DASHSCOPE_API_KEY = _env("DASHSCOPE_API_KEY")
DASHSCOPE_BASE_URL = _env("DASHSCOPE_BASE_URL", "https://dashscope.aliyuncs.com").rstrip("/")
QWEN_TTS_MODEL = _env("QWEN_TTS_MODEL", "qwen3-tts-flash")
QWEN_TTS_VOICE = _env("QWEN_TTS_VOICE", "Chelsie")
QWEN_ASR_MODEL = _env("QWEN_ASR_MODEL", "qwen3-asr-flash")

# ---------- Storage: Supabase REST ----------
SUPABASE_URL = _env("SUPABASE_URL").rstrip("/")
SUPABASE_ANON_KEY = _env("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = _env("SUPABASE_SERVICE_KEY")

# ---------- Email: Resend ----------
RESEND_API_KEY = _env("RESEND_API_KEY")
RESEND_FROM = _env("RESEND_FROM", "VisePanda <hello@go2china.space>")

# ---------- Google OAuth ----------
GOOGLE_CLIENT_ID = _env("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = _env("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = _env(
    "GOOGLE_REDIRECT_URI", f"{APP_BASE_URL}/api/auth/callback"
)

# ---------- Maps: Amap (高德地图) JS API ----------
# Both values are intentionally exposed to the browser — this is Amap's
# documented client-side integration model (domain-restricted JS key +
# its paired security code). Neither is a server secret.
AMAP_JS_KEY = _env("AMAP_JS_KEY")
AMAP_SECURITY_CODE = _env("AMAP_SECURITY_CODE")

# ---------- Maps: Amap Web Service API (server-side POI search + ratings) ----------
# Different key type from AMAP_JS_KEY ("Web服务" key, not "Web端(JS API)" key).
# Used as the realistic substitute for restaurant/attraction ratings — Dianping
# and Meituan do not offer a public review/rating API to third parties without
# a data-licensing deal, but Amap's POI search returns a rating field
# (biz_ext.rating) for dining and attraction categories.
AMAP_WEB_SERVICE_KEY = _env("AMAP_WEB_SERVICE_KEY")

# ---------- Trip.com (携程国际版) — hotel/flight/train deep links ----------
# Researched Trip.com's integration options (confirmed June 2026, including
# a direct read of connect.trip.com's "Trip.com API" and "OpenTravel API"
# docs):
#
# 1. Trip.com Affiliate Program (trip.com/partners) — self-serve, free,
#    approved in hours/days. What you get is a tracked deep-link/affiliate
#    ID, NOT a structured query API. This is what we use: _ctrip_url() in
#    api/partners.py builds H5 deep links with AID/SID baked into the
#    query string, matching their "URL生成工具" deep-link model.
# 2. connect.trip.com's "Open platform" (Trip.com API / OpenTravel API /
#    CM OpenTravel API) is NOT a wrong-door-but-gated version of what we
#    want — it's the WRONG API ENTIRELY. It's a hotel/PMS *supply-side*
#    connectivity API: hoteliers and channel-manager companies use it to
#    push room content, rates, and availability INTO Trip.com, and to
#    receive reservation pushes back. It is not for third-party apps to
#    query/search Trip.com's inventory. Confirmed via:
#      - Doc framing: "Content / Rates & Availability / Reservation /
#        Promotions / Membership" — all supply-side concerns.
#      - Their own gate: "In order to establish a direct connectivity
#        partnership with Trip.com, companies are required to enter into
#        a business-side cooperation agreement."
#      - Auth model: SOAP+XML (OTA 2015B), with a `CodeContext` partner ID
#        "generated and provided by Ctrip" to an already-onboarded hotel/
#        PMS company — not a self-serve credential.
#    So even with a business deal, this wouldn't give VisePanda what it
#    wants (search hotels, generate a bookable link). Don't revisit this
#    path — it solves a different problem (being a hotel's distribution
#    channel, not being a travel app that searches Trip.com).
#
# AID + SID are affiliate-attribution IDs baked directly into the URL
# query string, not secrets — safe to ship a default. Override via env
# var once the product owner registers their own Trip.com affiliate
# account (the IDs below are a generic placeholder, not the product
# owner's own account).
CTRIP_AID = _env("CTRIP_AID", "8269906")
CTRIP_SID = _env("CTRIP_SID", "314255103")

# ---------- Meituan Union (美团联盟) — group-buy deal affiliate ----------
# Same CPS/affiliate model as Ctrip Union, scoped to group-buy deals.
# Requires partner approval at union.meituan.com.
MEITUAN_UNION_API_KEY = _env("MEITUAN_UNION_API_KEY")
MEITUAN_UNION_API_SECRET = _env("MEITUAN_UNION_API_SECRET")

# ---------- JWT / Session ----------
_jwt_env = _env("JWT_SECRET")
if _jwt_env:
    JWT_SECRET = _jwt_env
    JWT_SECRET_AUTOGENERATED = False
else:
    JWT_SECRET = secrets.token_hex(32)
    JWT_SECRET_AUTOGENERATED = True
JWT_TTL_DAYS = int(_env("JWT_TTL_DAYS", "7"))
SESSION_COOKIE = "vp_session"


# ---------- Feature flags ----------

def has_deepseek() -> bool:
    return bool(DEEPSEEK_API_KEY)


def has_voice() -> bool:
    return bool(DASHSCOPE_API_KEY)


def has_supabase() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)


def has_email() -> bool:
    return bool(RESEND_API_KEY)


def has_google() -> bool:
    return bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)


def has_map() -> bool:
    return bool(AMAP_JS_KEY)


def has_amap_ratings() -> bool:
    return bool(AMAP_WEB_SERVICE_KEY)


def has_ctrip() -> bool:
    # CTRIP_AID/CTRIP_SID ship with working defaults (see above), so the
    # H5 deep-link builder is available out of the box — this flag exists
    # so the product owner can blank out both env vars to disable it.
    return bool(CTRIP_AID and CTRIP_SID)


def has_meituan() -> bool:
    return bool(MEITUAN_UNION_API_KEY and MEITUAN_UNION_API_SECRET)


def is_production() -> bool:
    return APP_ENV == "production"


def public_features() -> dict:
    """Booleans + values exposed to the frontend at /api/config/public.
    amap_key/amap_security are safe to expose (see note above AMAP_JS_KEY).
    """
    return {
        "version": VERSION,
        "has_deepseek": has_deepseek(),
        "has_voice": has_voice(),
        "has_supabase": has_supabase(),
        "has_email": has_email(),
        "has_google": has_google(),
        "has_map": has_map(),
        "amap_key": AMAP_JS_KEY,
        "amap_security": AMAP_SECURITY_CODE,
        "has_amap_ratings": has_amap_ratings(),
        "has_ctrip": has_ctrip(),
        "has_meituan": has_meituan(),
        "app_env": APP_ENV,
    }

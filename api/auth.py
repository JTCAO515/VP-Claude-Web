"""Authentication endpoints — email/password, email verify, Google OAuth, profile.

All routes share state via storage.users + JWT cookies (vp_session).
"""
from __future__ import annotations

import sys
import time

from . import config, email_resend, google_oauth, storage
from .common import (
    build_cookie,
    clear_cookie,
    error_response,
    hash_password,
    jwt_sign,
    jwt_verify,
    no_content,
    ok_response,
    parse_cookies,
    parse_json_body,
    parse_query,
    random_code,
    random_id,
    redirect,
    session_token,
    sha256_hex,
    verify_password,
)

# A short-lived in-memory cache for OAuth `state` tokens. This is "best effort" —
# on Vercel cold starts each instance has its own dict, but the state lives only
# 5 minutes anyway. State is also written into a cookie as a backup.
_OAUTH_STATES: dict[str, float] = {}
_OAUTH_STATE_TTL = 300.0  # seconds


def _public_user(u: dict) -> dict:
    return {
        "id": u.get("id"),
        "email": u.get("email"),
        "name": u.get("name"),
        "avatar_url": u.get("avatar_url"),
        "email_verified": bool(u.get("email_verified")),
        "created_at": u.get("created_at"),
    }


def _issue_cookie_header(user: dict) -> list[tuple[str, str]]:
    token = jwt_sign({"uid": user["id"], "email": user.get("email")})
    return [("Set-Cookie", build_cookie(config.SESSION_COOKIE, token))]


def require_session(environ) -> dict | None:
    """Return the live user dict for the current request, or None."""
    tok = session_token(environ)
    if not tok:
        return None
    payload = jwt_verify(tok)
    if not payload:
        return None
    return storage.users.find_by_id(payload.get("uid", ""))


# ============================================================
# /api/auth/register
# ============================================================

def _register(environ, start_response):
    body = parse_json_body(environ)
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    name = (body.get("name") or "").strip() or None
    if not email or "@" not in email:
        return error_response(start_response, "Invalid email", code="invalid_email")
    if len(password) < 8:
        return error_response(start_response, "Password must be at least 8 characters",
                              code="weak_password")
    if storage.users.find_by_email(email):
        return error_response(start_response, "An account with that email already exists",
                              code="email_taken", status="409 Conflict")
    code = random_code(6)
    verify_hash = sha256_hex(code)
    expires = int(time.time()) + 10 * 60
    record = {
        "id": random_id(),
        "email": email,
        "password_hash": hash_password(password),
        "name": name,
        "email_verified": False,
        "verify_code_hash": verify_hash,
        "verify_expires": expires,
    }
    user = storage.users.create(record)
    if not user:
        return error_response(start_response, "Could not create account",
                              status="503 Service Unavailable",
                              code="storage_unavailable")
    if config.has_email():
        sent = email_resend.send_verify(email, code)
        if not sent:
            print(f"[auth] Resend send failed for {email}; user must request resend.",
                  file=sys.stderr)
        return ok_response(
            start_response,
            data={"user": _public_user(user), "verify_required": True},
            extra_headers=[("Set-Cookie", build_cookie(config.SESSION_COOKIE,
                                                      jwt_sign({"uid": user["id"]})))],
        )
    # No email provider: auto-verify and sign in.
    user = storage.users.update(user["id"], {"email_verified": True,
                                              "verify_code_hash": None,
                                              "verify_expires": None}) or user
    print(f"[auth] RESEND_API_KEY empty; auto-verified {email}", file=sys.stderr)
    return ok_response(
        start_response,
        data={"user": _public_user(user), "verify_required": False},
        extra_headers=_issue_cookie_header(user),
    )


# ============================================================
# /api/auth/login
# ============================================================

def _login(environ, start_response):
    body = parse_json_body(environ)
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    if not email or not password:
        return error_response(start_response, "Email and password required",
                              code="missing_fields")
    user = storage.users.find_by_email(email)
    if not user or not user.get("password_hash"):
        return error_response(start_response, "Incorrect email or password",
                              code="bad_credentials", status="401 Unauthorized")
    if not verify_password(password, user["password_hash"]):
        return error_response(start_response, "Incorrect email or password",
                              code="bad_credentials", status="401 Unauthorized")
    return ok_response(
        start_response,
        data={"user": _public_user(user)},
        extra_headers=_issue_cookie_header(user),
    )


# ============================================================
# /api/auth/verify
# ============================================================

def _verify(environ, start_response):
    body = parse_json_body(environ)
    email = (body.get("email") or "").strip().lower()
    code = (body.get("code") or "").strip()
    if not email or not code:
        return error_response(start_response, "Email and code required",
                              code="missing_fields")
    user = storage.users.find_by_email(email)
    if not user:
        return error_response(start_response, "Account not found", status="404 Not Found",
                              code="not_found")
    if user.get("email_verified"):
        return ok_response(start_response, {"user": _public_user(user)},
                           extra_headers=_issue_cookie_header(user))
    expected_hash = user.get("verify_code_hash")
    if not expected_hash:
        return error_response(start_response, "No active code; request a new one",
                              code="no_pending_code")
    expires = user.get("verify_expires") or 0
    if int(time.time()) > int(expires):
        return error_response(start_response, "Code expired; request a new one",
                              code="code_expired")
    if sha256_hex(code) != expected_hash:
        return error_response(start_response, "Incorrect code", code="bad_code",
                              status="401 Unauthorized")
    user = storage.users.update(user["id"], {
        "email_verified": True,
        "verify_code_hash": None,
        "verify_expires": None,
    }) or user
    return ok_response(start_response, {"user": _public_user(user)},
                       extra_headers=_issue_cookie_header(user))


def _verify_resend(environ, start_response):
    body = parse_json_body(environ)
    email = (body.get("email") or "").strip().lower()
    user = storage.users.find_by_email(email)
    if not user:
        return no_content(start_response)  # don't leak existence
    if user.get("email_verified"):
        return no_content(start_response)
    if not config.has_email():
        return error_response(start_response, "Email provider not configured",
                              code="email_unavailable",
                              status="503 Service Unavailable")
    code = random_code(6)
    storage.users.update(user["id"], {
        "verify_code_hash": sha256_hex(code),
        "verify_expires": int(time.time()) + 10 * 60,
    })
    email_resend.send_verify(email, code)
    return no_content(start_response)


# ============================================================
# /api/auth/google + /api/auth/callback
# ============================================================

def _google_start(environ, start_response):
    if not config.has_google():
        return error_response(start_response, "Google OAuth not configured",
                              code="google_unavailable", status="503 Service Unavailable")
    state = random_id()
    _OAUTH_STATES[state] = time.time() + _OAUTH_STATE_TTL
    now = time.time()
    for k in list(_OAUTH_STATES):
        if _OAUTH_STATES[k] < now:
            _OAUTH_STATES.pop(k, None)
    return redirect(start_response, google_oauth.consent_url(state),
                    extra_headers=[("Set-Cookie",
                                    build_cookie("vp_oauth_state", state, max_age=600))])


def _google_callback(environ, start_response):
    params = parse_query(environ)
    code = params.get("code") or ""
    state = params.get("state") or ""
    cookie_state = parse_cookies(environ).get("vp_oauth_state")
    expires = _OAUTH_STATES.pop(state, 0)
    state_ok = (state and (state == cookie_state or expires > time.time()))
    if not state_ok or not code:
        return error_response(start_response, "OAuth state validation failed",
                              code="oauth_state", status="400 Bad Request")
    profile = google_oauth.exchange_code(code)
    if not profile:
        return error_response(start_response, "Google sign-in failed",
                              code="oauth_failed", status="502 Bad Gateway")
    google_id = profile["id"]
    email = (profile.get("email") or "").strip().lower()
    user = storage.users.find_by_google_id(google_id)
    if not user and email:
        user = storage.users.find_by_email(email)
        if user:
            user = storage.users.update(user["id"], {"google_id": google_id}) or user
    if not user:
        user = storage.users.create({
            "id": random_id(),
            "email": email or f"{google_id}@google.local",
            "google_id": google_id,
            "name": profile.get("name"),
            "avatar_url": profile.get("picture"),
            "email_verified": True,
        })
        if not user:
            return error_response(start_response, "Could not create account",
                                  status="503 Service Unavailable",
                                  code="storage_unavailable")
    headers = [
        ("Location", "/"),
        ("Content-Length", "0"),
        ("Set-Cookie", build_cookie(config.SESSION_COOKIE,
                                    jwt_sign({"uid": user["id"], "email": user.get("email")}))),
        ("Set-Cookie", clear_cookie("vp_oauth_state")),
    ]
    start_response("302 Found", headers)
    return [b""]


# ============================================================
# /api/auth/profile, logout, delete-account
# ============================================================

def _profile(environ, start_response):
    user = require_session(environ)
    if not user:
        # Return 200 with a null user so the frontend can probe at boot
        # without polluting the browser console with 401s on every page load.
        return ok_response(start_response, {"user": None})
    return ok_response(start_response, {"user": _public_user(user)},
                       extra_headers=_issue_cookie_header(user))


def _logout(environ, start_response):
    return no_content(start_response,
                      extra_headers=[("Set-Cookie", clear_cookie(config.SESSION_COOKIE))])


def _delete_account(environ, start_response):
    user = require_session(environ)
    if not user:
        return error_response(start_response, "Not signed in",
                              status="401 Unauthorized", code="auth_required")
    storage.users.delete(user["id"])
    return no_content(start_response,
                      extra_headers=[("Set-Cookie", clear_cookie(config.SESSION_COOKIE))])


# ============================================================
# Dispatcher
# ============================================================

def handle(environ, start_response, path: str):
    method = environ.get("REQUEST_METHOD", "GET").upper()
    if path == "/api/auth/register" and method == "POST":
        return _register(environ, start_response)
    if path == "/api/auth/login" and method == "POST":
        return _login(environ, start_response)
    if path == "/api/auth/verify" and method == "POST":
        return _verify(environ, start_response)
    if path == "/api/auth/verify/resend" and method == "POST":
        return _verify_resend(environ, start_response)
    if path == "/api/auth/google" and method == "GET":
        return _google_start(environ, start_response)
    if path == "/api/auth/callback" and method == "GET":
        return _google_callback(environ, start_response)
    if path == "/api/auth/profile" and method == "GET":
        return _profile(environ, start_response)
    if path == "/api/auth/logout" and method == "POST":
        return _logout(environ, start_response)
    if path == "/api/auth/account" and method == "DELETE":
        return _delete_account(environ, start_response)
    return error_response(start_response, "Endpoint not found", "404 Not Found")

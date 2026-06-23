"""Authentication: email/password register/login, email verification, Google OAuth, JWT sessions."""
from __future__ import annotations

import json
import re
import secrets
import sqlite3
import time
import urllib.parse
import uuid
from pathlib import Path

from .common import (bearer_token, error_response, get_header, hash_password, http_request,
                     json_response, jwt_sign, jwt_verify, ok_response, parse_json_body,
                     parse_query, verify_password)
from .config import (APP_BASE_URL, AUTH_DB_PATH, AUTH_EXPOSE_EMAIL_CODE, EMAIL_FROM,
                     GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI,
                     RESEND_API_KEY, has_google_oauth, has_resend)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# ---------- DB ----------

def _connect() -> sqlite3.Connection:
    Path(AUTH_DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(AUTH_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def _init():
    conn = _connect()
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              email TEXT UNIQUE NOT NULL,
              name TEXT,
              avatar_url TEXT,
              password_hash TEXT,
              google_id TEXT UNIQUE,
              email_verified INTEGER NOT NULL DEFAULT 0,
              created_at INTEGER NOT NULL,
              updated_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS email_codes (
              email TEXT PRIMARY KEY,
              code TEXT NOT NULL,
              expires_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS oauth_states (
              state TEXT PRIMARY KEY,
              created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS trips (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              title TEXT,
              data TEXT,
              created_at INTEGER NOT NULL
            );
            """
        )
        conn.commit()
    finally:
        conn.close()


_init()


def _row_to_user(row: sqlite3.Row | None) -> dict | None:
    if row is None:
        return None
    return {
        "id": row["id"],
        "email": row["email"],
        "name": row["name"],
        "avatar_url": row["avatar_url"],
        "google_id": row["google_id"],
        "email_verified": bool(row["email_verified"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _find_user_by_email(email: str) -> dict | None:
    conn = _connect()
    try:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower(),)).fetchone()
        return _row_to_user(row)
    finally:
        conn.close()


def _find_user_by_id(uid: str) -> dict | None:
    conn = _connect()
    try:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
        return _row_to_user(row)
    finally:
        conn.close()


def _find_user_password_hash(email: str) -> str | None:
    conn = _connect()
    try:
        row = conn.execute("SELECT password_hash FROM users WHERE email = ?", (email.lower(),)).fetchone()
        return row["password_hash"] if row else None
    finally:
        conn.close()


def _create_user(*, email: str, password_hash: str | None, name: str | None,
                 google_id: str | None = None, avatar_url: str | None = None,
                 email_verified: bool = False) -> dict:
    uid = uuid.uuid4().hex
    now = int(time.time())
    conn = _connect()
    try:
        conn.execute(
            "INSERT INTO users (id, email, name, avatar_url, password_hash, google_id, email_verified, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (uid, email.lower(), name, avatar_url, password_hash, google_id, 1 if email_verified else 0, now, now),
        )
        conn.commit()
    finally:
        conn.close()
    return _find_user_by_id(uid)  # type: ignore[return-value]


def _update_user(uid: str, fields: dict) -> dict | None:
    if not fields:
        return _find_user_by_id(uid)
    fields = dict(fields)
    fields["updated_at"] = int(time.time())
    cols = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [uid]
    conn = _connect()
    try:
        conn.execute(f"UPDATE users SET {cols} WHERE id = ?", values)
        conn.commit()
    finally:
        conn.close()
    return _find_user_by_id(uid)


# ---------- Email verification ----------

def _store_code(email: str, code: str, ttl: int = 15 * 60):
    conn = _connect()
    try:
        conn.execute(
            "INSERT OR REPLACE INTO email_codes (email, code, expires_at) VALUES (?, ?, ?)",
            (email.lower(), code, int(time.time()) + ttl),
        )
        conn.commit()
    finally:
        conn.close()


def _consume_code(email: str, code: str) -> bool:
    conn = _connect()
    try:
        row = conn.execute("SELECT code, expires_at FROM email_codes WHERE email = ?", (email.lower(),)).fetchone()
        if not row or row["expires_at"] < int(time.time()) or row["code"] != code.strip():
            return False
        conn.execute("DELETE FROM email_codes WHERE email = ?", (email.lower(),))
        conn.commit()
        return True
    finally:
        conn.close()


def _send_verification_email(email: str, code: str) -> bool:
    if not has_resend():
        return False
    code_status, body, _ = http_request(
        "https://api.resend.com/emails",
        method="POST",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
        data={
            "from": EMAIL_FROM,
            "to": [email],
            "subject": "Your VisePanda verification code",
            "html": f"<p>Welcome to VisePanda. Your code is <b>{code}</b>. It expires in 15 minutes.</p>",
        },
        timeout=10,
    )
    return 200 <= code_status < 300


# ---------- Public payload ----------

def _public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "avatar_url": user["avatar_url"],
        "email_verified": user["email_verified"],
        "google_linked": bool(user.get("google_id")),
    }


def current_user(environ) -> dict | None:
    token = bearer_token(environ)
    if not token:
        return None
    payload = jwt_verify(token)
    if not payload:
        return None
    return _find_user_by_id(payload.get("sub", ""))


# ---------- HTTP handlers ----------

def _register(environ, start_response):
    body = parse_json_body(environ)
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    name = (body.get("name") or "").strip() or None
    if not EMAIL_RE.match(email):
        return error_response(start_response, "Invalid email", code="invalid_email")
    if len(password) < 8:
        return error_response(start_response, "Password must be at least 8 characters", code="weak_password")
    if _find_user_by_email(email):
        return error_response(start_response, "An account already exists for that email", "409 Conflict", code="exists")
    user = _create_user(email=email, password_hash=hash_password(password), name=name)
    code = f"{secrets.randbelow(900000) + 100000}"
    _store_code(email, code)
    sent = _send_verification_email(email, code)
    payload = {"user": _public_user(user), "verification_sent": sent}
    if AUTH_EXPOSE_EMAIL_CODE or not has_resend():
        payload["dev_code"] = code
    return ok_response(start_response, payload)


def _login(environ, start_response):
    body = parse_json_body(environ)
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    user = _find_user_by_email(email)
    stored_hash = _find_user_password_hash(email) if user else None
    if not user or not stored_hash or not verify_password(password, stored_hash):
        return error_response(start_response, "Invalid credentials", "401 Unauthorized", code="invalid_credentials")
    token = jwt_sign({"sub": user["id"], "email": user["email"]})
    return ok_response(start_response, {"token": token, "user": _public_user(user)})


def _verify_email(environ, start_response):
    body = parse_json_body(environ)
    email = (body.get("email") or "").strip().lower()
    code = (body.get("code") or "").strip()
    if not email or not code:
        return error_response(start_response, "Email and code required")
    if not _consume_code(email, code):
        return error_response(start_response, "Invalid or expired code", code="invalid_code")
    user = _find_user_by_email(email)
    if not user:
        return error_response(start_response, "User not found", "404 Not Found")
    user = _update_user(user["id"], {"email_verified": 1})
    return ok_response(start_response, {"user": _public_user(user)})


def _resend_verification(environ, start_response):
    body = parse_json_body(environ)
    email = (body.get("email") or "").strip().lower()
    if not _find_user_by_email(email):
        return error_response(start_response, "User not found", "404 Not Found")
    code = f"{secrets.randbelow(900000) + 100000}"
    _store_code(email, code)
    sent = _send_verification_email(email, code)
    payload = {"sent": sent}
    if AUTH_EXPOSE_EMAIL_CODE or not has_resend():
        payload["dev_code"] = code
    return ok_response(start_response, payload)


def _profile(environ, start_response):
    user = current_user(environ)
    if not user:
        return error_response(start_response, "Not authenticated", "401 Unauthorized")
    return ok_response(start_response, {"user": _public_user(user)})


def _update_profile(environ, start_response):
    user = current_user(environ)
    if not user:
        return error_response(start_response, "Not authenticated", "401 Unauthorized")
    body = parse_json_body(environ)
    updates = {}
    if "name" in body:
        updates["name"] = (body.get("name") or "").strip() or None
    if "avatar_url" in body:
        updates["avatar_url"] = (body.get("avatar_url") or "").strip() or None
    user = _update_user(user["id"], updates)
    return ok_response(start_response, {"user": _public_user(user)})


def _logout(environ, start_response):
    # Stateless JWT — client just discards the token.
    return ok_response(start_response)


# ---------- Google OAuth ----------

def _google_start(environ, start_response):
    if not has_google_oauth():
        return error_response(start_response, "Google OAuth not configured", "503 Service Unavailable")
    state = secrets.token_urlsafe(24)
    conn = _connect()
    try:
        conn.execute("INSERT OR REPLACE INTO oauth_states (state, created_at) VALUES (?, ?)", (state, int(time.time())))
        conn.commit()
    finally:
        conn.close()
    qs = urllib.parse.urlencode({
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    })
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{qs}"
    accept = get_header(environ, "Accept")
    if "application/json" in accept:
        return ok_response(start_response, {"url": url})
    start_response("302 Found", [("Location", url)])
    return [b""]


def _google_callback(environ, start_response):
    if not has_google_oauth():
        return error_response(start_response, "Google OAuth not configured", "503 Service Unavailable")
    params = parse_query(environ)
    code = params.get("code", "")
    state = params.get("state", "")
    if not code or not state:
        return error_response(start_response, "Missing code/state")
    conn = _connect()
    try:
        row = conn.execute("SELECT created_at FROM oauth_states WHERE state = ?", (state,)).fetchone()
        if not row:
            return error_response(start_response, "Invalid state", "400 Bad Request")
        conn.execute("DELETE FROM oauth_states WHERE state = ?", (state,))
        conn.commit()
    finally:
        conn.close()
    token_code, token_body, _ = http_request(
        "https://oauth2.googleapis.com/token",
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data=urllib.parse.urlencode({
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }).encode(),
    )
    if token_code != 200:
        return error_response(start_response, "Google token exchange failed", "502 Bad Gateway")
    try:
        token_data = json.loads(token_body.decode("utf-8"))
    except ValueError:
        return error_response(start_response, "Bad token response", "502 Bad Gateway")
    access_token = token_data.get("access_token")
    if not access_token:
        return error_response(start_response, "Missing access_token", "502 Bad Gateway")
    info_code, info_body, _ = http_request(
        "https://openidconnect.googleapis.com/v1/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    if info_code != 200:
        return error_response(start_response, "Google userinfo failed", "502 Bad Gateway")
    try:
        info = json.loads(info_body.decode("utf-8"))
    except ValueError:
        return error_response(start_response, "Bad userinfo response", "502 Bad Gateway")
    email = (info.get("email") or "").lower()
    google_id = info.get("sub") or ""
    name = info.get("name")
    avatar_url = info.get("picture")
    if not email or not google_id:
        return error_response(start_response, "Google account missing email or id")
    user = _find_user_by_email(email)
    if user:
        if not user.get("google_id"):
            user = _update_user(user["id"], {
                "google_id": google_id,
                "email_verified": 1,
                "avatar_url": user.get("avatar_url") or avatar_url,
            })
    else:
        user = _create_user(email=email, password_hash=None, name=name, google_id=google_id,
                            avatar_url=avatar_url, email_verified=True)
    jwt = jwt_sign({"sub": user["id"], "email": user["email"]})
    # Redirect back to the app with token in fragment so it stays client-side.
    redirect = f"{APP_BASE_URL}/#token={urllib.parse.quote(jwt)}"
    start_response("302 Found", [("Location", redirect)])
    return [b""]


# ---------- Trips (per-user) ----------

def _trips_list(environ, start_response):
    user = current_user(environ)
    if not user:
        return error_response(start_response, "Not authenticated", "401 Unauthorized")
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT id, title, data, created_at FROM trips WHERE user_id = ? ORDER BY created_at DESC",
            (user["id"],),
        ).fetchall()
    finally:
        conn.close()
    trips = [{
        "id": r["id"],
        "title": r["title"],
        "created_at": r["created_at"],
        "data": json.loads(r["data"]) if r["data"] else {},
    } for r in rows]
    return ok_response(start_response, {"trips": trips})


def _trips_create(environ, start_response):
    user = current_user(environ)
    if not user:
        return error_response(start_response, "Not authenticated", "401 Unauthorized")
    body = parse_json_body(environ)
    title = (body.get("title") or "Untitled trip").strip()
    data = body.get("data") or {}
    tid = uuid.uuid4().hex
    conn = _connect()
    try:
        conn.execute(
            "INSERT INTO trips (id, user_id, title, data, created_at) VALUES (?, ?, ?, ?, ?)",
            (tid, user["id"], title, json.dumps(data), int(time.time())),
        )
        conn.commit()
    finally:
        conn.close()
    return ok_response(start_response, {"id": tid, "title": title})


def _trips_delete(environ, start_response, trip_id: str):
    user = current_user(environ)
    if not user:
        return error_response(start_response, "Not authenticated", "401 Unauthorized")
    conn = _connect()
    try:
        conn.execute("DELETE FROM trips WHERE id = ? AND user_id = ?", (trip_id, user["id"]))
        conn.commit()
    finally:
        conn.close()
    return ok_response(start_response)


# ---------- Router entry ----------

def handle(environ, start_response, path: str):
    method = environ.get("REQUEST_METHOD", "GET").upper()
    if path == "/api/auth/register" and method == "POST":
        return _register(environ, start_response)
    if path == "/api/auth/login" and method == "POST":
        return _login(environ, start_response)
    if path == "/api/auth/verify-email" and method == "POST":
        return _verify_email(environ, start_response)
    if path == "/api/auth/resend-verification" and method == "POST":
        return _resend_verification(environ, start_response)
    if path == "/api/auth/profile" and method == "GET":
        return _profile(environ, start_response)
    if path == "/api/auth/profile" and method == "POST":
        return _update_profile(environ, start_response)
    if path == "/api/auth/logout" and method == "POST":
        return _logout(environ, start_response)
    if path == "/api/auth/google/start":
        return _google_start(environ, start_response)
    if path == "/api/auth/google/callback":
        return _google_callback(environ, start_response)
    if path == "/api/auth/me" and method == "GET":
        return _profile(environ, start_response)
    if path == "/api/trips" and method == "GET":
        return _trips_list(environ, start_response)
    if path == "/api/trips" and method == "POST":
        return _trips_create(environ, start_response)
    if path.startswith("/api/trips/") and method == "DELETE":
        return _trips_delete(environ, start_response, path.rsplit("/", 1)[-1])
    return error_response(start_response, "Auth route not found", "404 Not Found")

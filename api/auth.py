import hashlib
import hmac
import os
import secrets
import sqlite3
import time
from datetime import datetime, timezone
from http import HTTPStatus

from api.common import (
    bearer_token,
    client_ip,
    error_response,
    json_response,
    read_json,
    runtime_database_path,
)


MIN_PASSWORD_LENGTH = 8
_ATTEMPTS = {}


class ClosingConnection(sqlite3.Connection):
    def __exit__(self, exc_type, exc_value, traceback):
        try:
            if exc_type is None:
                self.commit()
            else:
                self.rollback()
        finally:
            self.close()
        return False


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def db():
    path = runtime_database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, factory=ClosingConnection)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    init_db(conn)
    return conn


def init_db(conn):
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL DEFAULT '',
            role TEXT NOT NULL DEFAULT 'user',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TEXT NOT NULL,
            expires_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS reset_tokens (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            used_at TEXT
        );
        CREATE TABLE IF NOT EXISTS trips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            destination TEXT NOT NULL DEFAULT '',
            start_date TEXT NOT NULL DEFAULT '',
            end_date TEXT NOT NULL DEFAULT '',
            notes TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """
    )
    seed_admin(conn)


def seed_admin(conn):
    email = (os.environ.get("ADMIN_EMAIL") or "").strip().lower()
    password = os.environ.get("ADMIN_PASSWORD") or ""
    if not email or not password:
        return
    if password in {"admin", "admin123", "password", "changeme"} or len(password) < 12:
        return
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        conn.execute("UPDATE users SET role = 'admin', updated_at = ? WHERE id = ?", (now_iso(), existing["id"]))
        conn.commit()
        return
    timestamp = now_iso()
    conn.execute(
        "INSERT INTO users (email, password_hash, name, role, created_at, updated_at) VALUES (?, ?, ?, 'admin', ?, ?)",
        (email, hash_password(password), "Admin", timestamp, timestamp),
    )
    conn.commit()


def hash_password(password):
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
    return f"pbkdf2_sha256$200000${salt.hex()}${digest.hex()}"


def verify_password(password, stored):
    try:
        algorithm, rounds, salt_hex, digest_hex = stored.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(rounds))
        return hmac.compare_digest(digest.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


def public_user(row):
    return {
        "id": row["id"],
        "email": row["email"],
        "name": row["name"],
        "role": row["role"],
        "createdAt": row["created_at"],
    }


def check_rate(key, limit=6, window=300):
    now = time.time()
    attempts = [item for item in _ATTEMPTS.get(key, []) if now - item < window]
    if len(attempts) >= limit:
        _ATTEMPTS[key] = attempts
        return False
    attempts.append(now)
    _ATTEMPTS[key] = attempts
    return True


def current_user(environ):
    token = bearer_token(environ)
    if not token:
        return None
    with db() as conn:
        row = conn.execute(
            """
            SELECT users.* FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token = ? AND sessions.expires_at > ?
            """,
            (token, int(time.time())),
        ).fetchone()
    return row


def require_user(environ, start_response):
    user = current_user(environ)
    if not user:
        return None, error_response(start_response, HTTPStatus.UNAUTHORIZED, "unauthorized", "Sign in required.", environ)
    return user, None


def require_admin(environ, start_response):
    user, failure = require_user(environ, start_response)
    if failure:
        return None, failure
    if user["role"] != "admin":
        return None, error_response(start_response, HTTPStatus.FORBIDDEN, "forbidden", "Admin access required.", environ)
    return user, None


def register(environ, start_response):
    body = read_json(environ)
    email = str(body.get("email") or "").strip().lower()
    password = str(body.get("password") or "")
    name = str(body.get("name") or "").strip()[:80]
    if "@" not in email or "." not in email:
        return error_response(start_response, HTTPStatus.BAD_REQUEST, "invalid_email", "Enter a valid email address.", environ)
    if len(password) < MIN_PASSWORD_LENGTH:
        return error_response(start_response, HTTPStatus.BAD_REQUEST, "weak_password", "Password must be at least 8 characters.", environ)
    timestamp = now_iso()
    try:
        with db() as conn:
            conn.execute(
                "INSERT INTO users (email, password_hash, name, role, created_at, updated_at) VALUES (?, ?, ?, 'user', ?, ?)",
                (email, hash_password(password), name, timestamp, timestamp),
            )
            row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    except sqlite3.IntegrityError:
        return error_response(start_response, HTTPStatus.CONFLICT, "email_exists", "Email is already registered.", environ)
    return json_response(start_response, {"user": public_user(row)}, HTTPStatus.CREATED, environ)


def login(environ, start_response):
    body = read_json(environ)
    email = str(body.get("email") or "").strip().lower()
    password = str(body.get("password") or "")
    key = f"login:{client_ip(environ)}:{email}"
    if not check_rate(key):
        return error_response(start_response, HTTPStatus.TOO_MANY_REQUESTS, "rate_limited", "Too many attempts. Try again later.", environ)
    with db() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if not row or not verify_password(password, row["password_hash"]):
            return error_response(start_response, HTTPStatus.UNAUTHORIZED, "invalid_credentials", "Invalid email or password.", environ)
        token = secrets.token_urlsafe(32)
        conn.execute(
            "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, row["id"], now_iso(), int(time.time()) + 60 * 60 * 24 * 14),
        )
    return json_response(start_response, {"token": token, "user": public_user(row)}, environ=environ)


def logout(environ, start_response):
    token = bearer_token(environ)
    if token:
        with db() as conn:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
    return json_response(start_response, {"ok": True}, environ=environ)


def me(environ, start_response):
    user, failure = require_user(environ, start_response)
    if failure:
        return failure
    return json_response(start_response, {"user": public_user(user)}, environ=environ)


def update_profile(environ, start_response):
    user, failure = require_user(environ, start_response)
    if failure:
        return failure
    body = read_json(environ)
    name = str(body.get("name") or user["name"]).strip()[:80]
    current_password = str(body.get("currentPassword") or "")
    new_password = str(body.get("newPassword") or "")
    with db() as conn:
        if new_password:
            fresh = conn.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
            if not verify_password(current_password, fresh["password_hash"]):
                return error_response(start_response, HTTPStatus.BAD_REQUEST, "current_password_required", "Current password is required.", environ)
            if len(new_password) < MIN_PASSWORD_LENGTH:
                return error_response(start_response, HTTPStatus.BAD_REQUEST, "weak_password", "Password must be at least 8 characters.", environ)
            conn.execute("UPDATE users SET name = ?, password_hash = ?, updated_at = ? WHERE id = ?", (name, hash_password(new_password), now_iso(), user["id"]))
        else:
            conn.execute("UPDATE users SET name = ?, updated_at = ? WHERE id = ?", (name, now_iso(), user["id"]))
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    return json_response(start_response, {"user": public_user(row)}, environ=environ)


def forgot_password(environ, start_response):
    body = read_json(environ)
    email = str(body.get("email") or "").strip().lower()
    key = f"forgot:{client_ip(environ)}:{email}"
    if not check_rate(key, limit=3):
        return error_response(start_response, HTTPStatus.TOO_MANY_REQUESTS, "rate_limited", "Too many attempts. Try again later.", environ)
    exposed = {}
    with db() as conn:
        row = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if row:
            token = secrets.token_urlsafe(32)
            conn.execute(
                "INSERT INTO reset_tokens (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
                (token, row["id"], now_iso(), int(time.time()) + 3600),
            )
            if os.environ.get("AUTH_EXPOSE_RESET_TOKEN") == "1":
                exposed = {"resetToken": token}
    return json_response(start_response, {"ok": True, **exposed}, environ=environ)


def reset_password(environ, start_response):
    body = read_json(environ)
    token = str(body.get("token") or "")
    password = str(body.get("password") or "")
    if len(password) < MIN_PASSWORD_LENGTH:
        return error_response(start_response, HTTPStatus.BAD_REQUEST, "weak_password", "Password must be at least 8 characters.", environ)
    with db() as conn:
        row = conn.execute(
            "SELECT * FROM reset_tokens WHERE token = ? AND used_at IS NULL AND expires_at > ?",
            (token, int(time.time())),
        ).fetchone()
        if not row:
            return error_response(start_response, HTTPStatus.BAD_REQUEST, "invalid_token", "Reset token is invalid or expired.", environ)
        conn.execute("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", (hash_password(password), now_iso(), row["user_id"]))
        conn.execute("UPDATE reset_tokens SET used_at = ? WHERE token = ?", (now_iso(), token))
        conn.execute("DELETE FROM sessions WHERE user_id = ?", (row["user_id"],))
    return json_response(start_response, {"ok": True}, environ=environ)


def list_trips(environ, start_response):
    user, failure = require_user(environ, start_response)
    if failure:
        return failure
    with db() as conn:
        rows = conn.execute("SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC", (user["id"],)).fetchall()
    trips = [trip_payload(row) for row in rows]
    return json_response(start_response, {"trips": trips}, environ=environ)


def trip_payload(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "destination": row["destination"],
        "startDate": row["start_date"],
        "endDate": row["end_date"],
        "notes": row["notes"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def create_trip(environ, start_response):
    user, failure = require_user(environ, start_response)
    if failure:
        return failure
    body = read_json(environ)
    title = str(body.get("title") or "China trip").strip()[:120]
    destination = str(body.get("destination") or "").strip()[:120]
    timestamp = now_iso()
    with db() as conn:
        cur = conn.execute(
            """
            INSERT INTO trips (user_id, title, destination, start_date, end_date, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user["id"],
                title,
                destination,
                str(body.get("startDate") or "")[:20],
                str(body.get("endDate") or "")[:20],
                str(body.get("notes") or "")[:2000],
                timestamp,
                timestamp,
            ),
        )
        row = conn.execute("SELECT * FROM trips WHERE id = ?", (cur.lastrowid,)).fetchone()
    return json_response(start_response, {"trip": trip_payload(row)}, HTTPStatus.CREATED, environ)


def delete_trip(path_parts, environ, start_response):
    user, failure = require_user(environ, start_response)
    if failure:
        return failure
    if len(path_parts) != 3:
        return error_response(start_response, HTTPStatus.NOT_FOUND, "not_found", "Trip not found.", environ)
    with db() as conn:
        cur = conn.execute("DELETE FROM trips WHERE id = ? AND user_id = ?", (path_parts[2], user["id"]))
    if cur.rowcount == 0:
        return error_response(start_response, HTTPStatus.NOT_FOUND, "trip_not_found", "Trip not found.", environ)
    return json_response(start_response, {"ok": True}, environ=environ)


def admin_users(environ, start_response):
    _, failure = require_admin(environ, start_response)
    if failure:
        return failure
    with db() as conn:
        rows = conn.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall()
    return json_response(start_response, {"users": [public_user(row) for row in rows]}, environ=environ)


def admin_delete_user(path_parts, environ, start_response):
    admin, failure = require_admin(environ, start_response)
    if failure:
        return failure
    if len(path_parts) != 4:
        return error_response(start_response, HTTPStatus.NOT_FOUND, "not_found", "User not found.", environ)
    user_id = int(path_parts[3])
    if user_id == admin["id"]:
        return error_response(start_response, HTTPStatus.BAD_REQUEST, "cannot_delete_self", "Admins cannot delete themselves.", environ)
    with db() as conn:
        cur = conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    if cur.rowcount == 0:
        return error_response(start_response, HTTPStatus.NOT_FOUND, "user_not_found", "User not found.", environ)
    return json_response(start_response, {"ok": True}, environ=environ)


def dispatch(method, path_parts, environ, start_response):
    try:
        if path_parts[:2] == ["api", "auth"]:
            action = path_parts[2] if len(path_parts) > 2 else ""
            if method == "POST" and action == "register":
                return register(environ, start_response)
            if method == "POST" and action == "login":
                return login(environ, start_response)
            if method == "POST" and action == "logout":
                return logout(environ, start_response)
            if method == "GET" and action == "me":
                return me(environ, start_response)
            if method in {"PUT", "PATCH", "POST"} and action == "update-profile":
                return update_profile(environ, start_response)
            if method == "POST" and action == "forgot-password":
                return forgot_password(environ, start_response)
            if method == "POST" and action == "reset-password":
                return reset_password(environ, start_response)
        if path_parts[:2] == ["api", "trips"]:
            if method == "GET" and len(path_parts) == 2:
                return list_trips(environ, start_response)
            if method == "POST" and len(path_parts) == 2:
                return create_trip(environ, start_response)
            if method == "DELETE":
                return delete_trip(path_parts, environ, start_response)
        if path_parts[:3] == ["api", "admin", "users"]:
            if method == "GET" and len(path_parts) == 3:
                return admin_users(environ, start_response)
            if method == "DELETE":
                return admin_delete_user(path_parts, environ, start_response)
    except ValueError as exc:
        return error_response(start_response, HTTPStatus.BAD_REQUEST, "bad_request", str(exc), environ)
    return error_response(start_response, HTTPStatus.NOT_FOUND, "not_found", "Endpoint not found.", environ)

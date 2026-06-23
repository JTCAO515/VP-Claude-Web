"""Shared HTTP / WSGI / crypto / IO helpers — Python stdlib only."""
from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import io
import json
import mimetypes
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
from email.parser import BytesParser
from email.policy import default as email_default_policy
from pathlib import Path
from typing import Any, Iterable

from .config import (
    JWT_SECRET,
    JWT_TTL_DAYS,
    ROOT_DIR,
    SESSION_COOKIE,
    is_production,
)


# ---------- WSGI response helpers ----------

JSON_HEADERS: list[tuple[str, str]] = [
    ("Content-Type", "application/json; charset=utf-8"),
    ("Cache-Control", "no-store"),
]


def json_response(start_response, payload: Any, status: str = "200 OK",
                  extra_headers: Iterable[tuple] | None = None):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = list(JSON_HEADERS) + [("Content-Length", str(len(body)))]
    if extra_headers:
        headers.extend(extra_headers)
    start_response(status, headers)
    return [body]


def ok_response(start_response, data: dict | None = None,
                extra_headers: Iterable[tuple] | None = None):
    payload = {"ok": True}
    if data:
        payload.update(data)
    return json_response(start_response, payload, extra_headers=extra_headers)


def error_response(start_response, message: str, status: str = "400 Bad Request",
                   code: str | None = None):
    return json_response(start_response, {"ok": False, "error": message, "code": code},
                         status=status)


def no_content(start_response, extra_headers: Iterable[tuple] | None = None):
    headers = [("Content-Length", "0")] + list(extra_headers or [])
    start_response("204 No Content", headers)
    return [b""]


def redirect(start_response, location: str, extra_headers: Iterable[tuple] | None = None):
    headers = [("Location", location), ("Content-Length", "0")] + list(extra_headers or [])
    start_response("302 Found", headers)
    return [b""]


def binary_response(start_response, body: bytes, content_type: str,
                    status: str = "200 OK", extra_headers: Iterable[tuple] | None = None):
    headers = [
        ("Content-Type", content_type),
        ("Content-Length", str(len(body))),
        ("Cache-Control", "no-store"),
    ]
    if extra_headers:
        headers.extend(extra_headers)
    start_response(status, headers)
    return [body]


# ---------- Request parsing ----------

def read_body(environ, max_bytes: int = 25 * 1024 * 1024) -> bytes:
    try:
        length = int(environ.get("CONTENT_LENGTH") or 0)
    except (TypeError, ValueError):
        length = 0
    if length <= 0:
        return b""
    length = min(length, max_bytes)
    return environ["wsgi.input"].read(length)


def parse_json_body(environ) -> dict:
    raw = read_body(environ)
    if not raw:
        return {}
    try:
        data = json.loads(raw.decode("utf-8"))
        return data if isinstance(data, dict) else {}
    except (ValueError, UnicodeDecodeError):
        return {}


def parse_query(environ) -> dict:
    qs = environ.get("QUERY_STRING", "")
    return {k: v[0] if v else "" for k, v in
            urllib.parse.parse_qs(qs, keep_blank_values=True).items()}


def get_header(environ, name: str) -> str:
    key = "HTTP_" + name.upper().replace("-", "_")
    return environ.get(key, "")


def parse_cookies(environ) -> dict:
    raw = environ.get("HTTP_COOKIE", "") or ""
    out: dict[str, str] = {}
    for part in raw.split(";"):
        part = part.strip()
        if not part or "=" not in part:
            continue
        k, v = part.split("=", 1)
        out[k.strip()] = urllib.parse.unquote(v.strip())
    return out


def parse_multipart(environ) -> dict[str, dict]:
    """Tiny multipart/form-data parser using stdlib email module.
    Returns { field_name: { 'filename': str|None, 'content_type': str, 'data': bytes } }.
    """
    ctype = environ.get("CONTENT_TYPE", "")
    if "multipart/form-data" not in ctype:
        return {}
    raw = read_body(environ)
    if not raw:
        return {}
    # Build a header + body for the email parser.
    pseudo = f"Content-Type: {ctype}\r\n\r\n".encode() + raw
    msg = BytesParser(policy=email_default_policy).parsebytes(pseudo)
    fields: dict[str, dict] = {}
    if not msg.is_multipart():
        return fields
    for part in msg.iter_parts():
        cd = part.get("Content-Disposition", "")
        if not cd:
            continue
        # Parse: form-data; name="field"; filename="f.webm"
        params = {}
        for token in cd.split(";"):
            token = token.strip()
            if "=" in token:
                k, v = token.split("=", 1)
                params[k.strip().lower()] = v.strip().strip('"')
        name = params.get("name")
        if not name:
            continue
        fields[name] = {
            "filename": params.get("filename"),
            "content_type": part.get_content_type(),
            "data": part.get_payload(decode=True) or b"",
        }
    return fields


# ---------- Cookie writing ----------

def build_cookie(name: str, value: str, *, max_age: int = 7 * 86400,
                 path: str = "/", http_only: bool = True,
                 same_site: str = "Lax") -> str:
    parts = [f"{name}={urllib.parse.quote(value)}", f"Max-Age={max_age}", f"Path={path}"]
    if http_only:
        parts.append("HttpOnly")
    if is_production():
        parts.append("Secure")
    parts.append(f"SameSite={same_site}")
    return "; ".join(parts)


def clear_cookie(name: str, path: str = "/") -> str:
    return f"{name}=; Max-Age=0; Path={path}; HttpOnly; SameSite=Lax"


# ---------- Static file serving ----------

EXTRA_MIME = {
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".svg": "image/svg+xml",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json",
    ".woff2": "font/woff2",
}


def serve_file(start_response, path: Path, cache: str = "public, max-age=300"):
    if not path.exists() or not path.is_file():
        start_response("404 Not Found", [("Content-Type", "text/plain")])
        return [b"not found"]
    mime = (EXTRA_MIME.get(path.suffix.lower())
            or mimetypes.guess_type(str(path))[0]
            or "application/octet-stream")
    body = path.read_bytes()
    headers = [
        ("Content-Type", mime),
        ("Content-Length", str(len(body))),
        ("Cache-Control", cache),
    ]
    start_response("200 OK", headers)
    return [body]


def safe_join(root: Path, *parts: str) -> Path | None:
    candidate = (root.joinpath(*parts)).resolve()
    try:
        candidate.relative_to(root.resolve())
    except ValueError:
        return None
    return candidate


# ---------- JWT (HS256) ----------

def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(text: str) -> bytes:
    pad = "=" * (-len(text) % 4)
    return base64.urlsafe_b64decode(text + pad)


def jwt_sign(payload: dict, ttl_seconds: int | None = None) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    body = dict(payload)
    now = int(time.time())
    body.setdefault("iat", now)
    if ttl_seconds is None:
        ttl_seconds = JWT_TTL_DAYS * 24 * 3600
    body.setdefault("exp", now + ttl_seconds)
    h = _b64url(json.dumps(header, separators=(",", ":")).encode())
    p = _b64url(json.dumps(body, separators=(",", ":"), ensure_ascii=False).encode())
    signing_input = f"{h}.{p}".encode()
    sig = hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
    return f"{h}.{p}.{_b64url(sig)}"


def jwt_verify(token: str) -> dict | None:
    try:
        h, p, s = token.split(".")
    except ValueError:
        return None
    signing_input = f"{h}.{p}".encode()
    expected = _b64url(hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest())
    if not hmac.compare_digest(expected, s):
        return None
    try:
        payload = json.loads(_b64url_decode(p).decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return None
    if payload.get("exp", 0) < int(time.time()):
        return None
    return payload


def session_token(environ) -> str | None:
    cookies = parse_cookies(environ)
    tok = cookies.get(SESSION_COOKIE)
    if tok:
        return tok
    auth = get_header(environ, "Authorization")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip() or None
    return None


# ---------- Password hashing (PBKDF2-SHA256) ----------

def hash_password(password: str, *, salt: bytes | None = None,
                  iterations: int = 240_000) -> str:
    salt = salt or secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return (f"pbkdf2_sha256${iterations}$"
            f"{base64.b64encode(salt).decode()}$"
            f"{base64.b64encode(derived).decode()}")


def verify_password(password: str, stored: str) -> bool:
    if not stored:
        return False
    try:
        algo, iter_s, salt_b64, hash_b64 = stored.split("$")
    except ValueError:
        return False
    if algo != "pbkdf2_sha256":
        return False
    try:
        iterations = int(iter_s)
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(hash_b64)
    except (ValueError, binascii.Error):
        return False
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return hmac.compare_digest(derived, expected)


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def random_id() -> str:
    return secrets.token_hex(16)


def random_code(digits: int = 6) -> str:
    return "".join(secrets.choice("0123456789") for _ in range(digits))


# ---------- HTTP fetch (no third-party deps) ----------

def http_request(url: str, *, method: str = "GET", headers: dict | None = None,
                 data: bytes | dict | None = None,
                 timeout: float = 15.0) -> tuple[int, bytes, dict]:
    hdrs = {"User-Agent": "VisePanda/7.0"}
    if headers:
        hdrs.update(headers)
    body = None
    if isinstance(data, dict):
        body = json.dumps(data).encode("utf-8")
        hdrs.setdefault("Content-Type", "application/json")
    elif isinstance(data, bytes):
        body = data
    req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read(), dict(resp.headers)
    except urllib.error.HTTPError as e:
        try:
            payload = e.read()
        except Exception:  # noqa: BLE001
            payload = b""
        return e.code, payload, dict(e.headers or {})
    except urllib.error.URLError as e:
        return 0, f"{e.reason}".encode(), {}
    except Exception as e:  # noqa: BLE001
        return 0, f"{e}".encode(), {}


# ---------- JSON file IO ----------

def load_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return default


def load_translation(name: str) -> Any:
    path = ROOT_DIR / "data" / "translations" / f"{name}.json"
    return load_json(path, default={"phrases": []})


def write_json_atomic(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    import os as _os
    _os.replace(tmp, path)


# Backwards-compat name used by some modules.
def bearer_token(environ) -> str | None:
    return session_token(environ)

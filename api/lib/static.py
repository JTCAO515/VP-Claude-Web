"""Static file serving for the WSGI app.

vercel.json sends every request through api/index.py, including the HTML
shell and assets, so the Python app is responsible for serving /web and
/static itself rather than relying on a separate static host.
"""
import mimetypes
import os

_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

_ALLOWED_PREFIXES = ("web/", "static/")
_ROOT_ALIASES = {
    "/": "web/index.html",
    "/manifest.json": "web/manifest.json",
    "/sw.js": "web/sw.js",
    "/favicon.ico": "static/icon.svg",
}


def resolve(path):
    """Map a request path to a safe absolute file path under the repo, or None."""
    target = _ROOT_ALIASES.get(path, path.lstrip("/"))
    if not target.startswith(_ALLOWED_PREFIXES):
        return None
    full = os.path.normpath(os.path.join(_ROOT, target))
    if not full.startswith(_ROOT) or not os.path.isfile(full):
        return None
    return full


def read(full_path):
    with open(full_path, "rb") as handle:
        return handle.read()


def content_type(full_path):
    guessed, _ = mimetypes.guess_type(full_path)
    return guessed or "application/octet-stream"

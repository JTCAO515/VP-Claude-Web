"""Minimal WSGI request/response/router primitives. No third-party deps."""
import json
import re
from urllib.parse import parse_qs


class Request:
    def __init__(self, environ):
        self.environ = environ
        self.method = environ.get("REQUEST_METHOD", "GET").upper()
        self.path = environ.get("PATH_INFO", "/")
        self.query = {k: v[0] for k, v in parse_qs(environ.get("QUERY_STRING", "")).items()}
        self.params = {}
        self._body = None

    @property
    def body(self):
        if self._body is None:
            try:
                length = int(self.environ.get("CONTENT_LENGTH") or 0)
            except ValueError:
                length = 0
            self._body = self.environ["wsgi.input"].read(length) if length else b""
        return self._body

    def json(self):
        if not self.body:
            return {}
        try:
            return json.loads(self.body.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return {}


class Response:
    def __init__(self, payload=None, status=200, headers=None, chunks=None, content_type="application/json"):
        self.status = status
        self.headers = headers or []
        self.chunks = chunks
        self.content_type = content_type
        self.payload = payload

    @classmethod
    def json(cls, payload, status=200):
        return cls(payload=payload, status=status)

    @classmethod
    def error(cls, message, status=400, code="bad_request"):
        return cls(payload={"error": {"code": code, "message": message}}, status=status)

    @classmethod
    def stream(cls, chunk_iter, content_type="text/event-stream"):
        return cls(chunks=chunk_iter, content_type=content_type)


_STATUS_TEXT = {
    200: "200 OK", 201: "201 Created", 204: "204 No Content",
    400: "400 Bad Request", 401: "401 Unauthorized", 403: "403 Forbidden",
    404: "404 Not Found", 405: "405 Method Not Allowed", 422: "422 Unprocessable Entity",
    500: "500 Internal Server Error", 503: "503 Service Unavailable",
}


class Router:
    def __init__(self):
        self._routes = []

    def add(self, method, pattern, handler):
        param_names = re.findall(r"<(\w+)>", pattern)
        regex = re.sub(r"<\w+>", r"([^/]+)", pattern)
        self._routes.append((method, re.compile(f"^{regex}$"), param_names, handler))

    def get(self, pattern):
        def deco(fn):
            self.add("GET", pattern, fn)
            return fn
        return deco

    def post(self, pattern):
        def deco(fn):
            self.add("POST", pattern, fn)
            return fn
        return deco

    def delete(self, pattern):
        def deco(fn):
            self.add("DELETE", pattern, fn)
            return fn
        return deco

    def match(self, method, path):
        path_methods = set()
        for route_method, regex, param_names, handler in self._routes:
            m = regex.match(path)
            if not m:
                continue
            path_methods.add(route_method)
            if route_method == method:
                return handler, dict(zip(param_names, m.groups()))
        if path_methods:
            return "method_not_allowed", None
        return None, None

    def dispatch(self, environ):
        request = Request(environ)
        handler, params = self.match(request.method, request.path)
        if handler is None:
            return Response.error("Not found", 404, "not_found")
        if handler == "method_not_allowed":
            return Response.error("Method not allowed", 405, "method_not_allowed")
        request.params = params or {}
        try:
            return handler(request)
        except Exception as exc:  # pragma: no cover - defensive guard for an unhandled route bug
            return Response.error(str(exc), 500, "internal_error")


CORS_HEADERS = [
    ("Access-Control-Allow-Origin", "*"),
    ("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS"),
    ("Access-Control-Allow-Headers", "Content-Type"),
]


def to_wsgi(response, start_response):
    headers = [("Content-Type", f"{response.content_type}; charset=utf-8")] + CORS_HEADERS + response.headers
    start_response(_STATUS_TEXT.get(response.status, f"{response.status} Error"), headers)
    if response.chunks is not None:
        return (chunk if isinstance(chunk, bytes) else chunk.encode("utf-8") for chunk in response.chunks)
    body = json.dumps(response.payload, ensure_ascii=False).encode("utf-8")
    return [body]

"""WSGI entry point. Vercel's @vercel/python builder serves this module's `app`."""
from .lib import static
from .lib.http import Router, to_wsgi
from .routes import register_all

router = Router()
register_all(router)


def _serve_static(environ, start_response, path):
    full_path = static.resolve(path)
    if full_path is None:
        return None
    start_response("200 OK", [("Content-Type", static.content_type(full_path))])
    return [static.read(full_path)]


def app(environ, start_response):
    if environ.get("REQUEST_METHOD") == "OPTIONS":
        start_response("204 No Content", [
            ("Access-Control-Allow-Origin", "*"),
            ("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS"),
            ("Access-Control-Allow-Headers", "Content-Type"),
        ])
        return [b""]

    path = environ.get("PATH_INFO", "/")
    if not path.startswith("/api/"):
        static_result = _serve_static(environ, start_response, path)
        if static_result is not None:
            return static_result
        start_response("404 Not Found", [("Content-Type", "text/plain; charset=utf-8")])
        return [b"Not found"]

    response = router.dispatch(environ)
    return to_wsgi(response, start_response)

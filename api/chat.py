import json
import os
import urllib.error
import urllib.request
from http import HTTPStatus

from api.cities import all_cities
from api.common import cors_headers, error_response, json_response, read_json


SYSTEM_BRIEF = (
    "You are VisePanda, an English-language China travel assistant. "
    "Give practical, safety-aware planning help for international visitors."
)


def _fallback_answer(message):
    text = (message or "").lower()
    cities = all_cities()
    matches = [city for city in cities if city["name"].lower() in text or city["id"] in text]
    if not matches:
        matches = cities[:4]
    city_line = ", ".join(city["name"] for city in matches[:4])
    highlight_line = "; ".join(f"{city['name']}: {', '.join(city['highlights'][:3])}" for city in matches[:3])
    return (
        f"For a China trip, I would anchor the plan around {city_line}. "
        f"Start with visa and payment readiness, then group cities by rail distance instead of trying to cover too much ground. "
        f"Useful highlights: {highlight_line}. "
        "Before departure, prepare passport copies, hotel confirmations, Alipay or WeChat Pay, offline maps, and a backup translation app."
    )


def _deepseek_answer(message):
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        return None
    payload = {
        "model": os.environ.get("DEEPSEEK_MODEL", "deepseek-chat"),
        "messages": [
            {"role": "system", "content": SYSTEM_BRIEF},
            {"role": "user", "content": message},
        ],
        "temperature": 0.4,
        "stream": False,
    }
    request = urllib.request.Request(
        "https://api.deepseek.com/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=18) as response:
            data = json.loads(response.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"]
    except (urllib.error.URLError, KeyError, IndexError, json.JSONDecodeError, TimeoutError):
        return None


def _sse(answer):
    chunks = []
    for word in answer.split(" "):
        chunks.append(f"data: {json.dumps({'token': word + ' '})}\n\n")
    chunks.append(f"data: {json.dumps({'done': True})}\n\n")
    return "".join(chunks)


def dispatch(method, environ, start_response):
    if method != "POST":
        return error_response(start_response, HTTPStatus.METHOD_NOT_ALLOWED, "method_not_allowed", "Method not allowed.", environ)
    try:
        body = read_json(environ)
    except ValueError as exc:
        return error_response(start_response, HTTPStatus.BAD_REQUEST, "bad_json", str(exc), environ)

    message = str(body.get("message") or body.get("prompt") or "").strip()
    if not message:
        return error_response(start_response, HTTPStatus.BAD_REQUEST, "message_required", "Message is required.", environ)
    if len(message) > 4000:
        return error_response(start_response, HTTPStatus.BAD_REQUEST, "message_too_long", "Message is too long.", environ)

    answer = _deepseek_answer(message) or _fallback_answer(message)
    headers = [
        ("Content-Type", "text/event-stream; charset=utf-8"),
        ("Cache-Control", "no-cache"),
        ("X-Accel-Buffering", "no"),
    ]
    headers.extend(cors_headers(environ))
    start_response("200 OK", headers)
    return [_sse(answer).encode("utf-8")]


def non_stream_preview(message):
    return {"answer": _fallback_answer(message)}

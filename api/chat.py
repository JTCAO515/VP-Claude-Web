"""Chatbot endpoint backed by DeepSeek with a local fallback."""
from __future__ import annotations

import json

from .common import error_response, http_request, json_response, parse_json_body
from .config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL, has_deepseek

SYSTEM_PROMPT = (
    "You are VisePanda, an English-native, mobile-friendly China travel butler for foreign visitors. "
    "Answer concisely (under 220 words). Be specific to China travel: visas, transport (12306, "
    "Didi, metro), foreigner-friendly hotels, dining, payments (Alipay TourCard, WeChat Pay), SIM/eSIM, "
    "VPN context, etiquette, and emergency help. Use short paragraphs and small bullet lists when useful. "
    "After your answer, on a new line, output exactly: FOLLOWUPS: q1 | q2 | q3 (three short follow-up "
    "questions a curious traveler would ask next)."
)


def _local_reply(message: str) -> dict:
    text = (
        "I'm running in local fallback mode (no DeepSeek key configured). "
        f"You asked: \"{message[:140]}\".\n\n"
        "Here are practical pointers:\n"
        "- Check your visa policy (10/15/30/240-day visa-free schemes by nationality).\n"
        "- Set up Alipay TourCard or WeChat Pay for QR payments before you fly.\n"
        "- Pre-book major high-speed rail seats on 12306 with passport info.\n"
        "- Use Translate tab for taxi, hotel and restaurant phrases.\n"
    )
    follow = [
        "Which Chinese cities should I visit for 10 days?",
        "How do I set up mobile payments as a foreigner?",
        "What hotels accept foreign passports easily?",
    ]
    return {"reply": text, "follow_ups": follow, "provider": "local"}


def _split_followups(text: str) -> tuple[str, list[str]]:
    parts = text.rsplit("FOLLOWUPS:", 1)
    if len(parts) != 2:
        return text.strip(), []
    body = parts[0].strip()
    raw = parts[1].strip()
    follow = [q.strip(" -•\t") for q in raw.split("|") if q.strip()]
    return body, follow[:3]


def _deepseek_reply(history: list[dict], message: str) -> dict:
    msgs = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in history[-12:]:
        role = h.get("role")
        content = (h.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            msgs.append({"role": role, "content": content})
    msgs.append({"role": "user", "content": message})
    code, body, _ = http_request(
        f"{DEEPSEEK_BASE_URL}/v1/chat/completions",
        method="POST",
        headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}"},
        data={
            "model": DEEPSEEK_MODEL,
            "messages": msgs,
            "temperature": 0.6,
            "max_tokens": 700,
            "stream": False,
        },
        timeout=45,
    )
    if code != 200:
        fallback = _local_reply(message)
        fallback["provider"] = "deepseek_unavailable"
        return fallback
    try:
        data = json.loads(body.decode("utf-8"))
        raw = data["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError):
        fallback = _local_reply(message)
        fallback["provider"] = "deepseek_bad_response"
        return fallback
    text, follow = _split_followups(raw)
    if not follow:
        follow = [
            "What about high-speed rail logistics?",
            "Which neighborhoods are foreigner-friendly?",
            "How do I handle dining as a vegetarian?",
        ]
    return {"reply": text, "follow_ups": follow, "provider": "deepseek"}


def handle(environ, start_response, path: str):
    method = environ.get("REQUEST_METHOD", "GET").upper()
    if method == "GET":
        return json_response(start_response, {
            "ok": True,
            "provider": "deepseek" if has_deepseek() else "local",
            "model": DEEPSEEK_MODEL if has_deepseek() else "fallback",
        })
    if method != "POST":
        return error_response(start_response, "Method not allowed", "405 Method Not Allowed")
    body = parse_json_body(environ)
    message = (body.get("message") or "").strip()
    if not message:
        return error_response(start_response, "message is required")
    history = body.get("history") or []
    if not isinstance(history, list):
        history = []
    reply = _deepseek_reply(history, message) if has_deepseek() else _local_reply(message)
    return json_response(start_response, {"ok": True, **reply})

"""Chat endpoint — DeepSeek V4 Flash with a local fallback.

Persists conversations to storage when the user is authed and provides a
session_id; otherwise stateless.
"""
from __future__ import annotations

import json

from . import config, storage
from .auth import require_session
from .common import error_response, http_request, json_response, parse_json_body

SYSTEM_PROMPT = (
    "You are VisePanda, an English-native, mobile-friendly China travel butler "
    "for foreign visitors. Answer concisely (under 220 words). Be specific to "
    "China travel: visas, transport (12306, Didi, metro), foreigner-friendly "
    "hotels, dining, payments (Alipay TourCard, WeChat Pay), SIM/eSIM, VPN "
    "context, etiquette, and emergency help. Use short paragraphs and small "
    "bullet lists when useful. After your answer, on a new line, output "
    "exactly: FOLLOWUPS: q1 | q2 | q3 (three short follow-up questions a "
    "curious traveler would ask next)."
)


def _local_reply(message: str) -> dict:
    text = (
        "I'm running in local fallback mode (no DeepSeek key configured). "
        f"You asked: \"{message[:140]}\".\n\n"
        "Here are practical pointers:\n"
        "- Check your visa policy (10/15/30/240-day visa-free schemes by nationality).\n"
        "- Set up Alipay TourCard or WeChat Pay for QR payments before you fly.\n"
        "- Pre-book major high-speed rail seats on 12306 with your passport.\n"
        "- Use the Translate tab for taxi, hotel, and restaurant phrases."
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
    msgs: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in history[-12:]:
        role = h.get("role")
        content = (h.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            msgs.append({"role": role, "content": content})
    msgs.append({"role": "user", "content": message})
    code, body, _ = http_request(
        f"{config.DEEPSEEK_BASE_URL}/v1/chat/completions",
        method="POST",
        headers={"Authorization": f"Bearer {config.DEEPSEEK_API_KEY}"},
        data={
            "model": config.DEEPSEEK_MODEL,
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
            "How should I plan dining as a vegetarian?",
        ]
    return {"reply": text, "follow_ups": follow, "provider": "deepseek"}


def handle(environ, start_response, path: str):
    method = environ.get("REQUEST_METHOD", "GET").upper()
    if method == "GET":
        return json_response(start_response, {
            "ok": True,
            "provider": "deepseek" if config.has_deepseek() else "local",
            "model": config.DEEPSEEK_MODEL if config.has_deepseek() else "fallback",
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
    session_id = (body.get("session_id") or "").strip() or None

    reply = (_deepseek_reply(history, message)
             if config.has_deepseek() else _local_reply(message))

    # Best-effort persistence when authed.
    user = require_session(environ)
    if user:
        try:
            if not session_id:
                # Title = first ~60 chars of the user message.
                title = message[:60]
                sess = storage.chat_sessions.create(user["id"], title=title)
                session_id = sess["id"] if sess else None
            if session_id:
                storage.chat_messages.append(session_id, "user", message)
                storage.chat_messages.append(session_id, "assistant", reply["reply"])
                storage.chat_sessions.touch(session_id)
        except Exception as e:  # noqa: BLE001
            print(f"[chat] persistence skipped: {e}")

    return json_response(start_response, {
        "ok": True,
        **reply,
        "session_id": session_id,
    })

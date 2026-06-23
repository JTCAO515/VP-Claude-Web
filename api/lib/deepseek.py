"""DeepSeek chat completions client with a deterministic local fallback.

Talks to DeepSeek's OpenAI-compatible endpoint over the standard library only.
When no API key is configured, or the network call fails, callers fall back
to `local_answer`, which is grounded in the curated /data knowledge base so
the assistant still gives a useful, specific answer offline.
"""
import json
import os
import re
import urllib.error
import urllib.request

from . import data

DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
DEFAULT_MODEL = "deepseek-chat"

SYSTEM_PROMPT = (
    "You are VisePanda, an English-native China travel butler for foreign visitors. "
    "Answer with practical, specific guidance: cities, costs in RMB, transport, food, "
    "visas, and etiquette. Keep answers concise, structured with short paragraphs or "
    "bullet points, and never invent prices or policies you are not given context for. "
    "When useful, end with one short follow-up question."
)


def is_configured():
    return bool(os.environ.get("DEEPSEEK_API_KEY"))


def _client_context():
    """Compact factual grounding pulled from the local knowledge base."""
    tips = data.tips()
    lines = [
        "Reference notes (use only if relevant, do not quote verbatim):",
        f"- Money: {tips.get('money', '')[:240]}",
        f"- Visa: {tips.get('visa', '')[:240]}",
        f"- Safety: {tips.get('safety', '')[:240]}",
    ]
    return "\n".join(lines)


def stream_chat(messages):
    """Yield text deltas from DeepSeek's streaming completion API."""
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    model = os.environ.get("DEEPSEEK_MODEL", DEFAULT_MODEL)
    payload = json.dumps({
        "model": model,
        "stream": True,
        "messages": [{"role": "system", "content": SYSTEM_PROMPT + "\n\n" + _client_context()}] + messages,
    }).encode("utf-8")
    req = urllib.request.Request(
        DEEPSEEK_URL,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        for raw_line in resp:
            line = raw_line.decode("utf-8").strip()
            if not line.startswith("data:"):
                continue
            chunk = line[len("data:"):].strip()
            if chunk == "[DONE]":
                break
            try:
                event = json.loads(chunk)
            except ValueError:
                continue
            delta = event.get("choices", [{}])[0].get("delta", {}).get("content")
            if delta:
                yield delta


def chat_available_error(exc):
    if isinstance(exc, urllib.error.HTTPError):
        return f"DeepSeek returned HTTP {exc.code}"
    if isinstance(exc, urllib.error.URLError):
        return "DeepSeek is unreachable from this server"
    return str(exc)


def _find_city(question_lower):
    for key, city in data.cities().items():
        if key in question_lower or city["name_en"].lower() in question_lower:
            return city
    return None


def local_answer(question):
    """Deterministic offline answer grounded in /data, used when DeepSeek is unavailable."""
    q = question.lower().strip()
    city = _find_city(q)
    if city:
        highlights = "; ".join(city.get("highlights", [])[:4])
        return (
            f"{city['name_en']} ({city['name_cn']}) — best visited {city['best_season']}, "
            f"typically {city['days']}. Vibe: {city['vibe']}. "
            f"Don't miss: {highlights}. Budget tip: {city['budget_tip']}"
        )
    if re.search(r"\bvisa\b", q):
        return (
            "Most visitors need a visa for mainland China, though several visa-free transit "
            "policies exist (for example a 144-hour visa-free transit in many cities, and a "
            "30-day visa-free stay in Hainan for eligible passports). Apply 1-2 months ahead "
            "through a Chinese consulate or visa service. Which passport do you hold?"
        )
    if re.search(r"\bmoney|pay|cash|card\b", q):
        return (
            "WeChat Pay and Alipay cover almost everything in China; bind an international "
            "card to either app before you arrive. Carry a small amount of cash (under ¥500) "
            "as a backup, since some small vendors and rural areas still prefer it. Tipping "
            "is not expected."
        )
    if re.search(r"\bfood|eat|dish|spicy\b", q):
        return (
            "China's food varies hugely by region: Sichuan and Hunan are spicy, Cantonese and "
            "Jiangnan cuisine are milder and more delicate. Ask for an English menu (有英文菜单吗) "
            "or say 'no spicy' (不要辣) if needed. Tell me a city and I can suggest specific dishes."
        )
    return (
        "I can help with routes, cities, food, visas, and local logistics in China. "
        "Try asking about a specific city, or tell me your trip length and interests "
        "and I'll suggest a route."
    )

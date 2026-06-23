import json

from ..lib import deepseek
from ..lib.http import Response


def register(router):
    @router.post("/api/chat")
    def chat(request):
        body = request.json()
        question = (body.get("message") or "").strip()
        history = body.get("history") or []
        if not question:
            return Response.error("message is required", 422, "missing_message")

        if not deepseek.is_configured():
            return Response.json({
                "answer": deepseek.local_answer(question),
                "provider": "local",
            })

        messages = [
            {"role": m.get("role"), "content": m.get("content")}
            for m in history if m.get("role") in ("user", "assistant") and m.get("content")
        ]
        messages.append({"role": "user", "content": question})

        if body.get("stream"):
            def gen():
                try:
                    for delta in deepseek.stream_chat(messages):
                        yield f"data: {json.dumps({'delta': delta})}\n\n"
                    yield "data: [DONE]\n\n"
                except Exception as exc:
                    fallback = deepseek.local_answer(question)
                    yield f"data: {json.dumps({'delta': fallback, 'fallback': True, 'reason': str(exc)})}\n\n"
                    yield "data: [DONE]\n\n"
            return Response.stream(gen())

        try:
            text = "".join(deepseek.stream_chat(messages))
            if not text:
                raise ValueError("empty completion")
            return Response.json({"answer": text, "provider": "deepseek"})
        except Exception as exc:
            return Response.json({
                "answer": deepseek.local_answer(question),
                "provider": "local",
                "reason": deepseek.chat_available_error(exc),
            })

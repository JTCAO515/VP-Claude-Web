from .. import VERSION
from ..lib import deepseek, amap
from ..lib.http import Response


def register(router):
    @router.get("/api/health")
    def health(request):
        return Response.json({
            "ok": True,
            "service": "VisePanda",
            "version": VERSION,
            "llm": {
                "provider": "deepseek",
                "status": "configured" if deepseek.is_configured() else "fallback",
            },
            "maps": {
                "provider": "amap",
                "status": "configured" if amap.is_configured() else "fallback",
            },
        })

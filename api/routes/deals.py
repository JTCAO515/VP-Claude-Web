from ..lib import data
from ..lib.http import Response


def register(router):
    @router.get("/api/deals/search")
    def search(request):
        city = (request.query.get("city") or "").lower()
        deal_type = request.query.get("type")
        results = [
            d for d in data.deals()
            if (not city or city in d["city"].lower() or city in d.get("cityCn", ""))
            and (not deal_type or d["type"] == deal_type)
        ]
        return Response.json({"deals": results})

    @router.get("/api/deals/detail")
    def detail(request):
        deal_id = request.query.get("id")
        match = next((d for d in data.deals() if d["id"] == deal_id), None)
        if not match:
            return Response.error("Deal not found", 404, "not_found")
        return Response.json({"deal": match})

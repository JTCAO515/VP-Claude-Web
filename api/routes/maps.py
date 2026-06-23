from ..lib import amap
from ..lib.http import Response


def register(router):
    @router.get("/api/maps/geocode")
    def geocode(request):
        address = request.query.get("q")
        if not address:
            return Response.error("q is required", 422, "missing_query")
        return Response.json(amap.geocode(address))

    @router.get("/api/maps/place")
    def place(request):
        keyword = request.query.get("q", "")
        city = request.query.get("city")
        return Response.json(amap.search_places(keyword, city))

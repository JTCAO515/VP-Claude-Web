from ..lib import data
from ..lib.http import Response


def register(router):
    @router.get("/api/hotels/search")
    def search(request):
        city = (request.query.get("city") or "").lower()
        results = [
            h for h in data.hotels()
            if not city or city in h["city"].lower() or city in h.get("cityCn", "")
        ]
        return Response.json({"hotels": results})

    @router.get("/api/hotels/detail")
    def detail(request):
        hotel_id = request.query.get("id")
        match = next((h for h in data.hotels() if h["id"] == hotel_id), None)
        if not match:
            return Response.error("Hotel not found", 404, "not_found")
        return Response.json({"hotel": match})

    @router.post("/api/hotels/book")
    def book(request):
        body = request.json()
        hotel_id = body.get("id")
        match = next((h for h in data.hotels() if h["id"] == hotel_id), None)
        if not match:
            return Response.error("Hotel not found", 404, "not_found")
        return Response.json({
            "intent": "booking_request_received",
            "hotel": match,
            "note": "This is a request stub. A human or booking partner will follow up; no charge has been made.",
        }, status=201)

from ..lib import data
from ..lib.http import Response

FEATURED = ["beijing", "shanghai", "xian", "guilin", "chengdu", "lijiang"]


def _card(key, city):
    return {
        "id": key,
        "name_en": city["name_en"],
        "name_cn": city["name_cn"],
        "best_season": city["best_season"],
        "days": city["days"],
        "vibe": city["vibe"],
        "image": city.get("image"),
    }


def register(router):
    @router.get("/api/cities")
    def list_cities(request):
        cities = data.cities()
        featured = request.query.get("featured")
        keys = FEATURED if featured else list(cities.keys())
        return Response.json({"cities": [_card(k, cities[k]) for k in keys if k in cities]})

    @router.get("/api/cities/<city_id>")
    def city_detail(request):
        cities = data.cities()
        city = cities.get(request.params["city_id"])
        if not city:
            return Response.error("City not found", 404, "not_found")
        return Response.json({"city": dict(city, id=request.params["city_id"])})

from ..lib import data
from ..lib.http import Response

CATEGORIES = ("phrases", "dining", "attractions", "culture")


def register(router):
    @router.get("/api/translations")
    def list_translations(request):
        category = request.query.get("category")
        query = (request.query.get("q") or "").lower()
        categories = [category] if category in CATEGORIES else list(CATEGORIES)

        payload = {}
        for cat in categories:
            items = data.translations(cat)
            if query:
                items = [
                    item for item in items
                    if query in str(item).lower()
                ]
            payload[cat] = items
        payload["dining_tags"] = data.dining_tags()
        payload["attraction_signs"] = data.attraction_signs()
        return Response.json(payload)

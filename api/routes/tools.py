from ..lib import data
from ..lib.http import Response

# English-native cards summarizing data/tips.json and data/visa_policies.json,
# grounded in the existing knowledge base but written for an English-native UI.
TOOL_CARDS = [
    {
        "id": "packing",
        "title": "Packing checklist",
        "icon": "luggage",
        "items": [
            "Passport, visa printout, hotel and flight/train confirmations",
            "Power adapter (China uses a 3-pin flat/2-pin round socket)",
            "A portable battery under 20,000mAh for flights",
            "Light layers year-round, plus a coat for northern winters",
            "Basic medicine: cold, stomach, allergy, plasters",
        ],
    },
    {
        "id": "money",
        "title": "Money and payments",
        "icon": "wallet",
        "items": [
            "WeChat Pay and Alipay cover almost everything — bind a foreign card before arrival",
            "Carry under ¥500 cash as backup; rural vendors may prefer it",
            "International cards work at big malls and hotels, not always at small shops",
            "Tipping is not expected anywhere in mainland China",
        ],
    },
    {
        "id": "safety",
        "title": "Safety and emergencies",
        "icon": "shield",
        "items": [
            "China is very safe overall, including at night in major cities",
            "Watch for tea-house, fortune-telling, and fake-police scams near attractions",
            "Police: 110, Ambulance: 120, Fire: 119",
            "Bring travel insurance that covers medical care and trip cancellation",
        ],
    },
    {
        "id": "etiquette",
        "title": "Etiquette",
        "icon": "etiquette",
        "items": [
            "Don't stick chopsticks upright in a rice bowl — it resembles a funeral offering",
            "Avoid giving clocks as gifts; the phrase sounds like \"end of life\"",
            "Queueing has improved but can still be informal at busy spots",
            "Ask before photographing people, especially in ethnic minority areas",
        ],
    },
    {
        "id": "connectivity",
        "title": "Phone and internet",
        "icon": "signal",
        "items": [
            "A VPN is required in mainland China for Google, Instagram, and similar apps",
            "Buy a local SIM at the airport, or an eSIM (Airalo, Holafly) before you fly",
            "Most hotels and cafes have free WiFi",
        ],
    },
]


def register(router):
    @router.get("/api/tools")
    def list_tools(request):
        return Response.json({"tools": TOOL_CARDS})

    @router.get("/api/tools/visa")
    def visa(request):
        nationality = (request.query.get("nationality") or "us").lower()
        bundle = data.load("visa_policies.json")
        policy = bundle.get(nationality)
        if not policy:
            return Response.error("Unknown nationality code", 404, "not_found")
        return Response.json({"visa": policy})

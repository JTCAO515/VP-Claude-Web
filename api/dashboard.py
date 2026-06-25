"""Dashboard data — cities, hotels, deals, tools, maps, weather.

Curated lists tuned for foreigner-friendliness. Weather proxies open-meteo
(no key required).
"""
from __future__ import annotations

import json

from .common import error_response, http_request, json_response, parse_query


# ============================================================
# Curated reference data
# ============================================================

CITIES = [
    {"id": "beijing", "name": "Beijing", "cn": "北京", "pinyin": "Běijīng",
     "tagline": "Forbidden City, Great Wall, hutongs",
     "best_months": "Apr-May · Sep-Oct",
     "lat": 39.9042, "lon": 116.4074, "image_tone": "ink-mountain"},
    {"id": "shanghai", "name": "Shanghai", "cn": "上海", "pinyin": "Shànghǎi",
     "tagline": "Bund skyline, French Concession, modern art",
     "best_months": "Mar-May · Sep-Nov",
     "lat": 31.2304, "lon": 121.4737, "image_tone": "neon-river"},
    {"id": "chengdu", "name": "Chengdu", "cn": "成都", "pinyin": "Chéngdū",
     "tagline": "Pandas, spicy hotpot, slow teahouses",
     "best_months": "Mar-Jun · Sep-Nov",
     "lat": 30.5728, "lon": 104.0668, "image_tone": "bamboo"},
    {"id": "xian", "name": "Xi'an", "cn": "西安", "pinyin": "Xī'ān",
     "tagline": "Terracotta Army, Muslim Quarter, city wall",
     "best_months": "Mar-May · Sep-Oct",
     "lat": 34.3416, "lon": 108.9398, "image_tone": "loess"},
    {"id": "guilin", "name": "Guilin", "cn": "桂林", "pinyin": "Guìlín",
     "tagline": "Karst peaks, Li River, Yangshuo countryside",
     "best_months": "Apr-Oct",
     "lat": 25.2736, "lon": 110.2907, "image_tone": "river"},
    {"id": "hangzhou", "name": "Hangzhou", "cn": "杭州", "pinyin": "Hángzhōu",
     "tagline": "West Lake, Longjing tea, silk roads",
     "best_months": "Mar-May · Sep-Nov",
     "lat": 30.2741, "lon": 120.1551, "image_tone": "lake"},
    {"id": "suzhou", "name": "Suzhou", "cn": "苏州", "pinyin": "Sūzhōu",
     "tagline": "Classical gardens, canals, embroidery",
     "best_months": "Apr-Jun · Sep-Nov",
     "lat": 31.2989, "lon": 120.5853, "image_tone": "garden"},
    {"id": "yunnan", "name": "Lijiang & Dali", "cn": "丽江·大理",
     "pinyin": "Lìjiāng · Dàlǐ",
     "tagline": "Naxi & Bai culture, Erhai lake, snowy peaks",
     "best_months": "Mar-Jun · Sep-Nov",
     "lat": 25.6053, "lon": 100.2675, "image_tone": "mountain"},
    {"id": "guangzhou", "name": "Guangzhou", "cn": "广州", "pinyin": "Guǎngzhōu",
     "tagline": "Cantonese cuisine, dim sum, Pearl River",
     "best_months": "Oct-Dec",
     "lat": 23.1291, "lon": 113.2644, "image_tone": "subtropical"},
    {"id": "shenzhen", "name": "Shenzhen", "cn": "深圳", "pinyin": "Shēnzhèn",
     "tagline": "Tech, Hong Kong gateway, modern parks",
     "best_months": "Oct-Dec",
     "lat": 22.5431, "lon": 114.0579, "image_tone": "modern"},
    {"id": "harbin", "name": "Harbin", "cn": "哈尔滨", "pinyin": "Hā'ěrbīn",
     "tagline": "Ice & Snow Festival, Russian architecture",
     "best_months": "Dec-Feb",
     "lat": 45.8038, "lon": 126.5350, "image_tone": "ice"},
    {"id": "chongqing", "name": "Chongqing", "cn": "重庆", "pinyin": "Chóngqìng",
     "tagline": "Mountain city, hotpot, Yangtze cruises",
     "best_months": "Apr-May · Sep-Oct",
     "lat": 29.5630, "lon": 106.5516, "image_tone": "mist"},
]


HOTELS = [
    {"id": "h-beijing-1", "city": "beijing", "name": "Hutong Courtyard Boutique",
     "foreigner_friendly": True, "english_service": True, "foreign_card": True,
     "metro_min": 6, "neighborhood": "Dongcheng / Nanluoguxiang",
     "rating": 4.6, "price_band": "$$"},
    {"id": "h-beijing-2", "city": "beijing", "name": "Wangfujing Modern Suites",
     "foreigner_friendly": True, "english_service": True, "foreign_card": True,
     "metro_min": 2, "neighborhood": "Dongcheng / Wangfujing",
     "rating": 4.5, "price_band": "$$$"},
    {"id": "h-shanghai-1", "city": "shanghai", "name": "Bund Riverside Hotel",
     "foreigner_friendly": True, "english_service": True, "foreign_card": True,
     "metro_min": 3, "neighborhood": "Huangpu / Bund",
     "rating": 4.7, "price_band": "$$$"},
    {"id": "h-shanghai-2", "city": "shanghai", "name": "Concession Garden Inn",
     "foreigner_friendly": True, "english_service": True, "foreign_card": True,
     "metro_min": 5, "neighborhood": "Xuhui / French Concession",
     "rating": 4.6, "price_band": "$$"},
    {"id": "h-chengdu-1", "city": "chengdu", "name": "Panda Garden Inn",
     "foreigner_friendly": True, "english_service": True, "foreign_card": False,
     "metro_min": 8, "neighborhood": "Jinjiang / Chunxi",
     "rating": 4.5, "price_band": "$$"},
    {"id": "h-xian-1", "city": "xian", "name": "City Wall View Lodge",
     "foreigner_friendly": True, "english_service": True, "foreign_card": True,
     "metro_min": 5, "neighborhood": "Beilin / Bell Tower",
     "rating": 4.4, "price_band": "$$"},
    {"id": "h-guilin-1", "city": "guilin", "name": "Li River Boutique",
     "foreigner_friendly": True, "english_service": False, "foreign_card": False,
     "metro_min": 0, "neighborhood": "Yangshuo Old Town",
     "rating": 4.6, "price_band": "$$"},
    {"id": "h-hangzhou-1", "city": "hangzhou", "name": "West Lake Tea House Hotel",
     "foreigner_friendly": True, "english_service": True, "foreign_card": True,
     "metro_min": 7, "neighborhood": "Xihu / West Lake",
     "rating": 4.7, "price_band": "$$$"},
    {"id": "h-suzhou-1", "city": "suzhou", "name": "Pingjiang Canal House",
     "foreigner_friendly": True, "english_service": True, "foreign_card": False,
     "metro_min": 4, "neighborhood": "Gusu / Pingjiang Road",
     "rating": 4.5, "price_band": "$$"},
]


DEALS = [
    {"id": "d-hotpot-cd", "city": "chengdu", "title": "Authentic Sichuan Hotpot for 2",
     "category": "dining", "discount": "-35%", "english_menu": True,
     "foreign_card": False, "vendor": "Shu Da Xia 蜀大侠",
     "address_cn": "成都市锦江区春熙路 12 号",
     "address_en": "12 Chunxi Road, Jinjiang District, Chengdu"},
    {"id": "d-tea-hz", "city": "hangzhou", "title": "Longjing Tea Tasting + West Lake Walk",
     "category": "experience", "discount": "-20%", "english_menu": True,
     "foreign_card": True, "vendor": "Lao Long Jing Tea House",
     "address_cn": "杭州市西湖区龙井路 1 号",
     "address_en": "1 Longjing Road, Xihu District, Hangzhou"},
    {"id": "d-roastduck-bj", "city": "beijing", "title": "Roast Duck Set for 2",
     "category": "dining", "discount": "-25%", "english_menu": True,
     "foreign_card": True, "vendor": "Siji Minfu 四季民福",
     "address_cn": "北京市东城区故宫旁",
     "address_en": "Near the Forbidden City, Dongcheng, Beijing"},
    {"id": "d-river-gl", "city": "guilin", "title": "Li River Bamboo Raft Cruise",
     "category": "experience", "discount": "-15%", "english_menu": False,
     "foreign_card": False, "vendor": "Yangshuo Raft Co.",
     "address_cn": "桂林市阳朔县兴坪镇",
     "address_en": "Xingping, Yangshuo, Guilin"},
    {"id": "d-dimsum-gz", "city": "guangzhou", "title": "Yum Cha Brunch for 2",
     "category": "dining", "discount": "-20%", "english_menu": True,
     "foreign_card": True, "vendor": "白天鹅宾馆 White Swan",
     "address_cn": "广州市荔湾区沙面南街 1 号",
     "address_en": "1 South Shamian St, Liwan, Guangzhou"},
    {"id": "d-naxi-yn", "city": "yunnan", "title": "Naxi Music Evening + Old Town walk",
     "category": "experience", "discount": "-10%", "english_menu": False,
     "foreign_card": False, "vendor": "纳西古乐宫 Naxi Ancient Music Palace",
     "address_cn": "丽江古城东大街",
     "address_en": "East Avenue, Lijiang Old Town"},
]


TOOLS = [
    {"id": "payment", "title": "Mobile Payment Setup",
     "summary": "Alipay TourCard + WeChat Pay for foreigners. Step-by-step.",
     "steps": [
         "Download Alipay → open TourCard → bind Visa/Mastercard.",
         "Pre-load 100–500 CNY for daily QR payments.",
         "Test by scanning a small vendor QR before relying on it.",
     ]},
    {"id": "sim", "title": "SIM / eSIM",
     "summary": "China Unicom or Mobile prepaid SIM at airport; eSIMs from Airalo/Holafly.",
     "steps": [
         "Airalo eSIM works without queueing — buy before flight.",
         "Local SIMs at airport need your passport.",
         "Most plans bundle data; foreign WhatsApp/Google still need VPN.",
     ]},
    {"id": "vpn", "title": "VPN Setup",
     "summary": "Install before you fly. Multiple providers, redundant servers.",
     "steps": [
         "Install at least 2 VPN apps in advance (Astrill, NordVPN, ExpressVPN).",
         "Test in airplane mode on hotel Wi-Fi.",
         "Most local apps (Maps, Didi, Meituan) work without VPN.",
     ]},
    {"id": "transit", "title": "Trains & Metro",
     "summary": "12306.cn books rail with passport. Most metros sell QR via Alipay.",
     "steps": [
         "Use the 12306 English app or Trip.com for high-speed rail.",
         "Carry your passport — needed at every station turnstile.",
         "Use Alipay or WeChat for metro QR tickets in major cities.",
     ]},
    {"id": "emergency", "title": "Emergency",
     "summary": "Police 110 · Ambulance 120 · Fire 119 · save your embassy line.",
     "steps": [
         "Save your embassy phone number before travel.",
         "Hotels can help call services in English.",
         "Use the Translate tab → Emergency phrases.",
     ]},
]


ATTRACTIONS = [
    {"id": "a-forbidden-city", "city": "beijing", "name": "Forbidden City",
     "category": "Landmark", "summary": "Imperial palace complex, 600 years of history.",
     "duration": "2-3h", "price_band": "$"},
    {"id": "a-great-wall", "city": "beijing", "name": "Great Wall (Mutianyu)",
     "category": "Landmark", "summary": "The most accessible well-restored section from Beijing.",
     "duration": "Half day", "price_band": "$$"},
    {"id": "a-bund", "city": "shanghai", "name": "The Bund",
     "category": "Scenic", "summary": "Riverside promenade facing the Pudong skyline.",
     "duration": "1-2h", "price_band": "Free"},
    {"id": "a-yuyuan", "city": "shanghai", "name": "Yuyuan Garden",
     "category": "Garden", "summary": "Classical Ming-dynasty garden in the old city.",
     "duration": "1-2h", "price_band": "$"},
    {"id": "a-panda-base", "city": "chengdu", "name": "Chengdu Panda Base",
     "category": "Wildlife", "summary": "Giant pandas in a research-park setting; go early morning.",
     "duration": "Half day", "price_band": "$"},
    {"id": "a-terracotta", "city": "xian", "name": "Terracotta Army",
     "category": "Landmark", "summary": "Thousands of life-size warrior statues, 2,200 years old.",
     "duration": "Half day", "price_band": "$$"},
    {"id": "a-li-river", "city": "guilin", "name": "Li River Cruise",
     "category": "Scenic", "summary": "Karst-peak river scenery between Guilin and Yangshuo.",
     "duration": "Full day", "price_band": "$$$"},
    {"id": "a-west-lake", "city": "hangzhou", "name": "West Lake",
     "category": "Scenic", "summary": "UNESCO site — pagodas, causeways, and tea hills around the lake.",
     "duration": "Half day", "price_band": "Free"},
]


# ============================================================
# Handlers
# ============================================================

def _cities(environ, start_response):
    params = parse_query(environ)
    city_id = params.get("id")
    if city_id:
        match = next((c for c in CITIES if c["id"] == city_id), None)
        if not match:
            return error_response(start_response, "City not found", "404 Not Found")
        return json_response(start_response, {"ok": True, "city": match})
    return json_response(start_response, {"ok": True, "cities": CITIES})


def _hotels(environ, start_response):
    params = parse_query(environ)
    city = params.get("city")
    items = [h for h in HOTELS if not city or h["city"] == city]
    return json_response(start_response, {"ok": True, "hotels": items})


def _deals(environ, start_response):
    params = parse_query(environ)
    city = params.get("city")
    items = [d for d in DEALS if not city or d["city"] == city]
    return json_response(start_response, {"ok": True, "deals": items})


def _attractions(environ, start_response):
    params = parse_query(environ)
    city = params.get("city")
    items = [a for a in ATTRACTIONS if not city or a["city"] == city]
    return json_response(start_response, {"ok": True, "attractions": items})


def _tools(environ, start_response):
    params = parse_query(environ)
    tid = params.get("id")
    if tid:
        match = next((t for t in TOOLS if t["id"] == tid), None)
        if not match:
            return error_response(start_response, "Tool not found", "404 Not Found")
        return json_response(start_response, {"ok": True, "tool": match})
    return json_response(start_response, {"ok": True, "tools": TOOLS})


def _maps(environ, start_response):
    params = parse_query(environ)
    city_id = params.get("city")
    city = next((c for c in CITIES if c["id"] == city_id), None) if city_id else None
    pois: list[dict] = []
    if city:
        pois = [
            {"name": f"{city['name']} downtown", "lat": city["lat"], "lon": city["lon"],
             "kind": "center"},
            {"name": f"{city['name']} central station",
             "lat": city["lat"] + 0.01, "lon": city["lon"] + 0.01, "kind": "transit"},
        ]
    return json_response(start_response, {"ok": True, "city": city, "pois": pois})


def _weather(environ, start_response):
    params = parse_query(environ)
    try:
        lat = float(params.get("lat", "39.9042"))
        lon = float(params.get("lon", "116.4074"))
    except ValueError:
        return error_response(start_response, "Invalid lat/lon")
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        "&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m"
        "&timezone=auto"
    )
    code, body, _ = http_request(url, timeout=8)
    if code != 200:
        return json_response(start_response, {
            "ok": True, "fallback": True,
            "summary": "Weather unavailable; using gentle defaults.",
            "temperature_c": 22, "humidity": 55, "wind_kmh": 8, "code": 1,
        })
    try:
        data = json.loads(body.decode("utf-8"))
        cur = data.get("current", {})
    except ValueError:
        cur = {}
    return json_response(start_response, {
        "ok": True,
        "temperature_c": cur.get("temperature_2m"),
        "humidity": cur.get("relative_humidity_2m"),
        "wind_kmh": cur.get("wind_speed_10m"),
        "code": cur.get("weather_code"),
        "lat": lat, "lon": lon,
    })


def handle(environ, start_response, path: str):
    if path == "/api/cities":
        return _cities(environ, start_response)
    if path == "/api/hotels":
        return _hotels(environ, start_response)
    if path == "/api/deals":
        return _deals(environ, start_response)
    if path == "/api/attractions":
        return _attractions(environ, start_response)
    if path == "/api/tools":
        return _tools(environ, start_response)
    if path == "/api/maps":
        return _maps(environ, start_response)
    if path == "/api/weather":
        return _weather(environ, start_response)
    return error_response(start_response, "Route not found", "404 Not Found")

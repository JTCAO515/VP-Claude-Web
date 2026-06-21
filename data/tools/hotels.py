"""Hotel / restaurant data + travel story generator"""
HOTEL_DATA = {
    "beijing": [
        {"name": "Hilton Beijing Wangfujing (北京王府井希尔顿)", "tier": "luxury", "price": "¥1,200+", "area": "Wangfujing (王府井)", "rating": 4.5},
        {"name": "Ji Hotel Beijing Qianmen (北京全季酒店/前门)", "tier": "mid", "price": "¥400-600", "area": "Qianmen (前门)", "rating": 4.3},
        {"name": "Home Inn Tiananmen Square (北京如家/天安门广场店)", "tier": "budget", "price": "¥200-350", "area": "Qianmen (前门)", "rating": 4.0},
        {"name": "Beijing Courtyard Hostel Nanluoguxiang (北京四合院客栈/南锣鼓巷)", "tier": "mid", "price": "¥500-800", "area": "Nanluoguxiang (南锣鼓巷)", "rating": 4.4},
    ],
    "shanghai": [
        {"name": "Waldorf Astoria Shanghai Bund (上海外滩华尔道夫)", "tier": "luxury", "price": "¥2,000+", "area": "The Bund (外滩)", "rating": 4.7},
        {"name": "Atour S Shanghai Nanjing Road (上海亚朵S/南京路)", "tier": "mid", "price": "¥500-800", "area": "Nanjing Road (南京路)", "rating": 4.4},
        {"name": "Hanting Shanghai People's Square (上海汉庭/人民广场)", "tier": "budget", "price": "¥250-400", "area": "People's Square (人民广场)", "rating": 4.1},
    ],
    "chengdu": [
        {"name": "The Temple House Chengdu (成都博舍)", "tier": "luxury", "price": "¥1,500+", "area": "Taikoo Li (太古里)", "rating": 4.8},
        {"name": "Atour Chengdu Chunxi Road (成都亚朵/春熙路)", "tier": "mid", "price": "¥400-600", "area": "Chunxi Road (春熙路)", "rating": 4.5},
        {"name": "Chengdu Backpack 10 Years Hostel (成都背包十年青旅)", "tier": "budget", "price": "¥60-100", "area": "Kuanzhai Alley (宽窄巷子)", "rating": 4.6},
    ],
    "xian": [
        {"name": "Sofitel Legend Xi'an (西安索菲特传奇)", "tier": "luxury", "price": "¥1,000+", "area": "Bell Tower (钟楼)", "rating": 4.6},
        {"name": "Mercure Xi'an Bell Tower (西安美居/钟楼)", "tier": "mid", "price": "¥300-500", "area": "Bell Tower (钟楼)", "rating": 4.3},
        {"name": "Xi'an Xiangzimeng Hostel (西安湘子门青旅)", "tier": "budget", "price": "¥50-80", "area": "South Gate (南门)", "rating": 4.5},
    ],
    "guilin": [
        {"name": "Shangri-La Guilin (桂林香格里拉)", "tier": "luxury", "price": "¥800+", "area": "Li River Bank (漓江边)", "rating": 4.5},
        {"name": "Yangshuo Mango Inn (阳朔芒果旅宿)", "tier": "mid", "price": "¥300-500", "area": "Yangshuo West Street (阳朔西街)", "rating": 4.4},
        {"name": "Yangshuo Old Squad Hostel (阳朔老班长青旅)", "tier": "budget", "price": "¥40-70", "area": "Yangshuo (阳朔)", "rating": 4.3},
    ],
    "yunnan": [
        {"name": "Anyu Hotel Dali Ancient Town (大理古城安隅酒店)", "tier": "luxury", "price": "¥800-1,200", "area": "Dali Ancient Town (大理古城)", "rating": 4.7},
        {"name": "Lijiang Huajiantang Sifang Street (丽江花间堂/四方街)", "tier": "mid", "price": "¥400-700", "area": "Lijiang Ancient Town (丽江古城)", "rating": 4.5},
        {"name": "Dali Manba Hostel (大理慢吧青旅)", "tier": "budget", "price": "¥40-60", "area": "Dali Ancient Town (大理古城)", "rating": 4.4},
    ],
}

def recommend_hotels(city: str, tier: str = "mid") -> list:
    """Recommend hotels by city + tier"""
    hotels = HOTEL_DATA.get(city, [])
    matches = [h for h in hotels if h["tier"] == tier]
    if not matches:
        matches = [h for h in hotels if h["tier"] in ["mid", "budget"]]
    return matches[:3]

def generate_travel_story(city: str, days: int, activities: list = None) -> dict:
    """Generate a travel story template"""
    return {
        "title": f"My {days}-Day Trip to {city}",
        "subtitle": f"A travel story about {city}",
        "sections": [
            {"title": "Departure", "content": f"Boarding the train/plane to {city}, full of excitement."},
            {"title": "Exploration", "content": f"Every day in {city} is a new discovery."},
            {"title": "Food", "content": f"The local flavours — the deepest memories are made here."},
            {"title": "Farewell", "content": f"{days} days flew by. See you next time, {city}!"},
        ]
    }

"""Travel decision tools: decision tree + social captions + travel stories"""
import random

DECISION_QUESTIONS = [
    {"q": "What travel pace do you prefer? (你更喜欢哪种旅行节奏？)", "options": {"a": "Leisurely slow travel (悠闲慢游)", "b": "Compact / check-list style (紧凑打卡)"}},
    {"q": "What matters most? (最看重什么？)", "options": {"a": "Food (美食)", "b": "History (历史)", "c": "Nature (自然)", "d": "City life (都市)"}},
    {"q": "Rough budget? (预算大概？)", "options": {"a": "Budget — under ¥2,000 (穷游 ¥2000内)", "b": "Mid-range — ¥5,000 (中等 ¥5000)", "c": "Luxury — ¥10,000+ (豪华 ¥1万+)"}},
    {"q": "How many of you? (几个人去？)", "options": {"a": "Solo (独行)", "b": "Couple (情侣)", "c": "Family / Friends (家庭/朋友)"}},
    {"q": "When are you going? (什么时候去？)", "options": {"a": "Soon (最近就去)", "b": "Planning ahead (计划中)"}},
]

def recommend_destination(answers: dict) -> str:
    """Recommend a destination based on 5 answers"""
    prefs = []
    if answers.get("q2") == "a":
        prefs.extend(["Chengdu (成都)", "Guangzhou (广州)", "Changsha (长沙)", "Chongqing (重庆)"])
    elif answers.get("q2") == "b":
        prefs.extend(["Beijing (北京)", "Xi'an (西安)", "Nanjing (南京)", "Luoyang (洛阳)"])
    elif answers.get("q2") == "c":
        prefs.extend(["Yunnan (云南)", "Guilin (桂林)", "Zhangjiajie (张家界)", "Jiuzhaigou (九寨沟)"])
    else:
        prefs.extend(["Shanghai (上海)", "Shenzhen (深圳)", "Hangzhou (杭州)", "Chengdu (成都)"])

    if answers.get("q1") == "a":
        prefs = [c for c in prefs if c not in ["Shanghai (上海)", "Shenzhen (深圳)", "Chongqing (重庆)"]]
    if answers.get("q3") == "a":
        prefs = [c for c in prefs if c not in ["Shanghai (上海)", "Shenzhen (深圳)", "Hangzhou (杭州)"]]
    if answers.get("q4") == "b":
        prefs = [c for c in prefs if c in ["Chengdu (成都)", "Dali (大理)", "Lijiang (丽江)", "Xiamen (厦门)", "Hangzhou (杭州)"]]

    return random.choice(prefs) if prefs else random.choice(["Chengdu (成都)", "Xi'an (西安)", "Yunnan (云南)", "Guilin (桂林)"])

SOCIAL_TEMPLATES = {
    "instagram": [
        "📸 {place} in {city} — {adj} beyond words. {emoji}\n\n#travel #china #{city_tag}",
        "The {adj} of {city}? All in this one bite of {food}. {emoji}\n\n#foodie #{city_tag}",
    ],
    "wechat": [
        "Day {days} in {city} — {feeling}.\n{tip}\n📍{place}",
        "In {city} you MUST {action}! {reason} 🥹\n#traveldiary",
    ],
    "xiaohongshu": [
        "✨ {city} — 3 days 2 nights guide❗️{highlights}\n💰 Only {price} RMB per person\n👇 Full route below",
    ]
}

def generate_caption(platform: str, city: str, place: str = "",
                      food: str = "", days: int = 3, price: int = 2000) -> str:
    """Generate social media caption"""
    import random
    adj_map = {"Chengdu (成都)": "cozy (巴适)", "Chongqing (重庆)": "surreal (魔幻)", "Xi'an (西安)": "epic (震撼)",
               "Beijing (北京)": "grand (大气)", "Shanghai (上海)": "chic (摩登)", "Yunnan (云南)": "healing (治愈)",
               "Guilin (桂林)": "stunning (绝美)", "Guangzhou (广州)": "delicious (好食)"}
    adj = adj_map.get(city, "beautiful (好看)")
    feeling = random.choice(["You only realise how beautiful life is when you slow down (慢下来才发现好多美好)",
                             "Another new city unlocked! (又解锁一个新城市)",
                             "Happiness is really this simple (快乐就这么简单)"])
    tip = random.choice(["Go early in the morning — fewer people (推荐早上来没人)",
                         "Found this with a local's help (本地人带路才找到的)",
                         "Must book in advance! (一定要提前预约)"])
    action = random.choice(["eat an authentic local breakfast (吃一顿地道早餐)",
                            "take photos at this spot (去这个机位拍照)",
                            "experience life like a local (感受当地人的生活)"])
    reason = random.choice(["absolutely incredible (太绝了)", "who gets it 🥹 (谁懂啊)", "I'm truly in love (真的好爱)"])
    highlights = random.choice(["Attractions + food guide (景点+美食全攻略)",
                                "Off-the-beaten-path recommendations (小众路线推荐)",
                                "Photo spot guide (拍照机位分享)"])
    emoji = random.choice(["✨", "🥹", "🔥", "💯", "😭"])
    city_tag = city.lower().split()[0] if "(" in city else city.lower()

    tmpl = random.choice(SOCIAL_TEMPLATES.get(platform, SOCIAL_TEMPLATES["wechat"]))
    return tmpl.format(city=city, place=place, adj=adj, emoji=emoji,
                       city_tag=city_tag, days=days, food=food or "local food (当地美食)",
                       feeling=feeling, tip=tip, action=action, reason=reason,
                       highlights=highlights, price=price)

"""Price estimation engine — real prices from knowledge base"""
import random

PRICE_DATA = {
    # Attractions (门票)
    "Forbidden City (故宫)": 60, "Great Wall (长城)": 45, "Temple of Heaven (天坛)": 15, "Summer Palace (颐和园)": 30, "Terracotta Warriors (兵马俑)": 120,
    "Panda Base (大熊猫基地)": 55, "Dujiangyan (都江堰)": 80, "West Lake (西湖)": 0, "Lingyin Temple (灵隐寺)": 75, "Gulangyu Island (鼓浪屿)": 0,
    "Yellow Crane Tower (黄鹤楼)": 70, "Shaolin Temple (嵩山少林)": 100, "Zhangjiajie (张家界)": 225, "Yellow Mountain (黄山)": 190, "Jiuzhaigou (九寨沟)": 169,
    "Mogao Caves (莫高窟)": 238, "Qinghai Lake (青海湖)": 0, "Potala Palace (布达拉宫)": 200, "Jade Dragon Snow Mountain (玉龙雪山)": 100,
    # Transport (交通)
    "HSR_per_100km (高铁_每100km)": 45, "flight_domestic (飞机_国内)": 500, "subway_per_ride (地铁_次)": 4,
    "taxi_flagfall (打车_起步)": 12, "taxi_per_km (打车_perkm)": 2.5,
    # Accommodation (住宿)
    "hostel_per_night (青旅_晚)": 80, "budget_hotel_per_night (快捷_晚)": 200, "mid_hotel_per_night (精品_晚)": 400, "luxury_hotel_per_night (五星_晚)": 1000,
    # Meals (餐饮)
    "breakfast (早餐)": 15, "lunch (午餐)": 40, "dinner_normal (晚餐_普通)": 60, "dinner_luxury (晚餐_豪华)": 200,
    "snack (小吃_次)": 20, "drink (饮料_杯)": 15,
}

def estimate_trip_cost(city: str, days: int = 3, budget_tier: str = "mid") -> dict:
    """Estimate trip cost"""
    tiers = {"budget": 0.6, "mid": 1.0, "luxury": 1.5}
    multiplier = tiers.get(budget_tier, 1.0)

    hotel_tier = {"budget": "hostel_per_night (青旅_晚)", "mid": "mid_hotel_per_night (精品_晚)", "luxury": "luxury_hotel_per_night (五星_晚)"}
    meal_tier = {"budget": "snack (小吃_次)", "mid": "dinner_normal (晚餐_普通)", "luxury": "dinner_luxury (晚餐_豪华)"}

    hotel = PRICE_DATA.get(hotel_tier.get(budget_tier, "mid_hotel_per_night (精品_晚)"), 400) * multiplier
    meals = (PRICE_DATA.get("breakfast (早餐)", 15) + PRICE_DATA.get(meal_tier.get(budget_tier, "dinner_normal (晚餐_普通)"), 60)) * days * multiplier
    transport = PRICE_DATA.get("subway_per_ride (地铁_次)", 4) * 4 * days + PRICE_DATA.get("taxi_flagfall (打车_起步)", 12) * days * 0.5
    attractions = PRICE_DATA.get("Forbidden City (故宫)", 60) * 2 * multiplier  # 2 attractions per day
    misc = PRICE_DATA.get("drink (饮料_杯)", 15) * 3 * days

    total = hotel * days + meals + transport + attractions + misc

    return {
        "Accommodation (住宿)": round(hotel * days),
        "Meals (餐饮)": round(meals),
        "Transport (交通)": round(transport),
        "Attractions (门票)": round(attractions),
        "Other (其他)": round(misc),
        "Total (总计)": round(total),
        "Daily Average (日均)": round(total / days),
        "budget_tier": budget_tier,
    }

def get_weather_advice(city: str, season: str = "spring") -> str:
    """Get seasonal weather advice"""
    tips = {
        "beijing": {"spring": "Mar–Apr: dust storms — bring a mask (3-4月有沙尘，带口罩)", "summer": "Scorching 40°C+ — stay cool (炎热40°C+，注意防暑)", "autumn": "Crisp clear skies — best season (秋高爽，最佳季节)", "winter": "Dry cold -10°C — down jacket needed (干冷-10°C，穿羽绒服)"},
        "shanghai": {"spring": "Plum-rain season — humid, bring umbrella (梅雨季潮湿，带伞)", "summer": "Muggy 35°C+ — indoor activities preferred (闷热35°C+，室内活动优先)", "autumn": "Comfortable and cool (舒适凉爽)", "winter": "Damp cold — bone-chilling (湿冷，魔法攻击)"},
        "chengdu": {"spring": "Comfortable, occasional drizzle (舒适，偶尔阴雨)", "summer": "Muggy hot — balance it with hotpot and iced desserts (闷热潮湿，火锅配冰粉)", "autumn": "Cool and comfortable (凉爽舒适)", "winter": "Overcast, cold and foggy (阴冷多雾)"},
        "guangzhou": {"spring": "Extremely humid 'back-to-south' weather (回南天极潮)", "summer": "Hot + typhoons — check forecasts (炎热+台风，注意天气预报)", "autumn": "Most comfortable season (最舒适的季节)", "winter": "Warm — short sleeves suffice (温暖，短袖即可)"},
        "default": "Check the local forecast before you go and pack accordingly (出行前查当地天气预报，备好对应衣物)"}
    return tips.get(city, {}).get(season, tips["default"])

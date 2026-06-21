"""China visa guide — entry info for foreigners"""
VISA_INFO = {
    "visa_free_transit_144h": {
        "name": "144-Hour Visa-Free Transit (144小时过境免签)",
        "eligible": "53 nationalities (incl. US/UK/FR/DE/AU/JP/KR etc.) (53个国家公民，含美/英/法/德/澳/日/韩等)",
        "cities": "Beijing/Shanghai/Guangzhou/Shenzhen/Chengdu/Chongqing/Xi'an/Kunming/Hangzhou — 20+ cities (北京/上海/广州/深圳/成都/重庆/西安/昆明/杭州等20+城市)",
        "duration": "144 hours (6 days) (144小时/6天)",
        "conditions": [
            "Hold a connecting ticket to a third country",
            "Stay within the designated city/region (cannot leave the province/municipality)",
            "Enter through a specific port in that city",
            "Exit through the same port in the same province/municipality",
        ],
        "how_to_apply": "Fill in a Temporary Entry Application form upon arrival — approved by border control (到达口岸后填写《临时入境申请表》，边检审批)"
    },
    "visa_free_hainan": {
        "name": "Hainan Visa-Free (海南免签)",
        "eligible": "59 nationalities (59个国家公民)",
        "duration": "30 days (30天)",
        "conditions": [
            "Activity limited to Hainan Province",
            "Can enter through any international port in Hainan",
        ],
        "note": "Best for travellers visiting Hainan specifically (适合专程去海南度假的旅客)"
    },
    "tourist_visa_l": {
        "name": "L Tourist Visa (L字旅游签证)",
        "eligible": "All countries (所有国家)",
        "duration": "30–90 days — single/multiple entry (30-90天，单次/多次)",
        "how_to_apply": [
            "Apply at a Chinese embassy/consulate in your home country (在中国驻外使领馆申请)",
            "Provide passport, photo, round-trip tickets, hotel booking (需提供护照原件、照片、往返机票、酒店预订)",
            "Some countries can use a travel agency (easier) (部分国家可通过旅行社代办)",
            "Fee: approx. ¥700–1,000 depending on nationality (费用约¥700-1000，因国家而异)",
        ],
        "processing_time": "4–7 business days (4-7个工作日)",
        "tip": "Apply 1–2 months in advance — peak season takes longer (建议提前1-2个月申请，旅游旺季可能更久)"
    },
    "visa_free_hong_kong": {
        "name": "Hong Kong / Macau Entry (香港/澳门入境)",
        "eligible": "Most nationalities: 7–90 days visa-free depending on nationality (大部分国家免签7-90天不等)",
        "note": "HK and Macau have separate visa policies from mainland China — generally more relaxed (香港和澳门的签证政策与中国大陆不同，通常更宽松)",
        "tip": "Entering mainland China from HK/Macau still requires a Chinese visa (unless eligible for 144h transit) (从香港/澳门入境大陆仍需办理中国签证，除非符合144h过境条件)"
    },
    "apr_recommendations": [
        "⭐ Short trip (1–6 days) → 144h visa-free transit — saves time & money (短期旅行1-6天 → 144小时过境免签)",
        "⭐ Pure vacation → Hainan visa-free for 30 days — beach + duty-free (专程度假 → 海南免签30天，海滩+免税购物)",
        "⭐ Family visit / deep travel (7–30 days) → L Tourist Visa — needs advance planning (探亲/深度游7-30天 → L字旅游签证，需提前申请)",
        "⭐ HK/Macau + mainland combo → fly to HK (visa-free) → enter mainland (144h transit) → exit via HK (同时游香港/澳门+大陆 → 先飞香港免签→再进大陆144h免签→香港出境)",
    ],
    "important_notes": [
        "Visa policies can change at any time — confirm the latest before you travel (签证政策可能随时调整，出行前务必确认最新信息)",
        "All foreigners in mainland China must carry their passport at all times (所有外国人在中国大陆必须随身携带护照原件)",
        "Accommodation: hotels must register foreign guests — any涉外 hotel can do this (酒店必须登记外国人信息，所有涉外酒店均可)",
        "Transport: foreigners can buy HSR/plane tickets — book online in advance (12306 English version available) (高铁/飞机：外国人可以买票，建议提前网上购票)",
        "Currency: WeChat/Alipay can link Visa/Mastercard — set up after arrival (微信/支付宝可绑定Visa/Mastercard，需在入境后操作)",
        "SIM: buy a temporary China Unicom/Mobile SIM at the airport (建议购买中国联通/移动的临时SIM卡，机场可买)",
        "VPN: access Google/Instagram/Facebook requires a VPN — install before you arrive (访问Google/Instagram/Facebook需要VPN，提前安装好)",
    ],
}

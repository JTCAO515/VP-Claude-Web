# VisePanda

> **一站式 AI 管家，专为外国人来中国入境游打造。**
> English-native, mobile-first, AI-powered.
> 视野 · shìyě · the field of view.

- **Live:** https://claude.go2china.space
- **Handoff doc** (full project history, working agreements, open gaps): [`docs/HANDOFF.md`](docs/HANDOFF.md)
- **Vercel key setup guide** (non-technical, Chinese): [`docs/VERCEL_KEYS_GUIDE.md`](docs/VERCEL_KEYS_GUIDE.md)

## 产品定位

VisePanda 解决的是**外国游客入境中国后的"信息断层"**：不懂中文、不会用本地 App
（微信/支付宝/美团/携程的中文界面、注册门槛、本地手机号要求），导致问路、订房、
点餐、订票这些在自己国家很简单的事，在中国变得困难。

VisePanda 不是又一个旅游攻略 App，而是定位为**贯穿入境全程的 AI 管家**——从
落地前的签证/支付准备，到落地后的翻译救急、行程规划、酒店餐厅预订，全部用
英文交互，背后接中国本地真实可用的服务（DeepSeek 问答、Qwen3 语音翻译、
高德地图、携程/美团预订深链），而不是自己造一套脱离实际的"国际化旅游平台"。

**一句话产品主张**：*"你不需要学中文 App，也不需要问当地人——问 VisePanda 就够了。"*

### 当前五大模块（v8.x IA）

| Tab | 解决什么问题 |
| --- | --- |
| **Ask** | 落地页 + AI 问答主屏。任何关于中国旅行的问题，DeepSeek 直接回答；遇到具体决策（订酒店/查景点）一键转到对应 tab。 |
| **Trips**（含 Plan） | 行程规划与管理。AI 生成结构化每日行程，地图可视化路线，"+Add to Trip"把零散决策收进一个具体的行程里。 |
| **Cities** | 城市浏览入口。选定城市后按 酒店 / 餐厅 / 景点 三分类浏览，每项带评分和预订/详情深链。 |
| **Tools** | 落地后最高频的救急工具集：实时语音/文字翻译、货币换算、支付设置引导、签证信息、地铁图、eSIM/VPN、应急联系方式。 |
| **(Account)** | 邮箱/Google 登录，跨设备同步行程、收藏、对话历史；未登录也能完整体验核心功能。 |

### 产品路线图

**已完成（v7 → v8.4，详见 [`CHANGELOG.md`](CHANGELOG.md)）**
- ✅ AI 问答（DeepSeek）+ 实时语音翻译（Qwen3 TTS/ASR）
- ✅ 城市/酒店/餐厅/景点精选数据 + 评分（高德 POI，替代无公开 API 的大众点评）
- ✅ 行程规划 + AI 生成 + 地图可视化（高德地图）
- ✅ 酒店/火车/机票预订深链（携程 H5 URL 工具）+ 团购深链（美团联盟）
- ✅ 完整账号系统（邮箱密码 + Google OAuth + 邮箱验证）
- ✅ 五 tab 信息架构（Ask/Trips/Cities/Tools），所有外部依赖均可优雅降级

**下一阶段（短期，让现有功能"真正可用"）**
1. 把 DeepSeek / Supabase / Resend 三个基础 key 填上线 —— 这是从"能跑 demo"到
   "能真实使用"的分水岭，目前没填的话核心体验都是降级版
2. 注册 Trip.com 联盟账号（[trip.com/partners](https://www.trip.com/partners)，免费自助，几小时到几天审核）换掉占位的 `CTRIP_AID`/`CTRIP_SID`，并申请美团联盟账号；同时验证 H5 深链参数格式是否准确
3. 跑通注册→验证邮箱→登录全流程，确认 Supabase 表结构

**中期（深化管家体验）**
4. Ask 页 "Add to Trip" 真正落地——把 AI 回复结构化存进具体行程，而不是一个提示弹窗
5. 扩大精选数据的城市覆盖（目前以北京/上海/成都为主）
6. 行程生成质量调优（地理位置聚类、避免同一天行程跨城市跳动）
7. 视觉系统迭代——当前正在评估新国风背景插画 + 主题色（楼阁/梅花/石桥风格）

**长期（看产品验证情况）**
8. 评估是否要求强制 Supabase（去掉本地 JSON fallback 的技术债）
9. 补自动化测试，尤其是涉及预订/支付决策的 `partners.py`
10. 如果用户量验证了"管家"模式，考虑落地页/签证流程/紧急求助的更深整合

> 这个项目几乎每个大版本都是**整体重写**而非增量迭代——产品负责人会拿外部设计稿
> （Claude Design 线框图）要求"照着这个改"。接手者应预期下一次设计稿可能又是
> 一次整体重写，不必对现有代码结构有过强依恋。详见 [`docs/HANDOFF.md`](docs/HANDOFF.md)。

## Architecture

| Layer    | Tech                                                   |
| -------- | ------------------------------------------------------ |
| Backend  | Python 3.11 stdlib (WSGI). HTTP via `urllib.request`.  |
| Frontend | Vanilla JS (ES modules) + CSS custom properties        |
| Hosting  | Vercel (`@vercel/python`)                              |
| Chat     | DeepSeek V4 Flash (`deepseek-chat`)                    |
| Translate| DeepSeek V4 Flash                                      |
| TTS      | Qwen3-TTS (Alibaba DashScope) — `qwen3-tts-flash`      |
| STT      | Qwen3-ASR (Alibaba DashScope) — `qwen3-asr-flash`      |
| Auth     | Email/password (PBKDF2-SHA256) + Google OAuth          |
| Email    | Resend                                                 |
| Storage  | Supabase REST (Postgres) + local JSON fallback (dev)   |
| Weather  | Open-Meteo (no key required)                           |

## Run locally

```bash
git clone https://github.com/JTCAO515/VP-Claude-Web.git
cd VP-Claude-Web
python -m api.index   # opens http://127.0.0.1:8765
```

The dev server uses `wsgiref` directly — no install, no dependencies.

For Vercel parity (full edge runtime + env-var resolution):
```bash
npx vercel dev
```

## Environment variables

All optional. The app boots with no keys; each integration degrades
gracefully when its key is absent.

| Variable                | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `DEEPSEEK_API_KEY`      | Chat + translation                                |
| `DEEPSEEK_BASE_URL`     | Default `https://api.deepseek.com`                |
| `DEEPSEEK_MODEL`        | Default `deepseek-chat`                           |
| `DASHSCOPE_API_KEY`     | Qwen3-TTS + Qwen3-ASR                             |
| `QWEN_TTS_MODEL`        | Default `qwen3-tts-flash`                         |
| `QWEN_TTS_VOICE`        | Default `Chelsie`                                 |
| `QWEN_ASR_MODEL`        | Default `qwen3-asr-flash`                         |
| `SUPABASE_URL`          | e.g. `https://abcd.supabase.co`                   |
| `SUPABASE_SERVICE_KEY`  | service-role key for server-side writes           |
| `SUPABASE_ANON_KEY`     | public anon key (reserved for future client use)  |
| `RESEND_API_KEY`        | sending verification emails                       |
| `RESEND_FROM`           | Default `VisePanda <hello@go2china.space>`        |
| `GOOGLE_CLIENT_ID`      | OAuth client id — from Google Cloud Console        |
| `GOOGLE_CLIENT_SECRET`  | OAuth secret                                      |
| `GOOGLE_REDIRECT_URI`   | Default `${APP_BASE_URL}/api/auth/callback`       |
| `AMAP_JS_KEY`           | 高德地图 (Amap) JS API key — used in Plan's map column |
| `AMAP_SECURITY_CODE`    | Amap's paired security code (safe to expose client-side per Amap's docs) |
| `AMAP_WEB_SERVICE_KEY`  | Amap **Web服务** key (different type from `AMAP_JS_KEY`) — server-side POI ratings |
| `CTRIP_AID`             | Trip.com (携程国际版) affiliate ID — ships with a generic default; register at [trip.com/partners](https://www.trip.com/partners) (free, self-serve) and swap in your own |
| `CTRIP_SID`             | Trip.com sub-affiliate ID — same as above |
| `MEITUAN_UNION_API_KEY` | 美团联盟 (Meituan Union) affiliate app key         |
| `MEITUAN_UNION_API_SECRET` | Meituan Union signing secret                  |
| `JWT_SECRET`            | 32+ char random hex; auto-generated if missing    |
| `APP_BASE_URL`          | Default `https://claude.go2china.space`           |
| `APP_ENV`               | `production` or `development`                     |

All of the above are placeholders in this repo (empty strings) — fill them
in via the Vercel dashboard under Project → Settings → Environment Variables,
then redeploy. None are required for the app to boot or to demo end-to-end.

**Fallback matrix:**

| Missing key            | Behavior                                          |
| ---------------------- | ------------------------------------------------- |
| `DEEPSEEK_API_KEY`     | Chat returns templated reply; itinerary Generate falls back to a 1-stop-per-day stub; Translate stub |
| `DASHSCOPE_API_KEY`    | TTS/STT fall back to Web Speech API in browser    |
| `SUPABASE_*`           | Dev: local JSON file; prod: auth endpoints 503    |
| `RESEND_API_KEY`       | Account auto-verified on register                 |
| `GOOGLE_CLIENT_*`      | "Continue with Google" button hidden              |
| `AMAP_JS_KEY`          | Plan's map column shows the striped placeholder + numbered pins instead of a live map |
| `AMAP_WEB_SERVICE_KEY` | Rating badges simply don't appear (not an error)  |
| `CTRIP_AID`/`CTRIP_SID` | Not applicable — these ship with working defaults, so Hotels/Transport always produce an attributed Ctrip H5 deep link out of the box |
| `MEITUAN_UNION_*`      | Group deals tool shows curated local data + a link to meituan.com |
| `JWT_SECRET`           | Per-process random secret (sessions reset on boot)|

### Booking & ratings — what's actually possible

Dianping has **no public API** for third parties to pull reviews or ratings
— that data requires a formal licensing deal with Meituan/Dianping. Meituan
itself doesn't expose an order-placement API to outside apps either. China's
domestic Ctrip Open Platform also **retired its callable search API**
(this changed mid-project — see CHANGELOG v8.4.0). What *is* realistically
available, and what this app integrates:

- **Trip.com (携程国际版) H5 deep links** — read Trip.com's actual API docs
  at connect.trip.com (June 2026) to confirm this. Their "Open platform"
  (Trip.com API / OpenTravel API) is **not a gated version of what we
  want — it's the wrong API entirely**: it's a hotel/PMS *supply-side*
  connectivity API. Hoteliers and channel-manager companies use it to
  push room content/rates/availability *into* Trip.com and receive
  reservation pushes back — not for third-party apps to *query* Trip.com's
  inventory. It also requires a signed business cooperation agreement and
  uses SOAP+XML (OTA 2015B) with partner credentials Trip.com issues to
  already-onboarded hotel companies. So even with a deal, it wouldn't do
  what we want. The **Trip.com Affiliate Program** (trip.com/partners) is
  the only path that's actually useful here: free, self-serve, approved
  within hours/days, hands you a tracked deep-link ID (not a query API).
  `api/partners.py`
  builds H5 deep links (hotel list, hotel detail, train list, flight list)
  with the affiliate ID baked into the query string via `CTRIP_AID`/`CTRIP_SID`
  (generic defaults already set — see env var table above); the user taps
  through and completes checkout on Trip.com's own page. ⚠️ The exact
  query-parameter names are a best-effort reconstruction from Trip.com's
  public affiliate docs, not yet confirmed against a real generated link —
  see `api/partners.py` for the verification note.
- **美团联盟 (Meituan Union)** — still a callable affiliate/CPS API (as of
  this writing). Search their group-buy inventory and generate a tracked
  deep link. Apply at [union.meituan.com](https://union.meituan.com).
- **Amap (高德地图) POI ratings** — used as the realistic substitute for
  Dianping ratings. Amap's own POI search returns a `rating` field for
  dining/attraction categories, sourced from its own review data.

Without `MEITUAN_UNION_*` configured, `api/partners.py` returns curated
local data (already in `api/dashboard.py`) plus a safe, untracked link to
Meituan's site — never a guessed or fabricated deep-link URL. Ctrip links
work out of the box (default AID/SID), independent of any key.

### Setting up Google Sign-In

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an OAuth 2.0 Client ID (type: Web application).
2. Authorized redirect URI: `https://claude.go2china.space/api/auth/callback`
   (or your `APP_BASE_URL` + `/api/auth/callback`).
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel.
4. Redeploy — the "Continue with Google" button appears automatically once
   `has_google` flips true in `/api/config/public`.

### Setting up Amap (高德地图) for the Plan map

1. Register at [console.amap.com](https://console.amap.com/) and create a
   **Web端 (JS API)** application key.
2. Amap's JS API requires a paired "安全密钥" (security code) for v2.0+ —
   copy both into `AMAP_JS_KEY` and `AMAP_SECURITY_CODE` in Vercel.
3. Redeploy. Plan's map column lazy-loads the Amap SDK only when a key is
   present (see `web/js/map.js`); with no key it shows the original striped
   placeholder with numbered pins, so the UI never breaks while waiting on
   a key.

## Supabase setup

When you provision a Supabase project, run this once in the SQL editor:

```sql
-- The full SQL is in api/storage.py (constant SCHEMA_SQL).
-- It creates: users, itineraries, favorites, chat_sessions, chat_messages.
```

Then set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in Vercel and redeploy.

## API surface

```
GET  /api/health
GET  /api/config/public
POST /api/auth/register          { email, password, name? }
POST /api/auth/login             { email, password }
POST /api/auth/verify            { email, code }
POST /api/auth/verify/resend     { email }
GET  /api/auth/google            → 302 to Google consent
GET  /api/auth/callback          OAuth callback
GET  /api/auth/profile
POST /api/auth/logout
DELETE /api/auth/account
POST /api/chat                   { message, history?, session_id? }
POST /api/translate              { text, direction: 'en->zh' | 'zh->en' }
POST /api/tts                    { text, voice?, model? } → audio/mpeg
POST /api/stt                    (multipart: audio file)  → { text }
GET  /api/translations           → categories + counts + data
GET  /api/translations/<slug>    phrases | attractions | culture | dining
GET  /api/cities                 → { cities: [...] }
GET  /api/cities?id=<id>
GET  /api/hotels?city=<id>
GET  /api/deals?city=<id>
GET  /api/tools
GET  /api/tools?id=<id>
GET  /api/maps?city=<id>
GET  /api/weather?lat=&lon=
GET  /api/itinerary              scratch itinerary (no trip bound)
PUT  /api/itinerary              { days: [...] }
POST /api/itinerary/generate     { cities, day_count, pace?, travelers? } → DeepSeek-drafted days
GET  /api/trips                  → { trips: [...] }
GET  /api/trips/<id>
POST /api/trips                  { name, start_date?, day_count?, cities?, status? }
PUT  /api/trips/<id>             { ...any of: name, start_date, day_count, cities, status, progress, days }
DELETE /api/trips/<id>
GET  /api/favorites?kind=<kind>
POST /api/favorites              { kind, ref_id, payload? }
DELETE /api/favorites/<id>
GET  /api/chat-history
GET  /api/chat-history/<id>
GET  /api/partners/hotels?city=<id>&checkin=&checkout=
GET  /api/partners/transport?from=&to=&date=&mode=train|flight
GET  /api/partners/deals?city=<id>
GET  /api/ratings?city=<id>&category=hotel|dining|attraction
```

All JSON responses are `{ ok: true, ...data }` or
`{ ok: false, error: "human-readable string", code?: "machine_code" }`.

## Project layout

```
api/                       WSGI handlers + integrations (stdlib only)
data/translations/         Curated EN/中 phrase library (preserved from v6)
docs/HANDOFF.md            Full project handoff — history, intent, roadmap, gaps
docs/VERCEL_KEYS_GUIDE.md  Non-technical env var setup guide (Chinese)
docs/superpowers/          Historical spec/plan docs (v7 design — superseded by
                           the v8 sidebar IA; kept for archaeology, not current truth)
web/                       Static SPA — vanilla JS + CSS
vercel.json                Routes /api/* → api/index.py, /web/* → static
```

## License

Private project.

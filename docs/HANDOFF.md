# VisePanda — 项目交接文档 (HANDOFF)

**写给**：接手这个项目的下一个人，或者下一个 coding AI session（包括"未来的我"——下次对话开始时记忆是空的，全靠这份文档重建上下文）。

**最后更新**：2026-06-25，对应版本 v8.4.x，commit 范围从 v7.0.0 重写到当前。

---

## 1. 这是什么项目，为什么做

**VisePanda（视野）** 是一个给**来中国旅行的外国人**用的 AI 旅行管家网站，部署在 **https://claude.go2china.space**。

用户（项目owner，下文称"产品负责人"）的核心意图：
- 做一个**英文原生、移动优先**的 PWA，帮外国游客解决"刚到中国第一小时"的痛点：看不懂中文、不会用本地 App、不知道怎么订酒店/交通、不会讨价还价/点餐。
- 核心三件套：**AI 问答**（DeepSeek）、**实时翻译**（Qwen3 语音/文字）、**行程规划+预订**（携程/美团联盟 + 高德地图）。
- 产品负责人本人不写代码，所有开发都是用自然语言指挥 Claude Code 完成的——这意味着**这份文档需要写得足够清楚，让任何人接手都不用反复问"为什么这样设计"**。

---

## 2. 这个项目走过的几个大版本（背景，帮你理解现状为什么是这样）

| 版本 | 发生了什么 |
|---|---|
| v6.x | 早期版本，三 tab（Chat/Dashboard/Translate），中国风视觉（宣纸白+青花蓝+朱砂印章）。已被完全推翻重写。 |
| v7.0.0 | **从零重写**。同样的中国风视觉系统，但 IA 改成 Chat 主屏 + Translate 浮动按钮 + Dashboard 抽屉。 |
| v7 round 1-2 | UX 打磨：safe-area、动画、错误重试、印章 stamp 动效。期间发现并修复了一个真实部署 bug（Vercel 路由配置错误导致整站 404）。 |
| **v8.0.0** | 产品负责人在 **Claude Design**（claude.ai/design）里画了一套新线框图（"VisePanda Wireframes v2"），按 Claude-风格左侧栏 IA 重新设计：**Ask / Plan / Cities / Tools / Trips** 五个 tab，视觉换成暖米色+terracotta（陶土红）+ Caveat 手写体。**整个前端被推翻重写**，旧的中国风视觉系统（印章、宣纸纹理）全部删除。 |
| v8.1.0 | 补齐 v8 重写时留下的占位功能：修了一个关键 bug（登录面板因为用 `<dialog>` 标签但没调 `.showModal()`，从 v7 到 v8 一直不可见）；加了城市选择抽屉、Plan/Trip 数据模型、高德地图、DeepSeek 行程生成、Cities 详情页、Translate 面板复原。 |
| v8.2.0 | 接入携程联盟（酒店/交通预订深链）、美团联盟（团购深链）、高德 POI 评分（替代大众点评——点评没有公开 API）。 |
| v8.3.0 | 合并 Plan+Trips 为一个 tab；Cities 详情页改为 Hotels/Dining/Attractions 三分类浏览；新增 `docs/HANDOFF.md` 和 `docs/VERCEL_KEYS_GUIDE.md` 两份交接文档。 |
| v8.4.0 | **携程联盟中途取消了可调用的查询接口**，改成"URL生成工具"（不需要账号审核，直接拼接 H5 链接）。重写 `api/partners.py` 的携程部分，配置从 `CTRIP_UNION_API_KEY/SECRET/PID` 换成 `CTRIP_AID/SID`（默认值已内置，开箱即用）。同步修正了 README/HANDOFF/VERCEL_KEYS_GUIDE 三处仍描述旧 API 模式的文档。 |
| **当前这次改动** | 见下方"本次工作"。 |

**关键认知**：这个项目几乎每次大版本都是**整体重写**，不是增量迭代。原因是产品负责人会拿着外部设计稿（Claude Design 线框图）要求"照着这个改"，而不是在现有 UI 上微调。**接手的人要有心理准备**：下一次产品负责人甩一个新设计稿过来，可能又是一次大重写，不要对现有代码结构有过强的依恋。

---

## 3. 当前架构速览（v8.4.x）

```
VP-Claude-Web/
├── api/                    Python 3.11 stdlib WSGI 后端（零第三方依赖，HTTP全用urllib）
│   ├── index.py            路由总入口，所有 /api/* 请求先到这里
│   ├── config.py           所有环境变量 + has_xxx() 开关函数（核心文件，新功能先看这个）
│   ├── common.py           JSON响应/JWT/密码哈希/HTTP请求等工具函数
│   ├── storage.py          用户数据存储抽象层（Supabase REST 或本地JSON二选一）
│   ├── auth.py             注册/登录/验证码/Google OAuth/账号管理
│   ├── chat.py             DeepSeek 聊天
│   ├── translate.py        DeepSeek 翻译
│   ├── tts.py / stt.py     Qwen3 语音合成/识别（阿里 DashScope）
│   ├── dashboard.py        城市/酒店/团购/工具 的精选静态数据 + 天气代理
│   ├── itinerary.py        行程存储 + DeepSeek 行程生成
│   ├── trips.py            已保存行程的 CRUD
│   ├── favorites.py        收藏（被 trips.py 复用存储）
│   ├── partners.py         携程联盟/美团联盟 深链生成（有key走真实API，没key走精选数据+安全链接）
│   ├── ratings.py          高德 POI 评分查询
│   ├── google_oauth.py     Google OAuth 流程
│   └── email_resend.py     Resend 邮件发送
├── web/                    纯前端，Vanilla JS（ES modules，无打包工具）+ CSS 变量
│   ├── index.html          唯一HTML文件，SPA
│   ├── sw.js               Service Worker（缓存shell，记得改动后改CACHE版本号）
│   ├── css/                tokens.css是设计变量源头，改色系/字体先改这个
│   └── js/
│       ├── app.js          路由器，5个tab的mount/unmount逻辑都在这
│       ├── sidebar.js      左侧栏导航
│       ├── ask.js / plan.js / cities.js / tools.js / trips.js   五个tab各自的视图
│       └── components/     可复用组件：sheet.js（通用弹窗）、citypicker.js、translate-panel.js、booking-panel.js
├── data/translations/      手工维护的中英短语库（phrases/dining/attractions/culture.json）——**从v6传到现在，从未重写过，是最稳定的资产**
└── docs/                   各种文档（spec/plan/这份HANDOFF/Vercel指南）
```

**部署**：GitHub `JTCAO515/VP-Claude-Web` main 分支 → Vercel 自动部署 → `claude.go2china.space`。**所有改动直接推 main，没有 PR 流程**（这是产品负责人明确要求的工作方式）。

**核心设计哲学**（贯穿全部代码，新代码也要遵守）：
1. **每个外部依赖都要能优雅降级**。没填 API key 不能让网站坏掉，必须有 fallback（本地数据/Web Speech API/静态链接）。看 `config.py` 的 `has_xxx()` 系列函数和每个 endpoint 里的 if/else 分支就懂这个模式。
2. **不编造没验证过的东西**。比如携程/美团的"联盟 API"具体请求格式我没有最新文档，代码里写了 best-effort 的签名调用 + 明确注释"需要拿到真实账号后对照文档验证"，绝不假装这是确认可用的代码。深链 URL 只用确认稳定的顶层路径（如 `trip.com/hotels/`），不猜测带参数的深层链接。
3. **Vercel 上 `@vercel/python` 只打包 Python 文件**。`vercel.json` 里用 `includeFiles` 把 `web/` 和 `data/translations/` 一起打进 function，所有请求统一走 WSGI app 的 `_serve_static`。如果以后要加新的静态资源目录，记得检查这里，不然会 404。

---

## 4. 版本历史中各轮做了什么（按时间顺序，最新在最后）

**v8.2.0 → v8.3.0 这轮**，产品负责人提了 4 件事，全部已完成并部署：

1. **三平台接入能力说明 + 接入携程联盟/美团联盟/高德评分**（v8.2.0）——写在 CHANGELOG 里。
2. **Vercel key 填写指南**（小白向）→ `docs/VERCEL_KEYS_GUIDE.md`。
3. **这份 HANDOFF 文档**首次创建。
4. **合并 Plan + Trips 为一个 tab**，**Cities 详情页加酒店/餐厅/景点三分类浏览**。

**v8.4.0 这轮**（产品负责人反馈"携程取消了 API 接口，现在用 URL 生成工具"）：

1. 重写 `api/partners.py` 的携程部分，从"调用接口"改成"拼接 H5 链接"。
2. `api/config.py` 配置项替换：`CTRIP_UNION_API_KEY/SECRET/PID` → `CTRIP_AID/SID`（带默认值）。
3. `web/js/components/booking-panel.js` 补充入住/退房日期字段、火车/机票分开的子表单。
4. **同步检查并修正了三份文档**（README/HANDOFF/VERCEL_KEYS_GUIDE）——这三份都还停留在描述旧 API 模式，是一个典型"文档跟不上代码"的真实案例：上一轮改了 `api/partners.py` 和 `api/config.py`，但没有同步检查引用了旧配置名的文档，导致 `CTRIP_UNION_API_KEY` 这种已经不存在的变量名继续留在三份文档里。**教训**：以后任何"换掉一个外部依赖的对接方式"的改动，做完代码后要单独跑一遍 `grep` 搜索旧变量名/旧术语，确认所有文档都同步了，不能只更新动代码时顺手碰到的那一份。

---

## 5. 已知不足 / 故意没做的事（重要，别重复踩坑）

| 不足 | 为什么没做 | 如果要做，怎么做 |
|---|---|---|
| 携程的对接方式中途变了一次，且实际读了 Trip.com 开发者文档（connect.trip.com）确认了方向 | 国内携程联盟**取消了原来可调用的查询接口**。直接读了 Trip.com（携程国际版）开放平台的"Trip.com API"和"OpenTravel API"文档原文后确认：那套 Open Platform **根本不是"门槛高的同款 API"，而是方向完全错误的 API**——它是给酒店/PMS 系统用来把房源/价格"推送进"Trip.com 的供应商对接接口（SOAP+XML，OTA 2015B 标准，需要签商务合作协议，认证用的 `CodeContext` 是 Trip.com 单方面分配给已合作酒店公司的），不是给第三方应用"查询"Trip.com 库存用的。哪怕谈成商务合作也解决不了"帮用户搜酒店生成预订链接"这个需求。**唯一真正有用的路是 Trip.com 联盟**（trip.com/partners，免费自助注册），但它给的也只是深链 ID，不是查询接口。`api/partners.py` 里的 `_ctrip_url` 按规则拼接 H5 链接，系统内置了通用占位 `CTRIP_AID`/`CTRIP_SID`。**链接里具体的参数名称还没有用真实账号验证过**，是按 Trip.com 公开文档反推的最佳猜测。 | 产品负责人去 [trip.com/partners](https://www.trip.com/partners) 注册（免费，几小时到几天审核），拿到自己的 Affiliate ID 换掉占位默认值；并在联盟后台用他们的"URL生成工具"手动生成 4 种类型（酒店列表/酒店详情/火车票/机票）各一条示例链接，对照 `api/partners.py` 里的参数名核实，不一致就改。**不要再尝试走 connect.trip.com 的 Open Platform**，那是死胡同，方向不对。 |
| 美团联盟 API 的真实请求签名格式**未经验证** | 美团这边目前还是可调用的查询接口（不像携程已经取消），但这个平台需要申请审核才能拿到账号，我没有真实账号去对照最新文档调试。代码里是 best-effort 实现 + 明确注释。 | 等产品负责人申请到账号后，把 `api/partners.py` 里 `_meituan_deal_search` 函数对照官方最新文档重新核对字段名和签名算法。 |
| 大众点评评分/评论 | **没有公开 API**，第三方拿不到，除非签商务数据协议。 | 用高德 POI 评分（`api/ratings.py`）作为替代，已经接好。除非产品负责人真的谈下点评的商务合作，否则不要再尝试"接点评 API"。 |
| Ask 页面的"+ Add to Trip"按钮 | 目前只是弹窗提示，没真正把AI回复内容存进某个行程。 | 需要设计：AI回复里的什么内容算"一个行程项"？存到哪个trip？这是个产品判断，建议先问产品负责人要哪种交互，再实现。 |
| Plan 的 "Generate"/"Optimize" 按钮 | 已经接了 DeepSeek 结构化生成（`/api/itinerary/generate`），但没有真实数据验证过 DeepSeek 返回的 JSON 质量（没填key时只能看到本地fallback）。 | 等 `DEEPSEEK_API_KEY` 填了之后实测几次，看 prompt 需不需要调。 |
| Cities/Tools 里所有的"精选数据"（酒店/团购/景点） | 是我手写的几个示例城市的样例数据（北京/上海/成都为主），**不是真实抓取的**，纯粹是为了让没有 key 时界面不空。 | 如果要扩展更多城市的精选内容，得手动在 `api/dashboard.py` 里加，或者等携程/美团 key 接好后用真实数据自动覆盖。 |
| 测试覆盖 | **零自动化测试**。所有验证都是我手写 Python smoke script + Playwright 浏览器手测，没有 pytest/CI。 | 如果项目要长期维护，建议补一套基础测试，尤其是 `api/storage.py` 和 `api/trips.py` 的逻辑分支较多，容易在改动时悄悄出 bug。 |
| Supabase 表结构 | SQL 写在 `api/storage.py` 的 `SCHEMA_SQL` 常量里，**从未在真实 Supabase 项目里跑过验证**（产品负责人还没填 Supabase key）。 | 第一次配置 Supabase 时，跑这段 SQL 后记得测一遍注册/登录全流程，确认表结构没问题。 |

---

## 6. 产品负责人的工作习惯（帮你预判下一步沟通）

- **不写代码，纯自然语言指挥**，经常一句话提多个需求点（"还需要...，并且...，将...合并，...也要做"），需要自己拆解成任务列表执行，不需要每件事都反复确认——这是被验证过的协作模式（参考前几轮对话，几乎没有被要求"先问清楚再做"）。
- **会拿外部设计稿要求照做**（用过 Claude Design 线框图）。如果未来又甩一个新链接/截图，大概率是要求"整体换皮"，按这个预期规划工时。
- **要求每次改动验证后直接 push 到 main**，不需要开 PR 等审核。
- **对"能不能真的接上"很敏感**——上一轮主动问清楚了携程/美团/点评三个平台的真实能力边界，而不是要求"随便接一下能跑就行"。**这意味着以后遇到不确定能否真实集成的外部服务，应该主动说清楚现实情况，而不是写一个看起来能用但实际拿不到数据的假集成。**
- 偏好**中文沟通**，但代码注释/commit message 用英文（项目内一直是这个混合模式）。

---

## 7. 后续迭代路线图建议

按优先级排序，这是我（执行方）基于当前代码状态给出的建议，供产品负责人参考取舍：

### 短期（让现有功能真正可用）
1. **去 Supabase/DeepSeek/Resend 把基础三个 key 填上**——没有这些，整个产品的"AI管家"核心体验都是降级版。`docs/VERCEL_KEYS_GUIDE.md` 已经写好步骤。
2. **注册 Trip.com 联盟账号 + 申请美团联盟账号**——Trip.com 联盟（trip.com/partners）免费自助注册，几小时到几天就能通过，注册后顺手核实一下 H5 链接参数对不对；美团联盟审核周期更长，越早申请越好，不然团购预订功能一直停留在"精选数据+通用链接"阶段。
3. 用真实 key 测一遍**注册→验证邮箱→登录→Google登录**全流程，确认 Supabase 表结构没问题。

### 中期（深化核心体验）
4. **Ask 页的 "Add to Trip" 真正落地**——这是 AI 问答和行程规划之间的桥梁，目前是断的。
5. **扩充精选数据的城市覆盖范围**——目前主要覆盖北京/上海/成都，可以加更多热门城市。
6. **行程生成质量调优**——填了 DeepSeek key 之后实测 `/api/itinerary/generate` 的输出质量，可能需要调 prompt 或加约束（比如避免同一天行程地理位置太分散）。

### 长期（看产品方向）
7. 如果用户量上来了，**评估是否需要把 `data/auth.db.json` 本地fallback完全去掉**，强制要求 Supabase（现在的双轨设计是为了方便没配置时也能跑demo，但长期看是技术债）。
8. **补自动化测试**，尤其是涉及金钱/预订相关的 partners.py 逻辑。
9. 如果产品负责人又拿到新设计稿——按惯例，准备迎接下一次整体重写，不用纠结"要不要保留现有结构"。

---

## 8. 如果你是接手的 AI，建议的启动检查清单

1. `git log --oneline -20` 看最近改动，对照这份文档确认现状一致。
2. 跑 `python -c "from api.index import app"` 确认后端能正常 import（没有语法错误）。
3. 打开 https://claude.go2china.space/api/config/public 看哪些 key 已经填了，哪些还是占位符——这决定了你能测哪些功能的"真实路径"还是"fallback路径"。
4. 改前端记得：**改完 `web/sw.js` 里的 `CACHE` 版本号**（不然 Service Worker 会让用户看到旧版本缓存）。
5. 改完直接 `git push origin main`，Vercel 会自动部署，~60秒后用 `curl https://claude.go2china.space/sw.js | grep <你改的版本号>` 确认部署完成再做浏览器验证。
6. 不确定某个外部服务是否真的有公开 API 可以接——**先说清楚现实情况，别为了"看起来完成了"而编造一个不存在的集成**。这是产品负责人非常看重的一点。

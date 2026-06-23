# VP-Claude-Web 重写说明 v7.0.0

> 日期：2026-06-23
> 分支：`claude/friendly-dirac-sn2iet`

本文件取代此前的 v2.0 优化报告。v7.0.0 是一次彻底的从零重写（不是对旧代码的增量修补），因此旧报告中针对 v6.2.1 代码的具体行号问题（`api/visa.py`、`web/app.js`、`web/admin.html` 等）已随旧代码一并删除，不再适用，故不保留。本文件记录这次重写的范围、架构决策、复用边界，以及对新代码的实测验证结果。

---

## 重写范围

- **完全删除**：`web/`（`admin.html`、`app.css`、`app.js`、`index.html`、`manifest.json`、`sw.js`）、`api/`（`auth.py`、`chat.py`、`cities.py`、`common.py`、`config.py`、`deals.py`、`health.py`、`hotels.py`、`index.py`、`maps.py`、`tools.py`、`translations.py`、`visa.py`）、`tests/`、`web/tests/`。这些目录在重写前未被读取或参考，重写后的同名文件是独立实现。
- **保留并复用**：`data/` 下的全部 JSON 知识库文件（`cities.json`、`city_images.json`、`hotels.json`、`hotels/hotels.json`、`deals/deals.json`、`translations/*.json`、`tools.json`、`tips.json`、`faq.json`、`visa_policies.json`）、`static/` 下的图片资源、`web/icon-192.png`、`web/icon-512.png`、`web/icon-maskable-512.png`、平台约束文件 `vercel.json` 与 `requirements.txt`。
- **作为知识参考但未照搬代码**：`PRD_PRODUCT_ANALYSIS.md`、`DESIGN.md`、`HANDOFF.md`、`PLAN.md`、`CONTEXT.md`、`README.md` 中描述的产品定位、三栏 IA（Chatbot / Dashboard / Translation）、Phase 1 / 1.5 范围。这些文档本身未在本次重写中更新，仍反映旧实现的部分细节（例如旧的 API 列表），后续若要保持一致需要单独修订。

## 架构决策

- **后端**：保持 stdlib-only 的 WSGI 应用（与 `vercel.json` 的 `@vercel/python` + 全路径捕获路由约束一致），但内部结构从单文件式模块重组为 `api/lib/`（数据访问、HTTP 原语、DeepSeek 客户端、Amap 客户端、静态文件解析）+ `api/routes/`（按资源拆分的路由模块）。`api/index.py` 现在同时承担两件事：非 `/api/` 路径走静态文件解析器直接读盘返回，`/api/` 路径交给 `Router.dispatch()`。
- **前端**：原生 ES Module，无构建步骤，三个 `role="tabpanel"` 区块共享同一个 `<main>`，通过 `hidden` 属性切换，避免整页跳转。Dashboard / Translate 面板首次激活时才请求后端数据（`main.js` 的 `loadedOnce` 集合），保持默认 Chat 视图的初始加载速度。
- **视觉设计**：放弃“大红灯笼”式中国风，改为留白克制的水墨/瓷器配色（青花蓝 `--porcelain`、宣纸白 `--paper`、墨黑 `--ink`、朱砂红 `--vermillion` 点缀），标题使用衬线字体（Source Serif 4 / Noto Serif SC）营造书法感，正文使用 Inter 保证可读性。深色模式通过 `prefers-color-scheme` 覆盖同一组 CSS 变量实现，不需要额外的主题切换逻辑。
- **持久化**：不引入数据库，行程草稿、翻译历史、最近提问均存于浏览器 `localStorage`，键名加了 `_v7` 后缀以避免与旧版本数据冲突或被误读。

## 实测验证

通过直接构造 WSGI `environ` 字典调用 `api.index:app`（不依赖外部 HTTP 服务器）逐一验证了以下路由，均返回预期的状态码与 JSON 结构：

| 路由 | 方法 | 结果 |
| --- | --- | --- |
| `/api/health` | GET | 200，含 DeepSeek/Amap 配置状态（未配置密钥时为 `fallback`） |
| `/api/cities` / `/api/cities?featured=1` / `/api/cities/<id>` | GET | 200 |
| `/api/hotels/search` / `/api/hotels/detail?id=` / `/api/hotels/book` | GET/GET/POST | 200/200/201 |
| `/api/deals/search` / `/api/deals/detail?id=` | GET | 200 |
| `/api/translations` / `?category=&q=` 过滤 | GET | 200 |
| `/api/tools` / `/api/tools/visa?nationality=` | GET | 200 |
| `/api/maps/geocode?q=` / `/api/maps/place?q=` | GET | 200（未配置 `AMAP_KEY` 时回退到本地景点数据） |
| `/api/chat`（无 `DEEPSEEK_API_KEY`） | POST | 200，自动走 `deepseek.local_answer()` 本地兜底回答 |
| `/`、`/web/css/app.css`、`/web/js/*.js` | GET | 200，经 `api/lib/static.py` 直接读盘返回 |
| 未知路径 | GET | 404，JSON 格式错误体 |

此外对 `web/js/*.js` 全部模块执行了 `node --check` 语法检查，未发现语法错误。

## 已知限制 / 后续建议

- 当前没有恢复任何自动化测试套件（旧的 `tests/` 与 `web/tests/` 已随旧代码删除）。建议下一轮迭代针对 `api/lib/http.py` 的 `Router` 匹配逻辑与 `api/routes/*` 的关键分支补充新的契约测试。
- `DEEPSEEK_API_KEY` / `AMAP_KEY` 均未在本环境配置，所有相关路由验证的是本地兜底路径；真实凭据下的流式响应与高德地图实测结果未覆盖，建议在配置好密钥的环境中补测一次。
- `PRD_PRODUCT_ANALYSIS.md`、`DESIGN.md`、`HANDOFF.md`、`CONTEXT.md`、`README.md` 仍描述旧版 API 列表与架构图，未随本次重写同步更新；它们被用作产品知识参考，但其中的技术细节已与当前实现不一致。

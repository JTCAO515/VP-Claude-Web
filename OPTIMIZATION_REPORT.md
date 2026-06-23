# VP-Claude-Web 优化报告 v2.0
> 审查日期：2026-06-23

本报告基于对当前代码库（分支 `claude/friendly-dirac-sn2iet`，与 `main` 无差异）的全量人工审查，覆盖项目文档（README/HANDOFF/CONTEXT/PLAN/DESIGN/PRD/CHANGELOG/AGENTS）、后端 `api/*.py` 全部模块、前端 `web/index.html`、`web/app.js`（1115 行）、`web/app.css`、`web/sw.js`、`web/admin.html`。

> **方法说明**：本仓库已安装的 `code-review` 与 `security-review` Skill 均为基于 git diff 的审查工具（依赖 `git diff origin/HEAD...` 等比较）。经核实，当前分支与 `main` 之间没有任何代码差异（`git diff main...HEAD --stat` 为空，且未配置 upstream），因此这两个 Skill 在“全仓库审查”场景下没有可比较的 diff，无法产生有效输出。本报告改为对全仓库进行人工静态审查，并对关键路径进行了本地实际运行验证（启动 WSGI 服务并用 curl 实测）。同时执行了现有自动化测试：`python3 -m unittest discover -s tests` 21/21 通过，`node --test web/tests/*.test.js` 24/24 通过——现有测试套件未覆盖本报告中发现的问题。

> v1.0 报告中列出的问题（SSE JSON 解析无保护、Quick Planner `values.length`、`api()` 无超时、`addMessage` span 选择不精确、`restoreSession` 静默失败等）经本次核实，均已在当前 v6.2.1 代码中修复，故不再重复列出；v1.0 报告中的 U1（DESIGN.md 暗色系统未实现）也已失效——当前 DESIGN.md 已改写为描述现有的浅色蓝/橙主题，文档与实现已一致。

---

## 🐛 Bug 清单

### P0 严重缺陷

**P0-1. `/api/visa/generate` 对非数字输入未捕获异常，导致 HTTP 500（已实测复现）**
- 文件：`api/visa.py:77`；根因：`api/index.py` 全局无统一异常处理
- 说明：`duration = int(body.get("durationDays") or body.get("duration") or 7)` 没有 try/except 包裹。当客户端传入 `durationDays` 为非数字字符串（如 `"not-a-number"`）时，`int()` 抛出 `ValueError`，该模块的 `dispatch()` 没有捕获，`api/index.py` 中也没有任何全局异常兜底（对比 `api/auth.py:708-751` 的 `dispatch()` 是仓库中唯一一个对 `ValueError` 做了 try/except 返回 400 JSON 的模块）。
- 实测复现：
  ```
  curl -X POST http://127.0.0.1:8765/api/visa/generate \
    -d '{"durationDays":"not-a-number","nationality":"us"}'
  → HTTP_CODE:500
  → body: "A server error occurred.  Please contact the administrator."
  ```
  返回的是 WSGI 服务器的纯文本错误页，而不是项目统一的 JSON 错误格式（`{"error": {...}}`），破坏了前端 `api()` 助手函数预期的响应契约。
- 影响：任意可被外部传入非数字 `durationDays` 的请求（恶意或误用客户端均可触发）都会导致 500，且无结构化错误信息，客户端无法优雅处理。

### P1 功能问题

**P1-1. 当前 UI 完全没有“创建/保存行程”的入口，`saveTrip()` 是死代码**
- 文件：`web/app.js:851`（`saveTrip()` 函数定义）、`web/app.js:983`（绑定到 `#tripForm`）；`web/index.html` 中**不存在** `#tripForm` 元素
- 说明：`$("#tripForm")?.addEventListener("submit", ...)` 使用了可选链，因此不会抛运行时错误，但由于 `#tripForm` 在当前 `web/index.html`（v6.2.1，Cities/Map/Tools/Trips 已被收纳进 Dashboard）中已不存在，这段事件绑定永远不会被触发。当前唯一与行程相关的可见 UI 是 `#dashboardTripsList`（由 `loadDashboardTrips()` 渲染），它只是**展示**本地已保存的行程，没有任何创建路径。
- 影响：README.md / PLAN.md / HANDOFF.md 中描述的“保存行程”是用户可见的核心功能点之一，但实际产品中用户没有任何方式新建一条行程记录——这是一个真实的功能缺口，而非单纯的死代码清理问题。

**P1-2. 移动端键盘弹出时，Translate 标签页的底部导航未隐藏，可能遮挡输入控件**
- 文件：`web/app.css:2123`（`body[data-view="chat"].is-chat-composing .nav { opacity: 0; ... }`）；`web/app.js:973-974`（仅对 `#chatInput` 绑定 focus/blur 来添加/移除 `is-chat-composing`）
- 说明：隐藏底部导航的 CSS 规则只作用于 `body[data-view="chat"]`，且 `is-chat-composing` 类只在 `#chatInput`（Chat 面板的文本框）获得/失去焦点时才会被添加/移除。`web/app.js:944` 处的 `$("#translationInput").value` 显示 Translate 面板也有一个可输入的多行文本框（`#translationInput`），但没有任何代码在它 focus/blur 时切换 `is-chat-composing`（或等价类），也没有对应 `body[data-view="translate"]` 的导航隐藏 CSS 规则。
- 影响：在移动端（≤560px，固定定位的底部导航）打开 Translate 面板并点击文本框唤起系统键盘时，底部导航不会像在 Chat 面板一样自动隐藏，存在遮挡输入区域/发送按钮的风险，违反 DESIGN.md 中“Bottom nav must not cover core controls”的明确设计约束。

**P1-3. `web/admin.html` 管理员登录与删除用户操作没有任何错误反馈**
- 文件：`web/admin.html:68-76`（`#adminLogin` 表单 submit 处理）、`web/admin.html:55-58`（用户删除按钮 click 处理）
- 说明：两处都是 `await adminApi(...)` 直接调用，没有 try/catch，也没有 `.catch()`。对比同文件第 77-79 行的 `#loadUsers` click 处理器，正确地写了 `.catch((error) => { status.textContent = error.message; })`。
  - 登录失败（如密码错误）时，`adminApi` 内部 `throw new Error(...)`（第 39 行）会变成未处理的 Promise rejection，`#adminStatus` 文本永远不会更新，管理员看不到任何失败提示。
  - 删除用户失败时（例如管理员尝试删除自己的账号——`api/auth.py` 的 `admin_delete_user()` 明确会以 400 `cannot_delete_self` 拒绝该操作），同样没有任何 UI 反馈，错误被静默吞掉。
- 影响：管理后台在出错时缺乏可观察性，调试和实际运维都会受阻。

**P1-4. 登录/注册限流基于进程内全局字典，在无服务器部署环境下基本失效 [推断]**
- 文件：`api/auth.py:212-220`（`check_rate(key, limit=6, window=300)`，使用模块级全局变量 `_ATTEMPTS = {}` 记录尝试次数）
- 说明：`_ATTEMPTS` 是一个保存在 Python 进程内存中的字典。项目部署目标为 Vercel 无服务器函数，每次调用可能落在不同的、刚冷启动的进程实例上，进程间不共享内存，旧实例也可能随时被回收，因此 `_ATTEMPTS` 起到的限流效果在生产环境中并不可靠（标记为 `[推断]`，因为具体的 Vercel 函数复用策略未在本仓库配置中确认，存在“同一实例被多次复用从而限流部分生效”的可能性，但整体上不能保证限流稳定有效）。
- 影响：暴力破解登录密码/验证码等防护可能形同虚设，是安全相关的可靠性问题。

### P2 轻微问题

**P2-1. 聊天流式响应中断时会覆盖已经成功流式输出的部分内容**
- 文件：`web/app.js:793-795`
  ```js
  } catch (error) {
    target.textContent = "I could not reach the guide service. Please try again.";
    showToast(error.message, "error");
  }
  ```
- 说明：SSE 解析本身有完善的 try/catch（第 778-783 行 `JSON.parse` 包裹），符合预期。但如果在已经流式输出了若干 token 之后网络中断或服务端报错，外层 catch 会把 `target.textContent` 整段替换为通用错误文案，丢弃用户已经看到/已经生成的部分回答内容，且没有任何重连尝试。
- 影响：用户体验上造成“已经看到的内容突然消失”的困惑，尤其是长回答场景下损失更明显。

**P2-2. 翻译/酒店/优惠数据每次请求都重新读取 JSON 文件，无任何缓存**
- 文件：`api/translations.py`（`api_translation_payload()`，对 `phrases`/`dining`/`attractions`/`culture` 四个 JSON 文件，每次请求各调用一次 `load_json()`）、`api/hotels.py`（`_load_hotels()`）、`api/deals.py`（同构函数）；底层 `api/common.py` 中的 `load_json()` 本身不做任何缓存。
- 说明：对比 `api/health.py` 中 `deepseek_health()` 已经实现的 60 秒内存缓存模式（`_CACHE` 字典），翻译/酒店/优惠这三个模块完全没有采用同样的缓存策略，数据是静态文件、变化频率低，却在每个请求上都触发磁盘 I/O。
- 影响：在高频访问或无服务器冷启动场景下增加不必要的 I/O 延迟和文件系统压力，属于性能优化机会而非功能性 bug。

**P2-3. `web/app.js` 中存在大量引用已不存在 DOM 元素的死代码**
- 文件：`web/app.js` 中的 `loadCities()`、`loadMap()`、`renderMapBoard()`、`loadTools()`、`renderToolDetail()`、`loadTrips()`/`tripCard()`（用于旧的独立 Cities/Map/Tools/Trips 标签页），分别引用 `#cityGrid`、`#citySearch`、`#cityStatus`、`#mapStatus`、`#mapBoard`、`#mapAskButton`、`#toolGrid`、`#toolDetail`、`#toolStatus`、`#tripList`、`#tripStatus`、`#tripForm`、`#refreshTrips` 等 ID，这些元素在当前 `web/index.html`（v6.2.1，三标签结构：Chatbot/Dashboard/Translate）中均不存在。
- 说明：这些函数在 `bindEvents()` 中的绑定大多使用了可选链 `?.`，因此不会产生运行时错误，是静默的 no-op，而不是崩溃风险。但 CONTEXT.md 中已经明确指出 `web/app.js` "high-change and should eventually be split by feature"，这部分死代码进一步增加了维护负担。
- 影响：代码质量/可维护性问题，不影响线上功能正确性。

**P2-4. 重复/孤立的酒店数据文件**
- 文件：仓库根目录 `data/hotels.json`（旧版/孤立文件） vs. 实际被 `api/hotels.py` 的 `_load_hotels()` 读取的 `data/hotels/hotels.json`
- 说明：两个文件 schema 不同，根目录的 `data/hotels.json` 未被任何当前 API 代码引用。`[推断]`：可能是早期版本遗留、迁移到 `data/hotels/` 子目录后未清理的旧文件。
- 影响：纯代码仓库整洁度问题，无功能影响。

**P2-5. `api/common.py` 中的 mojibake 字符替换字典用途不明确 `[推断]`**
- 文件：`api/common.py` 中 `clean_text()` 函数内部（约第 91-114 行区域），包含一组形如 `"鈥?": "-"` 的 Unicode 乱码字符到正常字符的映射表。
- 说明：`[推断]` 该字典疑似是为修复某次编码损坏（mojibake）数据而添加的临时性兼容代码，但本次审查未能在仓库历史/文档中找到其引入原因或对应的数据源说明，存在“当前数据已修复但兼容代码未清理”或者“数据源仍持续产生此类乱码、必须保留”两种可能，无法仅凭代码本身判断哪种情况成立。
- 影响：如果原始问题已解决，这是可清理的技术债；如果原始问题仍存在，建议在代码中补充注释说明乱码来源，避免后续维护者误删。

---

## ⚡ 优化建议

### 性能
1. 为 `api/translations.py`、`api/hotels.py`、`api/deals.py` 的 JSON 文件读取增加内存缓存（参考 `api/health.py` 的 `_CACHE` + TTL 模式），减少重复磁盘 I/O，尤其有利于无服务器冷启动场景下的响应延迟。
2. `api/index.py` 建议增加一层全局 try/except 包装所有路由分发（不仅是修复 P0-1 这一个具体崩溃点，而是从架构层面为所有未来新增的 API 模块提供统一的异常兜底和一致的 JSON 错误响应格式），避免每个新模块都要重复实现自己的异常处理逻辑。

### 代码质量
1. 清理 `web/app.js` 中引用已下线 UI（旧 Cities/Map/Tools/Trips 独立标签页）的死代码：`loadCities`、`loadMap`、`renderMapBoard`、`loadTools`、`renderToolDetail`、`loadTrips`、`tripCard`、以及绑定到不存在元素（`#tripForm`、`#refreshTrips`、`#citySearch` 等）的事件监听代码。
2. 落实 CONTEXT.md 中已经提出的目标——将 `web/app.js`（当前 1115 行）按功能拆分为多个模块（如 chat.js / dashboard.js / translate.js / auth.js），降低单文件复杂度，便于后续维护。
3. 为 `api/common.py` 中的 mojibake 替换字典补充来源说明注释，或在确认数据源已修复后将其移除。
4. 清理仓库中孤立的 `data/hotels.json`（根目录），或在文档中明确其用途/归档原因。

### 用户体验
1. 修复 P1-1：为 Dashboard 的“My trips”模块补充一个真实可用的“创建行程”入口（表单或引导流程），使产品文档中描述的保存行程功能名副其实。
2. 修复 P1-2：将 `is-chat-composing` 类的隐藏导航机制扩展到 Translate 面板的 `#translationInput`（增加对应的 focus/blur 绑定，以及对应的导航隐藏 CSS 规则或复用现有类名机制），保证移动端各处文本输入都不会被底部导航遮挡。
3. 修复 P2-1：在 SSE 流中断时，保留已经流式输出的部分文本内容，在其后追加一行错误提示（而不是整体覆盖），让用户清楚自己看到的内容仍然有效。
4. 修复 P1-3：为 `web/admin.html` 的登录表单和删除用户按钮补充统一的错误处理（写入 `#adminStatus`），与现有 `#loadUsers` 的处理方式保持一致。

### 安全性
1. P0-1 的全局异常处理缺失不仅是可靠性问题，也是安全问题：未捕获异常返回的通用 WSGI 错误页在某些部署/调试配置下可能泄露堆栈信息或内部路径，建议统一捕获并返回不含敏感细节的 JSON 错误体。
2. P1-4：`api/auth.py` 的登录/验证码限流机制依赖进程内全局字典，在 Vercel 等无服务器环境下不能保证跨调用持久化，建议改为基于持久化存储（如已有的 SQLite 数据库本身，或外部 KV/Redis）的限流计数，以保证暴力破解防护在生产环境真正生效。
3. （核实排除）`api/config.py` 未将任何 API Key（包括 AMAP_KEY）暴露给前端；`web/app.js` 中唯一出现 `AMAP_KEY` 字样的位置只是给用户的提示文案，并非实际密钥泄露，本次审查特此排除该疑似风险点。

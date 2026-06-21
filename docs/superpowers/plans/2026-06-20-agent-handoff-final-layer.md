# VisePanda Agent Handoff Final Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the final agent-oriented handoff layer so another coding agent can understand the project's background, current judgment, recommended next moves, and safe module boundaries without relying on chat history.

**Architecture:** Keep the current handoff package structure intact and add three new documents with a mixed format: background story, current judgment, recommended action, and boundary notes. Then wire those documents into `HANDOFF.md` and `README.md` so they are discoverable from both the main handoff entry and the repository homepage.

**Tech Stack:** Markdown, Git, existing repository docs

---

## File Map

- `docs/2026-06-20-next-2-4-weeks-priority-guide.md`
  - New short-to-midterm priority guide for the next coding agent
- `docs/2026-06-20-technical-debt-boundaries.md`
  - New debt-boundary guide explaining what to accept, what to defer, and what to avoid turning into a refactor
- `docs/2026-06-20-module-ownership-guide.md`
  - New module-responsibility guide with coupling and safe-boundary advice
- `HANDOFF.md`
  - Main transfer entry point; will be extended with links and usage hints for the new final-layer docs
- `README.md`
  - `Planning Docs` section will be updated with the three new links

---

### Task 1: Add the next 2-4 weeks priority guide

**Files:**
- Create: `docs/2026-06-20-next-2-4-weeks-priority-guide.md`
- Test: `docs/2026-06-20-next-2-4-weeks-priority-guide.md`

- [ ] **Step 1: Write the new guide with the required mixed structure**

```md
# VisePanda 未来 2-4 周推荐迭代顺序

## 1. 文档目的

这份文档不是长期路线图，而是给接手 coding agent 的短中期推进建议，帮助它在 2-4 周范围内判断先做什么、后做什么、为什么现在不适合大改方向。

## 2. 背景

这个项目最早是从功能原型长出来的，后面逐步补了 Auth、Trips、Admin、英文原生化、Tools、移动端和稳定性专项。当前最重要的不是推翻重来，而是在已有资产上继续补齐产品完成度、线上稳定性和商用准备。

## 3. 当前判断

- 项目已不是 demo
- 但还没到成熟商用产品阶段
- 当前最值钱的是已有主链路，而不是架构纯洁性

## 4. 推荐推进顺序

### 第一优先级

- 继续做线上稳定性复测与小修
- 继续补用户主链路的闭环体验

### 第二优先级

- 强化 `Trips → Tools`
- 强化 `Cities → Tools → Chat`

### 第三优先级

- 为后续商用拆分 API / 资源 / 数据治理预研

## 5. 为什么是这个顺序

当前项目的主要价值来自已经完成的产品层资产，因此先补稳定性和主链路闭环，比先做大重构更能提升产品质量。

## 6. 偏离顺序的触发条件

- 如果线上问题再次集中暴露，优先级回到稳定性
- 如果确认进入商用准备期，提高后端独立化优先级
- 如果多人或多 agent 并行增加，提高模块边界与责任分工优先级
```

- [ ] **Step 2: Run a content presence check**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
text = Path('/workspace/VP-Hermes-Web/docs/2026-06-20-next-2-4-weeks-priority-guide.md').read_text()
required = [
    '## 2. 背景',
    '## 3. 当前判断',
    '## 4. 推荐推进顺序',
    '## 6. 偏离顺序的触发条件',
]
missing = [item for item in required if item not in text]
print('missing:', missing)
PY
```

Expected:

- Output is `missing: []`

- [ ] **Step 3: Commit the priority guide**

```bash
git add docs/2026-06-20-next-2-4-weeks-priority-guide.md
git commit -m "docs: add next 2-4 weeks priority guide"
```

---

### Task 2: Add the technical debt boundaries guide

**Files:**
- Create: `docs/2026-06-20-technical-debt-boundaries.md`
- Test: `docs/2026-06-20-technical-debt-boundaries.md`

- [ ] **Step 1: Write the debt guide with background, judgment, and boundaries**

```md
# VisePanda 技术债边界说明

## 1. 文档目的

这份文档不是列出所有技术债，而是帮助接手 coding agent 判断：哪些债现在先接受，哪些债可以顺手修，哪些债当前不应被升级成主任务。

## 2. 背景

这个项目是在持续迭代中逐步长出来的，很多结构不是先做完美分层再填功能，而是先把产品主链路做出来，再逐步补测试、英文原生化、工具页、移动端和稳定性。

## 3. 当前应接受的技术债

- `web/app.js` 仍然偏大
- 数据层存在 JSON 与知识模块并存
- 兼容层文件仍保留
- 当前仍保留 `Vercel`

## 4. 当前不应主动触碰的技术债

- 无明确目标地大拆 `web/app.js`
- 无明确收益地清理 `static/*`
- 因局部问题立刻整站迁移部署
- 在无业务目标下重构 auth / chat / trips 主链路

## 5. 可以顺手修的小债

- 小范围样式问题
- 独立文案错误
- 工具数据修正
- 局部 fallback 或空状态优化

## 6. 什么时候技术债才值得升级为主任务

- 当前任务反复被同一结构问题阻塞
- 线上问题已明确归因到该债
- 团队/agent 数量增加导致边界混乱
- 商用要求需要更高的稳定性与可控性
```

- [ ] **Step 2: Ensure required concrete debt judgments are present**

```md
- `web/app.js` 过重，但当前不宜直接大拆
- `static/*` 兼容层存在，但当前不宜直接大清理
- `Vercel` 仍保留，不应因为局部问题立刻整站迁移
- auth / chat / trips 主链路不应在无明确目标下随意重构
```

- [ ] **Step 3: Run a content presence check**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
text = Path('/workspace/VP-Hermes-Web/docs/2026-06-20-technical-debt-boundaries.md').read_text()
required = [
    '## 2. 背景',
    '## 4. 当前不应主动触碰的技术债',
    'web/app.js',
    'Vercel',
    'auth / chat / trips',
]
missing = [item for item in required if item not in text]
print('missing:', missing)
PY
```

Expected:

- Output is `missing: []`

- [ ] **Step 4: Commit the debt boundaries guide**

```bash
git add docs/2026-06-20-technical-debt-boundaries.md
git commit -m "docs: add technical debt boundaries"
```

---

### Task 3: Add the module ownership guide

**Files:**
- Create: `docs/2026-06-20-module-ownership-guide.md`
- Test: `docs/2026-06-20-module-ownership-guide.md`

- [ ] **Step 1: Write the module guide with background and module roles**

```md
# VisePanda 模块责任建议表

## 1. 文档目的

这份文档帮助接手 coding agent 从模块责任中心而不是单纯文件树的角度理解项目。

## 2. 背景

这个项目的模块边界不是按现代前端框架的组件系统自然切开的，而是在持续迭代中围绕主站页面、用户主链路和实际问题逐步形成的。

## 3. 模块责任表

### Home
- 角色：站点第一印象、信任层、快速入口
- 耦合：Chat / Cities / navigation

### Chat
- 角色：AI 规划主入口
- 耦合：auth / SSE / trips / prompt formatting

### Cities
- 角色：结构化城市浏览与详情
- 耦合：地图 / 工具 / 图片 /数据层

### Trips
- 角色：用户保存与查看旅行内容
- 耦合：auth / chat history / timeline

### Tools
- 角色：签证、预算、短语、急救等旅前辅助工作台
- 耦合：data/tools.json / modal / cities / trips

### Admin
- 角色：内部管理和用户数据查看
- 耦合：auth / admin routes / chat logs

### Shared Infra
- 角色：bootstrap / navigation / shared state / version / config
- 耦合：全站
```

- [ ] **Step 2: Add module-level boundaries for multi-agent collaboration**

```md
## 4. 多 agent / 多人协作时的边界建议

- 改 `Home` 时，不要顺手改 auth 主链路
- 改 `Tools` 时，不要顺手改 trip persistence
- 改 `Chat` 时，先确认前端消费格式和 SSE 输出契约
- 改 `Cities` 时，先确认是否会影响地图和图片链路
- 改 `Shared Infra` 时，要假设会影响整个站点
```

- [ ] **Step 3: Run a content presence check**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
text = Path('/workspace/VP-Hermes-Web/docs/2026-06-20-module-ownership-guide.md').read_text()
required = [
    '## 2. 背景',
    'Home',
    'Chat',
    'Cities',
    'Trips',
    'Tools',
    'Admin',
    'Shared Infra',
    '## 4. 多 agent / 多人协作时的边界建议',
]
missing = [item for item in required if item not in text]
print('missing:', missing)
PY
```

Expected:

- Output is `missing: []`

- [ ] **Step 4: Commit the module ownership guide**

```bash
git add docs/2026-06-20-module-ownership-guide.md
git commit -m "docs: add module ownership guide"
```

---

### Task 4: Link the final-layer docs into `HANDOFF.md` and `README.md`

**Files:**
- Modify: `HANDOFF.md`
- Modify: `README.md`

- [ ] **Step 1: Add the new docs to `HANDOFF.md`**

```md
## 10. 接手建议

在完成首周接手、风险文件和回归手册阅读后，继续参考：

- [docs/2026-06-20-next-2-4-weeks-priority-guide.md](docs/2026-06-20-next-2-4-weeks-priority-guide.md)
- [docs/2026-06-20-technical-debt-boundaries.md](docs/2026-06-20-technical-debt-boundaries.md)
- [docs/2026-06-20-module-ownership-guide.md](docs/2026-06-20-module-ownership-guide.md)
```

```md
## 11. 关键文档索引

| [docs/2026-06-20-next-2-4-weeks-priority-guide.md](docs/2026-06-20-next-2-4-weeks-priority-guide.md) | 未来 2-4 周推荐迭代顺序 |
| [docs/2026-06-20-technical-debt-boundaries.md](docs/2026-06-20-technical-debt-boundaries.md) | 技术债边界说明 |
| [docs/2026-06-20-module-ownership-guide.md](docs/2026-06-20-module-ownership-guide.md) | 模块责任建议表 |
```

- [ ] **Step 2: Add the new docs to `README.md`**

```md
## Planning Docs

- [Commercial Upgrade Plan](docs/2026-06-20-commercial-upgrade-plan.md)
- [Engineering Handoff Notes](docs/2026-06-20-engineering-handoff-notes.md)
- [First-Week Takeover Checklist](docs/2026-06-20-first-week-takeover-checklist.md)
- [High-Risk Files Guide](docs/2026-06-20-high-risk-files-guide.md)
- [Production Regression Manual](docs/2026-06-20-production-regression-manual.md)
- [Next 2-4 Weeks Priority Guide](docs/2026-06-20-next-2-4-weeks-priority-guide.md)
- [Technical Debt Boundaries](docs/2026-06-20-technical-debt-boundaries.md)
- [Module Ownership Guide](docs/2026-06-20-module-ownership-guide.md)
```

- [ ] **Step 3: Run a final link presence check**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
handoff = Path('/workspace/VP-Hermes-Web/HANDOFF.md').read_text()
readme = Path('/workspace/VP-Hermes-Web/README.md').read_text()
checks = {
    'handoff->priority': 'docs/2026-06-20-next-2-4-weeks-priority-guide.md' in handoff,
    'handoff->debt': 'docs/2026-06-20-technical-debt-boundaries.md' in handoff,
    'handoff->ownership': 'docs/2026-06-20-module-ownership-guide.md' in handoff,
    'readme->priority': 'Next 2-4 Weeks Priority Guide' in readme,
    'readme->debt': 'Technical Debt Boundaries' in readme,
    'readme->ownership': 'Module Ownership Guide' in readme,
}
print(checks)
PY
```

Expected:

- All values are `True`

- [ ] **Step 4: Commit the final-layer link pass**

```bash
git add HANDOFF.md README.md
git commit -m "docs: link agent handoff final layer"
```

---

## Self-Review

### Spec coverage

- Next 2-4 weeks priority guide: Task 1
- Technical debt boundaries: Task 2
- Module ownership guide: Task 3
- Handoff/README integration: Task 4

### Placeholder scan

- No `TODO` / `TBD`
- Every new file has concrete sections and content
- Every validation step includes an exact command

### Type consistency

- File paths are consistent across all tasks:
  - `docs/2026-06-20-next-2-4-weeks-priority-guide.md`
  - `docs/2026-06-20-technical-debt-boundaries.md`
  - `docs/2026-06-20-module-ownership-guide.md`


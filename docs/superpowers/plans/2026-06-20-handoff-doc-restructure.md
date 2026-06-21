# VisePanda Handoff Doc Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the project handoff docs into a lighter main `HANDOFF.md` plus a detailed engineering appendix that makes project transfer easier for both product readers and developers.

**Architecture:** Keep `HANDOFF.md` as the project transfer entry point, but reduce deep engineering detail there and move implementation-heavy guidance into a new appendix under `docs/`. Use explicit cross-links so readers can move between the high-level project overview, the engineering appendix, and existing docs like README, CHANGELOG, and the commercial upgrade plan.

**Tech Stack:** Markdown, Git, existing repository docs

---

## File Map

- `HANDOFF.md`
  - Main project transfer document
  - High-level overview, current status, risks, iteration summary, onboarding order
  - Link hub to other docs
- `docs/2026-06-20-engineering-handoff-notes.md`
  - New engineering appendix
  - Active code paths, file responsibilities, runtime flow, tests, risks, safe-change guidance
- `README.md`
  - Optional link addition only if needed to make the new appendix discoverable

---

### Task 1: Rewrite `HANDOFF.md` as the main transfer entry point

**Files:**
- Modify: `HANDOFF.md`
- Test: `HANDOFF.md` link integrity and section presence

- [ ] **Step 1: Replace the current handoff structure with a main-document outline**

```md
# VisePanda (VP-Hermes-Web) 项目交接文档

> **最后更新：** 2026-06-20
> **当前版本：** `v5.0.9`
> **当前状态：** 可继续开发、可继续线上验证、基础稳定性已补一轮，但仍处于“产品验证到准商用”之间的阶段
> **代码仓库：** `https://github.com/JTCAO515/VP-Hermes-Web.git`
> **线上地址：** `https://www.go2china.space`
> **当前部署：** `Vercel` 自动部署，现阶段继续保留

## 1. 项目是什么
## 2. 当前能做什么
## 3. 页面结构与内容格式
## 4. 当前技术架构
## 5. 已达成效果
## 6. 计划达成效果
## 7. 过往关键迭代
## 8. 当前真实问题
## 9. 当前部署与商用判断
## 10. 接手建议
## 11. 关键文档索引
## 12. 最终结论
```

- [ ] **Step 2: Make the main doc explicitly lighter on deep engineering detail**

```md
## 11. 关键文档索引

| 文档 | 用途 |
|------|------|
| `README.md` | 项目总览与快速启动 |
| `CHANGELOG.md` | 版本与迭代历史 |
| `HANDOFF.md` | 当前总交接文档 |
| `docs/2026-06-20-engineering-handoff-notes.md` | 详尽工程接手附录 |
| `docs/2026-06-20-commercial-upgrade-plan.md` | 商用升级路线 |
| `docs/superpowers/specs/2026-06-20-production-stability-pass-design.md` | `v5.0.9` 稳定性专项设计 |
| `docs/superpowers/plans/2026-06-20-production-stability-pass.md` | `v5.0.9` 实施计划 |
```

- [ ] **Step 3: Run a fast content check**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
text = Path('/workspace/VP-Hermes-Web/HANDOFF.md').read_text()
required = [
    '## 1. 项目是什么',
    '## 8. 当前真实问题',
    'docs/2026-06-20-engineering-handoff-notes.md',
    'docs/2026-06-20-commercial-upgrade-plan.md',
]
missing = [item for item in required if item not in text]
print('missing:', missing)
PY
```

Expected:

- Output is `missing: []`

- [ ] **Step 4: Commit the main handoff rewrite**

```bash
git add HANDOFF.md
git commit -m "docs: restructure main handoff document"
```

---

### Task 2: Add the detailed engineering appendix

**Files:**
- Create: `docs/2026-06-20-engineering-handoff-notes.md`
- Test: `docs/2026-06-20-engineering-handoff-notes.md`

- [ ] **Step 1: Write the appendix header and scope**

```md
# VisePanda 工程接手附录

## 1. 文档目的

这份附录不是产品总览，而是给新开发者使用的详尽工程交接说明。
主交接文档仍然是 `HANDOFF.md`，这里负责补足：

- 当前活跃主链路
- 核心文件职责
- 前后端运行关系
- 测试入口
- 已知工程风险
- 不建议轻易改动的部分
```

- [ ] **Step 2: Add the active-path breakdown**

```md
## 2. 当前活跃主链路

### 前端主链路

- `web/index.html`：主 SPA 壳层、nav、modal、view 容器
- `web/app.js`：当前前端主逻辑入口，负责导航、聊天、auth、cities、trips、tools、bootstrap
- `web/app.css`：当前主样式系统，含桌面、移动端、overlay、安全区、工具与稳定性补丁

### 后端主链路

- `api/index.py`：WSGI 路由入口
- `api/auth.py`：当前活跃的用户、session、trips、chat history 数据链路
- `api/chat.py`：SSE 流式聊天
- `api/cities.py`：城市与对比数据
- `api/tools.py`：工具数据路由
- `api/visa.py`：签证能力
```

- [ ] **Step 3: Add safe-change guidance and test instructions**

```md
## 6. 修改时的高风险区域

### `web/app.js`

这是当前最重的前端文件。不要在未理解入口顺序之前直接做大规模重构。

### `api/auth.py`

当前活跃数据链路集中在这里，涉及登录、行程、聊天历史和后台权限。

### `static/*`

这批文件里有历史兼容层，不要默认它们都是当前主路径。

## 7. 测试入口

### Python

```bash
python3 -m unittest discover -s tests -v
```

### Node

```bash
node --test web/tests/*.test.js
```
```

- [ ] **Step 4: Run a fast appendix validation**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
text = Path('/workspace/VP-Hermes-Web/docs/2026-06-20-engineering-handoff-notes.md').read_text()
required = [
    '## 2. 当前活跃主链路',
    'web/app.js',
    'api/auth.py',
    'node --test web/tests/*.test.js',
]
missing = [item for item in required if item not in text]
print('missing:', missing)
PY
```

Expected:

- Output is `missing: []`

- [ ] **Step 5: Commit the engineering appendix**

```bash
git add docs/2026-06-20-engineering-handoff-notes.md
git commit -m "docs: add engineering handoff appendix"
```

---

### Task 3: Link the appendix and verify the final doc set

**Files:**
- Modify: `HANDOFF.md`
- Modify: `README.md`

- [ ] **Step 1: Ensure `HANDOFF.md` links to the appendix in both the index and onboarding advice**

```md
## 10. 接手建议

1. 先读 `HANDOFF.md`
2. 再读 `docs/2026-06-20-engineering-handoff-notes.md`
3. 再看 `README.md`
4. 再看 `CHANGELOG.md`
5. 最后跑测试和本地服务
```

- [ ] **Step 2: Add a README planning-doc link if the appendix is otherwise hard to discover**

```md
## Planning Docs

- [Commercial Upgrade Plan](docs/2026-06-20-commercial-upgrade-plan.md)
- [Engineering Handoff Notes](docs/2026-06-20-engineering-handoff-notes.md)
```

- [ ] **Step 3: Run a final link-presence check**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
handoff = Path('/workspace/VP-Hermes-Web/HANDOFF.md').read_text()
readme = Path('/workspace/VP-Hermes-Web/README.md').read_text()
checks = {
    'handoff->appendix': 'docs/2026-06-20-engineering-handoff-notes.md' in handoff,
    'handoff->commercial': 'docs/2026-06-20-commercial-upgrade-plan.md' in handoff,
    'readme->appendix': 'Engineering Handoff Notes' in readme,
}
print(checks)
PY
```

Expected:

- All values are `True`

- [ ] **Step 4: Commit the final doc-link pass**

```bash
git add HANDOFF.md README.md
git commit -m "docs: link handoff appendix across project docs"
```

---

## Self-Review

### Spec coverage

- Main doc lighter, more navigable: Task 1
- Detailed engineering info moved to appendix: Task 2
- Appendix linked from main doc and optionally README: Task 3

### Placeholder scan

- No `TODO` / `TBD`
- Every change step includes concrete markdown content
- Every verification step includes exact commands

### Type consistency

- Appendix file path is consistent everywhere:
  - `docs/2026-06-20-engineering-handoff-notes.md`
- Commercial plan path is consistent everywhere:
  - `docs/2026-06-20-commercial-upgrade-plan.md`


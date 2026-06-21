# VisePanda Agent Transfer Index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single transfer-index page that separates the active handoff package from historical reference docs, then link it from `HANDOFF.md` and `README.md`.

**Architecture:** Create one Markdown index file under `docs/` with a dual-layer structure: current active handoff package and historical/reference docs. Update `HANDOFF.md` and `README.md` so the new index becomes the easiest entry point when a new coding agent does not know which document to read first.

**Tech Stack:** Markdown, Git, existing repository docs

---

## File Map

- `docs/2026-06-20-agent-transfer-index.md`
  - New top-level navigation page for the handoff package
- `HANDOFF.md`
  - Will link to the transfer index from onboarding advice and document index
- `README.md`
  - Will add the transfer index to `Planning Docs`

---

### Task 1: Add the agent transfer index and wire it into the docs

**Files:**
- Create: `docs/2026-06-20-agent-transfer-index.md`
- Modify: `HANDOFF.md`
- Modify: `README.md`

- [ ] **Step 1: Write the new transfer index page**

```md
# VisePanda Agent Transfer Index

## 1. 文档目的

这份目录页是给下一个 coding agent 使用的总入口。它不重复 `HANDOFF.md` 的内容，而是帮助接手者快速判断：现在最该先看哪些文档，哪些历史材料可以按需查阅。

## 2. 怎么使用这份目录

- 如果你是第一次接手，先看“当前主用交接包”
- 如果你准备改代码，先看工程附录、风险指南和模块责任文档
- 如果你准备上线，先看回归手册
- 如果你准备做中期规划，先看 2-4 周优先级和商用升级路线

## 3. 第一层：当前主用交接包

- [HANDOFF.md](../HANDOFF.md)：项目主交接入口，先建立全局认知
- [2026-06-20-engineering-handoff-notes.md](2026-06-20-engineering-handoff-notes.md)：工程主链路与关键文件说明
- [2026-06-20-first-week-takeover-checklist.md](2026-06-20-first-week-takeover-checklist.md)：接手第一周建议顺序
- [2026-06-20-high-risk-files-guide.md](2026-06-20-high-risk-files-guide.md)：哪些文件别乱动
- [2026-06-20-production-regression-manual.md](2026-06-20-production-regression-manual.md)：发布前后怎么验收
- [2026-06-20-next-2-4-weeks-priority-guide.md](2026-06-20-next-2-4-weeks-priority-guide.md)：短中期推进顺序
- [2026-06-20-technical-debt-boundaries.md](2026-06-20-technical-debt-boundaries.md)：哪些技术债先别碰
- [2026-06-20-module-ownership-guide.md](2026-06-20-module-ownership-guide.md)：按模块理解责任边界
- [2026-06-20-commercial-upgrade-plan.md](2026-06-20-commercial-upgrade-plan.md)：后续商用升级路线

## 4. 第二层：历史文档与参考材料

### 项目总览类
- [README.md](../README.md)
- [CHANGELOG.md](../CHANGELOG.md)

### 最近 spec / plan
- [production stability spec](superpowers/specs/2026-06-20-production-stability-pass-design.md)
- [production stability plan](superpowers/plans/2026-06-20-production-stability-pass.md)
- [handoff restructure spec](superpowers/specs/2026-06-20-handoff-doc-restructure-design.md)
- [handoff package expansion spec](superpowers/specs/2026-06-20-handoff-package-expansion-design.md)

### 架构与历史参考
- `docs/adr/*`
- `docs/agents/*`
- 旧的 roadmap / iteration / review 文档

## 5. 建议阅读路径

### 第一次接手项目
`HANDOFF.md` → 工程附录 → 首周清单 → 风险指南

### 准备改代码前
工程附录 → 风险指南 → 模块责任建议表

### 准备做线上回归前
回归手册 → `HANDOFF.md` 中的当前问题 → 最近稳定性 spec / plan

### 准备做 2-4 周规划时
2-4 周优先级 → 技术债边界 → 商用升级路线
```

- [ ] **Step 2: Update `HANDOFF.md` to point to the new index**

```md
## 10. 接手建议

1. 如果你不知道该先看哪份文档，先读 [docs/2026-06-20-agent-transfer-index.md](docs/2026-06-20-agent-transfer-index.md)
```

```md
## 11. 关键文档索引

| [docs/2026-06-20-agent-transfer-index.md](docs/2026-06-20-agent-transfer-index.md) | 交接文档总目录页 |
```

- [ ] **Step 3: Update `README.md` to include the transfer index**

```md
## Planning Docs

- [Agent Transfer Index](docs/2026-06-20-agent-transfer-index.md)
```

- [ ] **Step 4: Run a final link presence check**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
index = Path('/workspace/VP-Hermes-Web/docs/2026-06-20-agent-transfer-index.md').read_text()
handoff = Path('/workspace/VP-Hermes-Web/HANDOFF.md').read_text()
readme = Path('/workspace/VP-Hermes-Web/README.md').read_text()
checks = {
    'index-layer-1': '## 3. 第一层：当前主用交接包' in index,
    'index-layer-2': '## 4. 第二层：历史文档与参考材料' in index,
    'index-reading-path': '## 5. 建议阅读路径' in index,
    'handoff-link': 'docs/2026-06-20-agent-transfer-index.md' in handoff,
    'readme-link': 'Agent Transfer Index' in readme,
}
print(checks)
PY
```

Expected:

- All values are `True`

- [ ] **Step 5: Commit the transfer index**

```bash
git add docs/2026-06-20-agent-transfer-index.md HANDOFF.md README.md
git commit -m "docs: add agent transfer index"
```

---

## Self-Review

### Spec coverage

- New dual-layer index page: Task 1, Step 1
- Handoff entry link: Task 1, Step 2
- README entry link: Task 1, Step 3
- Verification for both layers and both entry links: Task 1, Step 4

### Placeholder scan

- No `TODO` / `TBD`
- Exact file paths are used
- Exact validation command is included

### Type consistency

- Index file path is consistent everywhere:
  - `docs/2026-06-20-agent-transfer-index.md`


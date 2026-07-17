# Spec：tasks.md 模板

复制到 `packages/<pkg>/specs/REQ-YYYYMMDD-slug/tasks.md`。

每个任务应可独立验收；涉及行为变更的任务 **必须** 含测试子项。

## 任务列表

- [ ] Task 1: …
  - [ ] 测试：`packages/<pkg>/test/...`
- [ ] Task 2: …
  - [ ] 测试：…
- [ ] Task 3: 更新包 AGENTS.md / Skill / 用户文档（若需要）

## 依赖顺序

1 → 2 → 3

## 验收命令

```bash
pnpm test
# 或更聚焦：
# pnpm -F @opentiny/next-sdk test
```

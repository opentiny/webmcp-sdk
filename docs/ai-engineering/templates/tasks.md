# Spec：tasks.md 模板

复制到 `packages/<pkg>/specs/REQ-YYYYMMDD-slug/tasks.md`。

<!-- Agent 指南：请确保每个 Task 的粒度足够小（尽量在一个 PR 或少量文件修改以内），避免上下文溢出。在执行 Task 时，请先明确它的输入和输出。 -->

每个任务应可独立验收；涉及行为变更的任务 **必须** 含测试子项。

## 任务列表

- [ ] Task 1: …
  - 输入（依赖）：*(如需读取某些文件或依赖其他 task 完成)*
  - 产物（输出）：*(具体要新增或修改哪些文件)*
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

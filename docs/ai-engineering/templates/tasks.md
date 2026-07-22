# Spec：tasks.md 模板

复制到 `packages/<pkg>/specs/REQ-YYYYMMDD-slug/tasks.md`。

<!-- Agent 指南：
1. 先写 tasks，再按任务改代码；不要先写完代码再空填 tasks。
2. 每个 Task 粒度尽量小（一 PR 或少量文件），执行前明确输入/输出。
3. 涉及行为变更的任务必须含测试子项。
-->

每个任务应可独立验收；涉及行为变更的任务 **必须** 含测试子项。

## 任务列表

- [ ] Task 1: …
  - 输入（依赖）：*(如需读取某些文件或依赖其他 task 完成)*
  - 产物（输出）：*(具体要新增或修改哪些文件)*
  - [ ] 测试：`packages/<pkg>/test/...`
- [ ] Task 2: …
  - [ ] 测试：…
- [ ] Task 3: 更新包 AGENTS.md / Skill / 用户文档（若需要）
- [ ] Task N: 实机 / E2E 验证（若有；勾选前须可复现）
  - 前置：*(环境、登录 Profile、端口等)*
  - 命令：*(具体 CLI / 脚本)*
  - 产物：*(日志路径、截图或结果摘要)*

## 依赖顺序

1 → 2 → 3

## 验收命令

```bash
pnpm test
# 或更聚焦：
# pnpm -F @opentiny/next-sdk test
# 若有实机任务，另列可复现命令（勿仅用单元测试代替）
```

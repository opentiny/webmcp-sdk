# Tasks：动作后等待动作期间发起的请求

## 任务列表

- [x] Task 1: 请求计数与 `beginAction()` / `settle()`
  - 产物：`packages/next-sdk/page-tools/utils/network.ts`
  - [x] 测试：`packages/next-sdk/test/page-tools/action-settle.test.ts`
- [x] Task 2: `click` / `fill` / `select` / `scroll` 改用 `settle()`
  - 产物：`packages/next-sdk/page-tools/handlers/{click,fill,select,scroll}.ts`
- [x] Task 3: 用户文档 / Skill / Spec 索引
  - 产物：`docs/webmcp-sdk/page-agent-tool.md`、`packages/next-sdk/skills/page-agent/SKILL.md`、`packages/next-sdk/specs/README.md`

## 依赖顺序

1 → 2 → 3

## 验收命令

```bash
pnpm -F @opentiny/next-sdk test
```

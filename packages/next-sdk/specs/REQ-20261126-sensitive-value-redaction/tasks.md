# Tasks：browserState 不输出敏感输入框的值

## 任务列表

- [x] Task 1: `computeStates` 对敏感字段输出占位
  - 产物：`packages/next-sdk/page-tools/a11y/config.ts`
  - [x] 测试：`packages/next-sdk/test/page-tools/a11y/sensitive-values.test.ts`
- [x] Task 2: 用户文档 / Skill / Spec 索引
  - 产物：`docs/webmcp-sdk/page-agent-tool.md`、`packages/next-sdk/skills/page-agent/SKILL.md`、`packages/next-sdk/specs/README.md`

## 依赖顺序

1 → 2

## 验收命令

```bash
pnpm -F @opentiny/next-sdk test
```

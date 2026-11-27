# Tasks：scroll 按百分比定位并报告当前位置

## 任务列表

- [x] Task 1: schema 新增 `percent`
  - 产物：`packages/next-sdk/page-tools/schema.ts`
- [x] Task 2: `handleScroll` 按百分比跳转、位置百分比、无滚动范围时的提示
  - 产物：`packages/next-sdk/page-tools/handlers/scroll.ts`
  - [x] 测试：`packages/next-sdk/test/page-tools/scroll.test.ts`（`handleScroll - percent 跳到指定位置`）
- [x] Task 3: 用户文档 / Skill / Spec 索引
  - 产物：`docs/webmcp-sdk/page-agent-tool.md`、`packages/next-sdk/skills/page-agent/SKILL.md`、`packages/next-sdk/specs/README.md`

## 依赖顺序

1 → 2 → 3

## 验收命令

```bash
pnpm -F @opentiny/next-sdk test
```

# Tasks：scroll 在自行处理滚轮的区域派发滚轮事件

## 任务列表

- [x] Task 1: `findClippingAncestor`、`dispatchWheel`，遮罩判断与 `pageElementFromPoint` 共用
  - 产物：`packages/next-sdk/page-tools/utils/scroll.ts`
- [x] Task 2: `handleScroll` 位移为 0 时派发滚轮事件并生成结果文案
  - 产物：`packages/next-sdk/page-tools/handlers/scroll.ts`
  - [x] 测试：`packages/next-sdk/test/page-tools/scroll.test.ts`（`handleScroll - 自行处理滚轮的区域`）
- [x] Task 3: schema / 用户文档 / Skill / Spec 索引
  - 产物：`packages/next-sdk/page-tools/schema.ts`、`docs/webmcp-sdk/page-agent-tool.md`、`packages/next-sdk/skills/page-agent/SKILL.md`、`packages/next-sdk/specs/README.md`

## 依赖顺序

1 → 2 → 3

## 验收命令

```bash
pnpm -F @opentiny/next-sdk test
```

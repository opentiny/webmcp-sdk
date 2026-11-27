# Tasks：快照为可滚动区域分配编号并标出剩余距离

## 任务列表

- [x] Task 1: `scrollContainerToken`，`canScroll` 先比较尺寸
  - 产物：`packages/next-sdk/page-tools/utils/scroll.ts`
- [x] Task 2: `buildVNode` 输出 token 并分配编号
  - 产物：`packages/next-sdk/page-tools/a11y/vnode.ts`
  - [x] 测试：`packages/next-sdk/test/page-tools/a11y/scroll-container.test.ts`
- [x] Task 3: prompt / schema / 用户文档 / Skill / Spec 索引
  - 产物：`packages/next-sdk/page-tools/page-agent-prompt.md`、`packages/next-sdk/page-tools/schema.ts`、`docs/webmcp-sdk/page-agent-tool.md`、`packages/next-sdk/skills/page-agent/SKILL.md`、`packages/next-sdk/specs/README.md`

## 依赖顺序

1 → 2 → 3

## 验收命令

```bash
pnpm -F @opentiny/next-sdk test
```

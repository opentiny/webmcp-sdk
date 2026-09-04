# Tasks：无障碍树识别 contenteditable 编辑宿主

## 任务列表

- [x] Task 1: 角色 / 状态解析识别编辑宿主
  - 产物：`packages/next-sdk/page-tools/a11y/config.ts`（`isEditingHost`、`computeRole`、`computeStates`）
  - [x] 测试：`packages/next-sdk/test/page-tools/a11y/config.test.ts`
- [x] Task 2: 构建树时为编辑宿主分配 ref，且不传染给继承子孙
  - 产物：`packages/next-sdk/page-tools/a11y/vnode.ts`、`packages/next-sdk/page-tools/a11y/utils.ts`
  - [x] 测试：`packages/next-sdk/test/page-tools/a11y/build.test.ts`
- [x] Task 3: schema / 用户文档 / Skill
  - 产物：`packages/next-sdk/page-tools/schema.ts`、`docs/webmcp-sdk/page-agent-tool.md`、`packages/next-sdk/skills/page-agent/SKILL.md`、`packages/next-sdk/specs/README.md`

## 依赖顺序

1 → 2 → 3

## 验收命令

```bash
pnpm -F @opentiny/next-sdk test
```

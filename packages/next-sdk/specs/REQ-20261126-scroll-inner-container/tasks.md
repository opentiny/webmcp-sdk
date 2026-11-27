# Tasks：scroll 滚动内部容器

## 任务列表

- [x] Task 1: 滚动容器查找函数
  - 产物：`packages/next-sdk/page-tools/utils/scroll.ts`
- [x] Task 2: `handleScroll` 选择滚动目标、注明容器、按目标高度换算 `numPages`
  - 产物：`packages/next-sdk/page-tools/handlers/scroll.ts`
  - [x] 测试：`packages/next-sdk/test/page-tools/scroll.test.ts`
- [x] Task 3: schema / 用户文档 / Skill / Spec 索引
  - 产物：`packages/next-sdk/page-tools/schema.ts`、`docs/webmcp-sdk/page-agent-tool.md`、`packages/next-sdk/skills/page-agent/SKILL.md`、`packages/next-sdk/specs/README.md`

## 依赖顺序

1 → 2 → 3

## 验收命令

```bash
pnpm -F @opentiny/next-sdk test
```

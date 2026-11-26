# Tasks：page-agent-tool 稳定元素编号与结构化增量 Diff 重构

每个任务应可独立验收；涉及行为变更的任务 **必须** 含测试子项。

## 任务列表

- [x] Task 1: 实现 `ElementRefAllocator` 并接入 `buildA11yTree` / `searchA11yTree`，对齐输出 `refMap`
  - 输入（依赖）：`packages/next-sdk/page-tools/a11y/{types,vnode,build,search}.ts`
  - 产物（输出）：新增 `packages/next-sdk/page-tools/a11y/ref-allocator.ts`，更新 `types.ts`、`vnode.ts`、`build.ts`、`a11y-tree.ts`、`index.ts`
  - [x] 测试：`packages/next-sdk/test/page-tools/a11y/build.test.ts`（验证顶部插入元素不改变后续元素 `#ref`、移除元素不复用旧 `#ref`、`reset()` 归零、未传分配器保持兼容、单子合并无幽灵 `#ref`）
- [x] Task 2: 重构 `PageStateCache` 与 `structured-yaml-diff.ts`（同父同 `#ref` 就近配对、跨父按各自文档位置输出、`DiffContextTracker` 最小父级缩进锚点、三项熔断回退与 `rev`/`baseRev`）
  - 输入（依赖）：Task 1、`packages/next-sdk/page-tools/page-state-cache.ts`
  - 产物（输出）：新增 `packages/next-sdk/page-tools/structured-yaml-diff.ts`，更新 `packages/next-sdk/page-tools/page-state-cache.ts`
  - [x] 测试：`packages/next-sdk/test/page-tools/page-state-cache.test.ts`、`packages/next-sdk/test/page-tools/structured-yaml-diff.test.ts`（含「复现：页面首个节点前插入新节点导致全表 diff 膨胀」场景、同父同 `#ref` 配对、跨父移动、`DiffContextTracker` 独立单测、三项熔断回退 `kind: 'full'`、`rev`/`baseRev` 连续性与重置）
- [x] Task 3: 接入结构化协议字段、统一 `REF_NOT_PRESENTED` 报错与单轮清空基线/会话级重置
  - 输入（依赖）：Task 1、Task 2、`packages/next-sdk/page-tools/{context,page-agent-tool,page-agent-tool-event}.ts`、`handlers/*.ts`
  - 产物（输出）：更新 `context.ts`、`page-agent-tool.ts`、`page-agent-tool-event.ts`、`handlers/{click,fill,select,hover,scroll,searchTree}.ts`、`index.ts`
  - [x] 测试：`packages/next-sdk/test/page-tools/page-agent-tool-diff-session.test.ts`（端到端验证 `kind/url/rev/baseRev`、`click/fill/select/hover/scroll` 旧编号返回 `REF_NOT_PRESENTED` 且不塞整页树、`searchTree` 不打断 `baseRev` 链、`PAGE_AGENT_CHAT_END_EVENT` 单轮清空基线与 `resetSession()` 完整归零）
- [x] Task 4: 更新内置 Prompt、编码 Skill、Spec 索引与用户文档
  - 输入（依赖）：Task 1–3
  - 产物（输出）：`packages/next-sdk/page-tools/page-agent-prompt.md`、`docs/webmcp-sdk/page-agent-tool.md`、`packages/next-sdk/skills/page-agent/SKILL.md`、`packages/next-sdk/specs/README.md`
- [x] Task 5: 收敛 `states.error`/`warning` 作用域与 Diff 算法健壮性/性能优化
  - 输入（依赖）：`packages/next-sdk/page-tools/a11y/{constants,config}.ts`、`packages/next-sdk/page-tools/structured-yaml-diff.ts`、`packages/next-sdk/page-tools/page-state-cache.ts`
  - 产物（输出）：收敛 `DEFAULT_ERROR_SELECTORS` 中 `.ng-invalid`；`states.error`/`warning` 保持自身命中并允许表单控件（含自定义 role 表单控件）通过 `closest()` 继承容器校验态；`structured-yaml-diff.ts` 预计算 `parentIndex`、实现首尾剥离与 O(N) 低重合快速熔断、Myers 整型键对比与 `maxEditLength` 上限、全局无交互包装层与父节点改名配对 LCS 抵消及 `DiffContextTracker` 单调缩进栈锚点
  - [x] 测试：`packages/next-sdk/test/page-tools/a11y/config.test.ts`、`packages/next-sdk/test/page-tools/page-state-cache.test.ts`、`packages/next-sdk/test/page-tools/structured-yaml-diff.test.ts`

## 依赖顺序

1 → 2 → 3 → 4 → 5

## 验收命令

```bash
pnpm skills:sync
pnpm -F @opentiny/next-sdk test
pnpm -F @opentiny/next-sdk build
```

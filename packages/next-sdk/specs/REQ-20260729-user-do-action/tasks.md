# Tasks：Page Agent 用户手动操作事件

## 任务列表

- [x] Task 1: 实现事件常量与 `handleUserDoAction`
  - 输入（依赖）：`ActionContext.getRefMap()`、`pageController.mask.shown`
  - 产物：`packages/next-sdk/page-tools/page-agent-tool-event.ts`
    - 导出 `PAGE_AGENT_USER_DO_ACTION_EVENT`
    - 捕获阶段 `click` 监听 + cleanup
    - 满足条件时派发 `{ action: 'click', dom: targetParent }`
- [x] Task 2: `registerPageAgentTool` 接线 `actionContext`
  - 产物：`packages/next-sdk/page-tools/page-agent-tool.ts` 调用 `setupPageAgentToolEventBridge(..., actionContext)`
- [ ] Task 3: 包入口与类型导出
  - 产物：
    - `page-agent-tool-event.ts` 显式导出 `PageAgentUserDoActionEventDetail`
    - `packages/next-sdk/index.ts` 导出常量与类型
  - 说明：实现已完成核心行为，公开导出待补，便于宿主 `import { PAGE_AGENT_USER_DO_ACTION_EVENT } from '@opentiny/next-sdk'`
- [ ] Task 4: 自动化测试
  - [ ] 测试：`packages/next-sdk/test/page-tools/page-agent-tool.test.ts`（或独立 event 测试文件）
  - 场景（须含中文 **`复现：`**）：
    - mask 已 show + refMap 命中 → 派发 `page-agent-user-do-action`
    - mask 未 show / 非 trusted / 点击在 refMap 外 → 不派发
- [ ] Task 5: 用户文档 / Skill（可选）
  - 产物：`docs/webmcp-sdk/page-agent-tool.md`、`skills/page-agent/SKILL.md` 补充事件说明

## 依赖顺序

1 → 2 →（3、4 可并行）→ 5

## 验收命令

```bash
pnpm -F @opentiny/next-sdk test
pnpm -F @opentiny/next-sdk build
```

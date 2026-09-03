# Tasks：遮罩接管态与光标生命周期分离

每个任务应可独立验收；涉及行为变更的任务 **必须** 含测试子项。

## 任务列表

- [x] Task 1：改造 `SimulatorMask` 默认值与初始样式
  - 输入：`packages/next-sdk/page-tools/page-agent-mask/SimulatorMask.ts`
  - 产物：`#createCursor()` 设 `display: 'none'`；`show()` 默认 `showCursor: false`
  - [x] 测试：`packages/next-sdk/test/page-tools/simulator-mask-cursor.test.ts`
    - 复现：构造后、未 `show` 前光标已是 `display: none`
    - 复现：无参 `show()` 不显示光标
    - 保留：`show({ showCursor: false })` 后再 `show({ showCursor: true })` 能恢复显示

- [x] Task 2：`PageAgentToolConfig` 增加 `cursorMode`
  - 输入：`packages/next-sdk/page-tools/tool-config.ts`
  - 产物：类型、默认值 `'actionOnly'`、`get/set` / `resolvePatch` 透传
  - [x] 测试：`packages/next-sdk/test/page-tools/tool-config.test.ts`

- [x] Task 3：句柄透传 + 调度层收光标 + `cursorMode` 解析
  - 输入：依赖 Task 1、Task 2；`packages/next-sdk/page-tools/page-agent-tool.ts`
  - 产物：
    - `PageAgentToolHandle.showMask(options?)` 直调 `simulatorMask.show`
    - 操作类开始时 `resolveShowCursor('pointer')`；感知类 `observe`
    - `finally` 在遮罩仍显示且非 `always` 时收光标
  - [x] 测试：`packages/next-sdk/test/page-tools/page-agent-tool.test.ts`（句柄无参/有参）
  - [x] 测试：`packages/next-sdk/test/page-tools/page-agent-tool-dispatch.test.ts`
    - 复现：操作类结束后再次 `show({ showCursor: false })`
    - `cursorMode: 'never' | 'always'` 行为

- [x] Task 4：用户文档与 Skill
  - 产物：`docs/webmcp-sdk/page-agent-tool.md`、`packages/next-sdk/skills/page-agent/SKILL.md`、`packages/next-sdk/specs/README.md`

- [x] Task 5：验收命令通过
  - 命令：`pnpm -F @opentiny/next-sdk test`（221 passed）
  - 命令：`pnpm -F @opentiny/next-sdk build`

## 依赖顺序

1 → 2 → 3 → 4 → 5

## 验收命令

```bash
pnpm -F @opentiny/next-sdk test
pnpm -F @opentiny/next-sdk build
```

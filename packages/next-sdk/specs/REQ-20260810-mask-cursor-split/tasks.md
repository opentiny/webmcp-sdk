# Tasks：遮罩效果拆分 —— 呼吸灯与鼠标图标分层控制

每个任务应可独立验收；涉及行为变更的任务 **必须** 含测试子项。

## 任务列表

- [x] Task 1：改造 `SimulatorMask.show()` 支持 `showCursor` 选项
  - 输入：`packages/next-sdk/page-tools/page-agent-mask/SimulatorMask.ts`
  - 产物：`show(options?: { showCursor?: boolean })` 新签名，`hide()` 重置 cursor 显示状态
  - [x] 测试：`packages/next-sdk/test/page-tools/page-agent-tool-dispatch.test.ts` 中新增断言覆盖

- [x] Task 2：改造 `page-agent-tool.ts` 调度层，按 action 分两类控制遮罩
  - 输入：依赖 Task 1 完成
  - 产物：
    - `click`/`fill`/`select`/`hover`：`simulatorMask.show({ showCursor: true })` + `borderTargetElement`
    - `browserState`/`searchTree`/`executeJavascript`/`scroll`：`simulatorMask.show({ showCursor: false })`
  - [x] 测试：更新 `packages/next-sdk/test/page-tools/page-agent-tool-dispatch.test.ts`，新增遮罩模式 8 条用例

- [x] Task 3：验收命令通过 — 201 tests passed, build 通关
  - 命令：`pnpm -F @opentiny/next-sdk test` 
  - 命令：`pnpm -F @opentiny/next-sdk build`

## 依赖顺序

1 → 2 → 3

## 验收命令

```bash
pnpm -F @opentiny/next-sdk test
pnpm -F @opentiny/next-sdk build
```

# Spec：Page Agent 用户手动操作事件（page-agent-user-do-action）

## 元信息

- 状态：已交付（代码已实现，Spec 事后补建）
- 主责包：`packages/next-sdk`
- 关联 Issue：（口头 / 联调需求，无强制 Issue）

## 背景

`registerPageAgentTool` 在 Agent 执行期间会展示 SimulatorMask，引导用户观察 AI 操作。此时用户仍可能手动点击页面（例如在遮罩展示期间介入）。宿主（如 WXT 扩展、Remoter UI）需要感知这类**真实用户点击**，以便同步状态、打断 Agent 或做埋点，但此前事件桥仅覆盖 `page-agent-tool-call` / `page-agent-tool-result` / `page-agent-chat-end`，缺少用户侧操作通知。

## 领域术语表

- **refMap**：page-agent-tool 最近一次工具调用解析出的 index → DOM 元素映射，由 `ActionContext.getRefMap()` 提供。
- **trusted 事件**：浏览器 `MouseEvent.isTrusted === true`，表示用户真实触发，非脚本 `dispatchEvent` 合成。

## 目标用户 / 场景

- 扩展或聊天 UI 在 mask 展示期间监听用户点击 refMap 内元素，与 Agent 工具调用区分。
- 联调方通过 `window.addEventListener('page-agent-user-do-action', …)` 接入，无需改 page-agent-tool 内部。

## 参考资料 / 上下文

- `packages/next-sdk/page-tools/page-agent-tool-event.ts`：`setupPageAgentToolEventBridge`
- `packages/next-sdk/page-tools/page-agent-tool.ts`：注册工具时挂载事件桥
- 既有事件常量：`PAGE_AGENT_TOOL_CALL_EVENT` 等（同文件）

## 范围

### In Scope

- 新增事件常量 `PAGE_AGENT_USER_DO_ACTION_EVENT`（值 `'page-agent-user-do-action'`）。
- 在 `setupPageAgentToolEventBridge` 中监听 `window` 捕获阶段 `click`。
- 满足条件时向 `window` 派发 `CustomEvent`，`detail` 含 `action: 'click'` 与 refMap 命中的 DOM 根节点 `dom`。
- 触发条件：`ev.isTrusted` 且 `pageController.mask.shown === true`，且点击目标落在当前 `refMap` 某元素子树内。
- 与既有事件桥共用 `__nextSdkPageAgentToolEventCleanup` 卸载逻辑。

### Out of Scope

- 除 `click` 外的用户操作类型（键盘、滚动等；`detail.action` 预留扩展）。
- mask 未展示时的用户点击通知。
- 脚本合成的非 trusted 点击。
- 宿主侧具体消费逻辑（各包按需接入）。

## 用户故事与验收标准

1. 作为集成方，我希望在 Agent mask 展示期间感知用户真实点击 ref 元素，以便区分「用户介入」与「Agent 工具调用」。
   - 验收：mask 已 `show`、refMap 含元素 A；用户对 A 内子节点 trusted 点击 → 收到 `page-agent-user-do-action`，`detail.action === 'click'`，`detail.dom === A`。
2. 作为集成方，我不希望在 mask 隐藏或点击落在 refMap 外时收到误报。
   - 验收：mask 未展示时不派发；点击不在任何 refMap 元素 `contains` 范围内时不派发。
3. 作为集成方，我不希望 Agent 或测试脚本合成的点击触发该事件。
   - 验收：`isTrusted === false` 的 click 不派发。
4. 作为维护者，我希望重复 `registerPageAgentTool` 不会叠加多个 click 监听。
   - 验收：再次注册前先执行 cleanup，仅保留一套监听。

## 非功能要求

- 捕获阶段监听，尽量在目标处理前完成 ref 解析；不阻止事件默认传播。
- 与现有三个 page-agent  window 事件命名风格一致。

## 完成定义

- [x] `design.md` / `tasks.md` 已齐
- [ ] 自动化测试已实现（见 `tasks.md` Task 4，待补）
- [ ] 包入口导出 `PAGE_AGENT_USER_DO_ACTION_EVENT` 与 `PageAgentUserDoActionEventDetail`（见 `tasks.md` Task 3，待补）
- [x] `pnpm -F @opentiny/next-sdk test` 无回归

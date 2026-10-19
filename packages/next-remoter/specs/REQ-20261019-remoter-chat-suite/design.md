# Spec：design.md — next-remoter 对接 TinyRobot chat 套件

## 方案概述

```
TinyRemoter.vue（≤250 行：props 归一化 + 壳）
 ├─ <TrChat :runtime :ui :slots>              ← 套件负责全部 UI/面板/会话状态机
 └─ useRemoterRuntime(props, agent)           ← 唯一适配层（新建）→ ChatRuntime
      ├─ conversation：useConversation（kit，沿用 autoSave/本地存储）
      ├─ send：CustomAgentModelProvider（缩减为纯“Agent 流 → ChatMessageItem”）
      ├─ model：llmConfigs → ChatModelRuntime（options/selectedId/features）
      ├─ mcp：usePlugin 缩减为 ChatMcpRuntime（servers/tools/add/remove/enable）
      └─ beforeSend：skills / 识别码(/abc123) / 附件校验
```

选型：用 **`useChatRuntimeFromConversation`**（保留 kit `useConversation` 与自定义 `send`），
而非 `useChatRuntime`（后者内置 openai/deepseek/qwen provider，无法走 next-sdk Agent）。
`mcp` 走 `useChatRuntime` 的 `mcp` adapter 形态：`{ runtime: ChatMcpRuntime, listTools, callTool }` 的 runtime 部分由 `usePlugin` 瘦身后提供。

> ⚠️ 以下为基于 `rc.2` 的 `.d.ts` 推断，**Task 1 需先做 PoC 验证**：①`TrChat` 是否支持 `send` 自管流式（assistant 增量写回 messages）；②GenUI `schema-card` 能否通过 bubble content renderer 注册；③`floatingState` 能否复刻 `remoter` 悬浮/全屏；④附件 UI 是否内置。

## 涉及模块 / 文件

| 文件 | 处理 |
|---|---|
| `components/TinyRobotChat.vue` | 重写为薄壳（858 → ≤250 行） |
| `composable/useRemoterRuntime.ts` | **新增**，唯一适配层 |
| `composable/useTinyRobotChat.ts`（184） | 删除，逻辑并入适配层 |
| `composable/useConversationHistory.ts`（129） | 删除（套件 history 接管） |
| `composable/useMessageRoles.ts`（210） | 删除，仅保留头像映射为 `ui.brand` / bubble roles 配置 |
| `components/ModelSwitch.vue` / `GenUISwitch.vue`(部分) / `PluginToggleButton.vue` / `Button.vue` | 删除；GenUI 开关改走 `model.features` 或 `sender-footer` 插槽 |
| `composable/usePlugin.ts`（413）/ `usePluginSession.ts` / `useCustomMcpServer.ts` | 缩减，输出 `ChatMcpRuntime`；扫码/session 保留 |
| `composable/CustomAgentModelProvider.ts`（534） | 缩减，仅保留 Agent 流转换（`streamVisitor.ts` 保留） |
| `multimodal/*`、`BubbleImageRenderer.vue` | 若套件 sender 自带附件则删，否则经 `sender-header` 插槽保留 |
| `components/QrCodeScan.vue`、`TokenUsage.vue` | 保留，挂到 `layout-header` / `sender-footer` 插槽 |
| `index.ts`、`package.json`、`pnpm-workspace.yaml` catalog | 升级依赖，导出新增类型 |

## 核心数据结构 / 类型定义

```ts
// composable/useRemoterRuntime.ts
import type { ChatRuntime, ChatUIOptions } from '@opentiny/tiny-robot-chat'

export interface RemoterRuntimeContext {
  agent: AgentModelProvider['agent']
  runtime: ChatRuntime
  /** 供 expose 使用 */
  addMessage(msg: ChatMessageItem): void
  setInput(text: string): void
}

export function useRemoterRuntime(props: RemoterProps, emit: RemoterEmit): RemoterRuntimeContext
```

## 依赖变更

- 新增 `@opentiny/tiny-robot-chat`（精确版本，如 `1.0.0-rc.2`）
- `@opentiny/tiny-robot` / `-kit` / `-svgs`：`0.3.1-alpha.6` → 与 chat 一致的 `1.0.0-rc.x`（chat 包自身依赖 `0.5.1`，**版本对齐需 PoC 确认**，避免出现双份 tiny-robot）
- `src/index.ts` 额外 `import '@opentiny/tiny-robot-chat/dist/style.css'`
- `@modelcontextprotocol/sdk` 由 chat 带入，需与 next-sdk 版本去重

## API / 行为变更

### API 变更登记表（初稿，实现中持续更新，**每个改动必须登记**）

**Props**

| 符号 | 结论 | 说明 / 迁移 |
|---|---|---|
| `agentRoot` `sessionId` `remoteUrl` `qrCodeUrl` `menuItems` `AILogoUrl` `inBrowserExt` | 保留 | 遥控器逻辑不变 |
| `systemPrompt` `llmConfig` `llmConfigs` `mcpServers` `skills` `customMarketMcpServers` `debugStream` `genUiComponents` | 保留 | 均在适配层消费 |
| `title` | 保留 | 映射 `ui.brand` |
| `locale` | **改造** | 值保持 `zh-CN/en-US`，内部映射 `ui.labels`；`lang.ts` 删除 |
| `roleAvatar` | **改造** | 仍接受 VNode；内部转成 bubble roles 配置。若套件仅支持组件/URL，则 **破坏性**：改为 `{user: Component\|string, assistant: ...}` |
| `mode`（`remoter`/`chat-dialog`） | 保留 | 映射 `layout` + `floatingState` |
| `layoutMode`（CSS position） | **改造/待定** | 若套件 `layout` 已覆盖定位则废弃，保留一版兼容并 `console.warn` |
| `promptItems` | 保留 | 映射 `data.prompts` |
| `pillItems` | **待定** | 套件无对应时经 `composer-before` 插槽保留；有等价能力则改造 |
| `allowSpeech` | **待定** | 取决于套件 sender 是否内置语音；否则经 `sender-footer-right` 保留 |
| `v-model:show` `v-model:fullscreen` | 保留 | 映射 `floatingState` |
| `v-model:selectedModelId` | 保留 | 双向同步 `ChatModelRuntime.selectedId` |
| `v-model:genUiAble` | 保留 | 映射 `model.features` 的自定义 feature 或 footer 开关 |
| `v-model:enabledTools` | 保留 | 双向同步 `ChatMcpRuntime.tools` 启停 |
| **新增** `ui` | 新增 | 透传 `ChatUIOptions`，让用户自定义套件细节，替代大量零散 props |

**Emits**

| 符号 | 结论 |
|---|---|
| `before-ai-render` | 保留（适配层在写入 messages 前触发） |
| `chat-stream-finish` | 保留 |

**Slots**

| 符号 | 结论 | 映射 |
|---|---|---|
| `welcome` | 改造 | `layout-empty-state` |
| `suggestions` | 改造 | `composer-before` |
| `operations` | 改造 | `layout-header` |
| `header-actions` | 改造 | `extension-header-actions` |
| 其余套件插槽 | 新增 | 直接透传 `ChatUISlots` |

**Expose**（`defineExpose`）

| 符号 | 结论 |
|---|---|
| `agent` `messages` `messageState` `inputMessage` `abortRequest` `sendMessage` `addMessage` `loadMcpServerToPlugin` `handleClientDisconnected` `installedPlugins` `addPluginCore` `deletePlugin` `refreshPluginTools` | 保留（签名不变，内部转调适配层） |
| `roles` `welcomeIcon` `senderRef` | **废弃**（套件内部实现，不再暴露；README 给替代方案） |
| `registerContentRenderer` | 保留，转调套件 bubble 渲染器注册 |
| **新增** `runtime` | 暴露 `ChatRuntime` 供高级用户直接操作 |

**包级导出 / 依赖**

| 符号 | 结论 |
|---|---|
| `TinyRemoter` / `useModel` / 类型 | 保留 |
| `@opentiny/tiny-robot*` peer 版本 | **破坏性**：升到 1.0 rc，业务方样式/主题变量需复核 |
| `dist/style.css` 引入方式 | 改造：additionally 引入 chat 样式（已在 `index.ts` 内置，业务方无需改） |

**行为**

| 行为 | 变更 |
|---|---|
| 首屏自动 `createConversation`（`setTimeout 100`） | 由套件/runtime 初始化，可能出现“已有历史则恢复上次会话”，需确认并登记 |
| 工具调用/推理过程展示 | 改由套件 bubble 渲染（外观变化） |
| 快捷菜单样式 | 外观变化 |

## 数据流

```mermaid
flowchart LR
  U[TrChat sender submit] --> BS[beforeSend: skills / sessionId / 附件]
  BS --> SEND[runtime.actions.send]
  SEND --> AG[next-sdk Agent 流]
  AG --> SV[streamVisitor → ChatMessageItem]
  SV --> MSG[activeConversation.messages]
  MSG --> UI[TrChat 气泡 / GenUI renderer]
```

## 风险与兼容

1. **chat 套件仍为 rc**：API 可能变；适配层单文件隔离 + 锁精确版本。
2. **tiny-robot 版本分裂**：chat 依赖 `0.5.1`，rc 轨为 `1.0.0-rc.x`，需确认 pnpm 解析不出现双份。
3. **GenUI 流式渲染**依赖 `messageState.status` 与 `schema-card` content 类型，套件消息模型（`ChatMessageItem.state/metadata/ChatMessagePart`）与旧 `uiContent` 不同，需映射。
4. **多模态/语音/扫码**可能套件缺失，退化为插槽自实现（计入保留代码量）。
5. 外观变化属行为变更，需在 CHANGELOG 标注。

## 备选方案

- A：仅升级依赖、不换壳 —— 代码量不降，**不满足 Issue 目标**。
- B（推荐）：`TrChat` + `useChatRuntimeFromConversation`，如上。
- C：完全自写 `ChatRuntime`（不用 kit `useConversation`）—— 灵活但代码更多，仅当 B 的 PoC 失败时采用。

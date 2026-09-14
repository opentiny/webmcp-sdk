# Spec: 适配 tiny-robot-chat 组件需求分析

## 元信息

- 状态：开发中
- 主责包：`packages/next-remoter`
- 关联 Issue：https://github.com/opentiny/webmcp-sdk/issues/552

## 背景

`@opentiny/next-remoter` 原有实现直接在 `TinyRobotChat.vue` 中拼装 `@opentiny/tiny-robot`（0.3.x）的零散基础组件（`tr-container`、`tr-bubble-list`、`tr-sender`、`TrHistory`、`TrMcpServerPicker` 等），代码冗长且维护成本高。
TinyRobot 最新推出了专用的聊天套件包 `@opentiny/tiny-robot-chat`（0.5.2-alpha.16），内置了成熟的响应式 Chat 页面、会话驱动、输入流与工具槽位。
本需求要求将 `next-remoter` 重构为直接基于 `@opentiny/tiny-robot-chat` 聊天套件，同时在该组件基础上扩展 WebMCP 与 WebSkills 能力。

## 核心约束（API 100% 保持，功能零丢失）

1. **现有对外保留的 API 必须严格不变**：
   - **22 个 Props 签名及默认值保持完全一致**：`agentRoot`, `sessionId`, `menuItems`, `remoteUrl`, `qrCodeUrl`, `systemPrompt`, `title`, `locale`, `AILogoUrl`, `roleAvatar`, `mode`, `llmConfig`, `inBrowserExt`, `genUiComponents`, `customMarketMcpServers`, `mcpServers`, `llmConfigs`, `skills`, `layoutMode`, `debugStream`, `promptItems`, `pillItems`, `allowSpeech`；
   - **5 个 `v-model` 双向绑定机制不变**：`fullscreen`, `show`, `selectedModelId`, `genUiAble`, `enabledTools`；
   - **2 个核心业务事件及 `update:*` 事件保持一致**：`before-ai-render`, `chat-stream-finish`；
   - **4 个插槽透传兼容**：`#welcome`, `#suggestions`, `#operations`, `#header-actions`；
   - **17 个 `defineExpose` 属性与方法完整暴露**：`agent`, `welcomeIcon`, `messages`, `messageState`, `roles`, `inputMessage`, `senderRef`, `abortRequest`, `sendMessage`, `loadMcpServerToPlugin`, `handleClientDisconnected`, `addMessage`, `installedPlugins`, `addPluginCore`, `deletePlugin`, `registerContentRenderer`, `refreshPluginTools`；
   - **对外类型导出 100% 兼容**：`TinyRemoter`, `useModel`, `* from './types/type'`, `* from './types/model-config'`。
2. **所有现有功能零丢失**：
   - WebMCP 浏览器内置工具调用（`document.modelContext` / `initializeBuiltinWebMCP` / page tools）、工具状态动态同步；
   - WebSkills（`skills` prop）技能元数据解析与大模型 `get_skill_content` 动态激活机制；
   - 多模型配置与切换（支持 `llmConfigs`、自定义 headers、providerOptions 等）；
   - 生成式 UI（GenUI）卡片渲染及 `continueChat` 交互；
   - 多模态文件/图片上传能力（根据当前模型能力动态启用）；
   - 扫码投屏与悬浮遥控器（Remoter 模式与 `sessionId` 识别）；
   - 语音输入（`allowSpeech`）、布局模式（`layoutMode`）与全屏自适应。

## 范围

### In Scope
- 升级/引入 `@opentiny/tiny-robot-chat@0.5.2-alpha.16` 及相关依赖；
- 基于 `TrChat` 重构 `TinyRobotChat.vue`；
- 扩展 WebMCP 工具注入与 WebSkills 处理；
- 补齐自动化测试覆盖对外 API 契约与核心功能。

### Out of Scope
- 改变外部既有 API 调用方式；
- 改变底层 WebMCP 协议规范。

## 用户故事与验收标准

1. 作为开发者使用 `<tiny-remoter>`：
   - 验收：升级后无需修改任何 Props / Emits / Slots / Expose 代码，已有业务代码零感知无缝运行。
2. 作为用户使用 Remoter 聊天：
   - 验收：消息正常流式生成，可使用网页 WebMCP 工具，可触发 WebSkills，可切换模型，可使用 GenUI 卡片，可扫码投屏。


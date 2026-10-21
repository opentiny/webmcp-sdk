# Spec：doc-ai 用 TinyRobot Chat 套件对接 WebMCP

## 元信息

- 状态：已交付
- 主责包：`packages/doc-ai`
- 关联 Issue：无（示例应用内替换对话框）

## 背景

doc-ai 右侧 AI 对话框目前使用 `@opentiny/next-remoter`。TinyRobot Chat 套件（`TrChat` + `useChatRuntime`）已经负责界面和模型请求，示例应用应改为用套件承载对话框，模板本身只负责把 next-sdk 注册在 `document.modelContext` 上的 WebMCP 工具交给套件。

在线文档：https://sonyleo.github.io/tiny-robot/alpha/suites/quick-start.html

npm 上 `@opentiny/tiny-robot-chat` 已发布的最高版本是 `1.0.0-rc.2`，不存在 `1.0.0-rc.12`。实现按已发布的 `1.0.0-rc.2` 与上述文档中的 `useChatRuntime` / `mcp` 适配器协议。

## 目标用户 / 场景

doc-ai 示例的开发者：在业务页用 `registerTool` 暴露页面工具后，右侧对话框能列出并调用这些工具，而不再挂载 Remoter。

## 参考资料 / 上下文

- `packages/doc-ai/src/App.vue`
- `packages/next-sdk/agent/utils/getBuiltinMcpTools.ts`
- TinyRobot Chat：`useChatRuntime({ modelProviders, mcp })`

## 范围

### In Scope

- 在 `packages/doc-ai` 增加可复制的 Chat 模板，用 `TrChat` + `useChatRuntime`
- 模板把 `document.modelContext` 的 `getTools` / `executeTool` / `toolchange` 适配为套件的 MCP 适配器
- doc-ai 右侧面板改为该模板，移除对 `@opentiny/next-remoter` 的依赖
- 对话结束时继续派发 `page-agent-chat-end`，以便收起 page-agent 遮罩
- 界面使用 `TrChat` 原生布局，模板不自定义欢迎卡片、快捷指令、复制或头部插槽
- 技能走套件 `skillPlugin`（`select_skills`），不在模板里再注册 `get_skill_content`

### Out of Scope

- 不修改 `@opentiny/next-sdk` / `@opentiny/next-remoter` 的公开 API
- 不做扫码、识别码、远程遥控菜单
- 不改各业务页已注册的工具 schema

## 用户故事与验收标准

1. 作为示例使用者，我希望右侧对话框是 TinyRobot Chat，以便界面和发消息都由套件完成。
   - 验收：`App.vue` 不再引用 `TinyRemoter`；面板渲染 `TrChat`。
2. 作为示例使用者，我希望模型能调用当前页面的 WebMCP 工具。
   - 验收：适配器读取 `document.modelContext.getTools()`（或 `listTools`），执行时调用 `executeTool(descriptor, JSON.stringify(args))`；`toolchange` 后工具列表更新。
3. 作为示例使用者，我希望 Agent 操作结束后遮罩能收起。
   - 验收：请求从 `processing` 离开时派发 `page-agent-chat-end`。

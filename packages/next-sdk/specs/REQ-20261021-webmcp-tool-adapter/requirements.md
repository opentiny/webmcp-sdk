# Spec：WebMCP 工具公共适配

## 元信息

- 状态：已交付
- 主责包：`packages/next-sdk`
- 关联 Issue：无

## 背景

doc-ai 的 Chat 模板自己实现了 `document.modelContext` 到 TinyRobot Chat `mcp` 的适配。这段协议逻辑和界面绑在一起，换一个 MCP 宿主还得重写一遍 `listTools` / `executeTool`。

主流接入都认同一套工具面：列出工具、按名调用、在工具集合变化时更新。Chat 套件的自定义 `mcp` 适配器是这套面上的一种投影，ai-sdk 的 `getBuiltinMcpTools` 是另一种。

## 目标用户 / 场景

在浏览器里注册了 WebMCP 工具的应用，希望把这些工具交给 Chat 套件或其它按 MCP `tools/list` + `tools/call` 工作的宿主。

## 参考资料 / 上下文

- `packages/doc-ai/src/templates/WebMcpChat.vue`
- `packages/next-sdk/agent/utils/getBuiltinMcpTools.ts`
- TinyRobot Chat：`useChatRuntime({ mcp })`

## 范围

### In Scope

- 在 `@opentiny/next-sdk` 导出 `createWebMcpToolAdapter`
- 适配器提供 `listTools` / `callTool` / `subscribe`
- 同一适配器可投影成 Chat 套件的 `mcp` 对象，响应式由调用方注入，SDK 不依赖 Vue 或 tiny-robot-chat
- doc-ai 模板改为使用该导出

### Out of Scope

- 不改 `getBuiltinMcpTools` 的 ai-sdk 行为
- 不实现 HTTP `mcpServers.baseUrl` 传输
- 不改各业务页工具 schema

## 用户故事与验收标准

1. 作为接入方，我希望用同一套 API 列出并调用页面 WebMCP 工具。
   - 验收：`listTools` 读取 `listTools ?? getTools`；`callTool` 调用 `executeTool(descriptor, JSON.stringify(args))` 并返回文本。
2. 作为 Chat 套件使用者，我希望把适配器交给 `useChatRuntime({ mcp })`。
   - 验收：`createChatMcpAdapter` 返回的工具名是 `${serverId}__${toolName}`，`callTool` 使用原始工具名。
3. 作为接入方，我希望工具随页面变化更新。
   - 验收：`toolchange` 后 `subscribe` 收到通知，再次 `listTools` 反映新集合。

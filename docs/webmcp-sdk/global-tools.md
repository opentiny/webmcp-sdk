# 全局 API

主要介绍 `@opentiny/next-sdk` 导出的其它全局 API，包括内置 WebMCP 初始化以及 AI SDK 兼容转换方法。

> Page Agent 相关 API（`registerPageAgentTool`、`a11yConfig` 等）已单独成章，见 [registerPageAgentTool](./page-agent-tool)。

---

## initializeBuiltinWebMCP()

在浏览器环境中初始化内置的 WebMCP 运行环境。该函数会注入 `document.modelContext` 的 JS Polyfill。

Chromium Origin Trial 阶段的原生 `modelContext.getTools()` / `registerTool()` 可能通过 Mojo IPC 触发渲染进程崩溃（`RESULT_CODE_KILLED_BAD_MESSAGE`）。上游 `@mcp-b/webmcp-polyfill`（本仓库当前 5.1.0）见 native 即跳过且不再提供 `forceOverride`。5.x 把 getter 装在 `Document.prototype`，SDK **默认 `forcePolyfill: true`**：先影子化 `document` / `navigator` 上的非 polyfill 实现，初始化后再把 JS polyfill 挂到 document 实例，避免走到会崩溃的原生 `getTools()`。仅在确认原生 WebMCP 可用时传入 `{ forcePolyfill: false }`。

请在页面入口尽早调用（`registerPageAgentTool()` 内部会调用本函数）。不要在初始化前把 `document.modelContext` 存进闭包，否则可能仍持有 native 引用。

`@mcp-b/webmcp-polyfill@5.1.0` 的 `document.modelContext.registerTool()` 返回 Promise。工具会在 Promise resolve 前写入 registry，但重复名、非法描述、已 abort 的 `signal` 会 reject；同步 `try/catch` 接不住。SDK 的 `registerPageAgentTool()` 已 `.catch`。业务自行注册时请 `await` 或 `.catch`：

```typescript
void document.modelContext.registerTool(tool, { signal }).catch((err) => {
  console.warn('registerTool failed', err)
})
```

**类型签名**

```typescript
export function initializeBuiltinWebMCP(options?: {
  /** @default true */
  forcePolyfill?: boolean
}): void
```

**代码示例**

```typescript
import { initializeBuiltinWebMCP } from '@opentiny/next-sdk'

// 默认强制 JS polyfill，避免实验性原生 API 杀进程
initializeBuiltinWebMCP()

// 确认原生实现可用后再关闭强制覆盖
// initializeBuiltinWebMCP({ forcePolyfill: false })
```

---

## getAISDKTools()

将 `WebMcpClient` 的工具列表快速转换成 Vercel AI SDK 兼容的格式，方便大模型（如 `AgentModelProvider` 等）直接调用 MCP 暴露的工具。

**类型签名**

```typescript
import { WebMcpClient } from '@opentiny/next-sdk'
import { ToolSet } from 'ai'

export function getAISDKTools(client: WebMcpClient): Promise<ToolSet>
```

**参数说明**

- `client: WebMcpClient` - 一个已连接并准备就绪的 `WebMcpClient` 实例。

**返回值**

- `Promise<ToolSet>` - 返回转换后的 Vercel AI SDK `dynamicTool` 工具集对象。

**代码示例**

```typescript
import { getAISDKTools, WebMcpClient } from '@opentiny/next-sdk'
import { generateText } from 'ai'

const client = new WebMcpClient()
// 连接到 MCP Server...
await client.connect(transport)

// 将 MCP 工具转换为 AI SDK 兼容工具
const tools = await getAISDKTools(client)

// 直接配合 AI SDK 使用
const result = await generateText({
  model: yourModelProvider,
  messages: [{ role: 'user', content: '请帮我查询当前的系统状态' }],
  tools
})
```

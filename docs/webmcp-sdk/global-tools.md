# 全局 API

主要介绍 `@opentiny/next-sdk` 导出的其它全局 API，包括内置 WebMCP 初始化以及 AI SDK 兼容转换方法。

> Page Agent 相关 API（`registerPageAgentTool`、`a11yConfig` 等）已单独成章，见 [registerPageAgentTool](./page-agent-tool)。

---

## initializeBuiltinWebMCP()

在浏览器环境中初始化内置的 WebMCP 运行环境。该函数会自动注入 `modelContext` Polyfill，并设置页面与宿主环境（如浏览器插件或父页面）的桥接通信通道。

**类型签名**

```typescript
export function initializeBuiltinWebMCP(): void
```

**代码示例**

```typescript
import { initializeBuiltinWebMCP } from '@opentiny/next-sdk'

// 在页面入口处调用，用于初始化浏览器环境的 modelContext 桥接
initializeBuiltinWebMCP()
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

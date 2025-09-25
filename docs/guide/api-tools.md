# 工具函数

```typescript
import {
  // WebMcpClient 相关方法
  createSSEClientTransport,
  createStreamableHTTPClientTransport,
  createMessageChannelClientTransport,
  isSSEClientTransport,
  isStreamableHTTPClientTransport,
  isMessageChannelClientTransport,
  isMcpClient,

  // WebMcpServer 相关方法
  createMessageChannelServerTransport,
  createMessageChannelPairTransport,
  isMessageChannelServerTransport,
  isMcpServer
} from '@opentiny/next-sdk'
```

## createSSEClientTransport()

创建一个基于 SSE (Server-Sent Events) 的 MCP 客户端传输实例。

**类型**

```typescript
function createSSEClientTransport(url: URL, opts?: SSEClientTransportOptions): SSEClientTransport
```

**参数**

- `url: URL` - SSE 服务器的 URL
- `opts?: SSEClientTransportOptions` - SSE 客户端传输配置选项(可选)

**返回值**

返回一个新的 SSEClientTransport 实例

**示例**

```typescript
const url = new URL('http://localhost:3000/sse')
const transport = createSSEClientTransport(url)
```

## createStreamableHTTPClientTransport()

创建一个基于 HTTP 流的 MCP 客户端传输实例。

**类型**

```typescript
function createStreamableHTTPClientTransport(
  url: URL,
  opts?: StreamableHTTPClientTransportOptions
): StreamableHTTPClientTransport
```

**参数**

url: URL - HTTP 服务器的 URL
opts?: StreamableHTTPClientTransportOptions - HTTP 客户端传输配置选项(可选)

**返回值**

返回一个新的 StreamableHTTPClientTransport 实例

**示例**

```typescript
const url = new URL('http://localhost:3000/stream')
const transport = createStreamableHTTPClientTransport(url)
```

## createMessageChannelClientTransport()

创建一个基于 MessageChannel 的 MCP 客户端传输实例。

**类型**

```typescript
function createMessageChannelClientTransport(endpoint: string, globalObject?: object): MessageChannelClientTransport
```

**参数**

endpoint: string - MessageChannel 服务端点
globalObject?: object - 全局对象(可选)

**返回值**

返回一个新的 MessageChannelClientTransport 实例

**示例**

```typescript
const transport = createMessageChannelClientTransport('ws://localhost:3000')
```

## isSSEClientTransport()

检查传入的传输实例是否为 SSE 客户端传输。

**类型**

```typescript
function isSSEClientTransport(transport: unknown): transport is SSEClientTransport
```

**参数**

transport: unknown - 要检查的传输实例

**返回值**

返回 boolean - 如果是 SSE 客户端传输则返回 true

**示例**

```typescript
const transport = createSSEClientTransport(new URL('http://localhost:3000'))
if (isSSEClientTransport(transport)) {
  // 处理 SSE 传输
}
```

## isStreamableHTTPClientTransport()

检查传入的传输实例是否为 HTTP 流客户端传输。

**类型**

```typescript
function isStreamableHTTPClientTransport(transport: unknown): transport is StreamableHTTPClientTransport
```

**参数**

transport: unknown - 要检查的传输实例

**返回值**

返回 boolean - 如果是 HTTP 流客户端传输则返回 true

**示例**

```typescript
const transport = createStreamableHTTPClientTransport(new URL('http://localhost:3000'))
if (isStreamableHTTPClientTransport(transport)) {
  // 处理 HTTP 流传输
}
```

## isMessageChannelClientTransport()

检查传入的传输实例是否为 MessageChannel 客户端传输。

**类型**

```typescript
function isMessageChannelClientTransport(transport: unknown): transport is MessageChannelClientTransport
```

**参数**

transport: unknown - 要检查的传输实例

**返回值**

返回 boolean - 如果是 MessageChannel 客户端传输则返回 true

**示例**

```typescript
function isMessageChannelClientTransport(transport: unknown): transport is MessageChannelClientTransport
```

## isMcpClient()

检查传入的实例是否为 MCP 客户端。

**类型**

```typescript
function isMcpClient(client: unknown): client is Client
```

**参数**

client: unknown - 要检查的客户端实例

**返回值**

返回 boolean - 如果是 MCP 客户端则返回 true

**示例**

```typescript
if (isMcpClient(client)) {
  // 处理 MCP 客户端
}
```

## createMessageChannelServerTransport()

创建一个基于 MessageChannel 的 MCP 服务端传输实例。

**类型**

```typescript
function createMessageChannelServerTransport(endpoint: string, globalObject?: object): MessageChannelServerTransport
```

**参数**

endpoint: string - MessageChannel 服务端点
globalObject?: object - 全局对象(可选)

**返回值**

返回一个新的 MessageChannelServerTransport 实例

**示例**

```typescript
const transport = createMessageChannelServerTransport('ws://localhost:3000')
```

## createMessageChannelPairTransport()

创建一对用于服务端和客户端之间通信的 MessageChannel 传输实例。

**类型**

```typescript
function createMessageChannelPairTransport(): [Transport, Transport]
```

**返回值**

返回一个包含两个 Transport 实例的数组,分别用于服务端和客户端

**示例**

```typescript
const [serverTransport, clientTransport] = createMessageChannelPairTransport()
```

## isMessageChannelServerTransport()

检查传入的传输实例是否为 MessageChannel 服务端传输。

**类型**

```typescript
function isMessageChannelServerTransport(transport: unknown): transport is MessageChannelServerTransport
```

**参数**

transport: unknown - 要检查的传输实例

**返回值**

返回 boolean - 如果是 MessageChannel 服务端传输则返回 true

**示例**

```typescript
const transport = createMessageChannelServerTransport('ws://localhost:3000')
if (isMessageChannelServerTransport(transport)) {
  // 处理 MessageChannel 服务端传输
}
```

## isMcpServer()

检查传入的实例是否为 MCP 服务端。

**类型**

```typescript
function isMcpServer(server: unknown): server is McpServer
```

**参数**

server: unknown - 要检查的服务端实例

**返回值**

返回 boolean - 如果是 MCP 服务端则返回 true

**示例**

```typescript
if (isMcpServer(server)) {
  // 处理 MCP 服务端
}
```

## getAISDKTools()

用来对接 `AgentModelProvider` 返回一个工具集对象, 对接后可以让 `AgentModelProvider` 实例直接调用 MCP 工具。

**类型**

```typescript
async getAISDKTools(client: WebMcpClient): Promise<ToolSet>
```
**参数**

- `client: WebMcpClient`: WebMcpClient 实例
**返回值**

- `Promise<ToolSet>`: 工具集对象
**示例**

```typescript
import { AgentModelProvider, getAISDKTools, WebMcpClient } from '@opentiny/next-sdk'

const webAgent = new AgentModelProvider({
  llmConfig: {
    apiKey: 'sk-xxx',
    baseURL: 'https://xxxxx',
    providerType: 'deepseek'
  }
})

const client = new WebMcpClient()

const tools = await getAISDKTools(client)

const generateTextResult = webAgent.chat({
  model: 'deepseek-ai/DeepSeek-V3',
  messages: [
    { role: 'system', content: '你是xxx' },
    { role: 'user', content: '1+1 等于多少？' }
  ],
  tools
  // .......
})
```

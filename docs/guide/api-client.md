# WebMcpClient 类

```typescript
import { WebMcpClient } from '@opentiny/next-sdk'
```

## constructor()

WebMcpClient 类的构造函数和 MCP 官方的 Client 类保持一致，都包含 clientInfo 和 options 两个参数。

**类型**

```typescript
constructor(clientInfo: Implementation, options?: ClientOptions)
```

**参数**
| 参数 | 描述 | 默认值
| --------------------------- | ------------- | -------
| clientInfo.name?: string | Client 名称 | mcp-client
| clientInfo.version?: string | Client 版本号 | 1.0.0
| options.capabilities? | Client 能力配置 | {}

**示例**

```typescript
const client = new WebMcpClient()
```

```typescript
const capabilities: ClientCapabilities = {
  roots: { listChanged: true },
  sampling: {},
  elicitation: {}
}

const client = new WebMcpClient({ name: 'my-app-client', version: '1.0.0' }, { capabilities })
```

## connect()

`Client`初始化之后，需要连接一个`Transport`通讯，进行服务端的功能调用，比如 `listTool`, `listResources`等。

`connect()` 方法支持以下三种连接模式：

1. **直连 Transport 对象**
   直接传入已实例化的 `Transport` 对象进行连接。

2. **非代理模式（配置直连）**
   传入 `WebMcpServer` 的配置信息。内部会自动辅助创建对应的 `Transport` 对象并完成连接。这是直连 `Transport` 对象的简化写法，免去了用户手动 `new Transport()` 的步骤。

3. **代理模式**
   传入 `WebMcpServer` 的配置信息并启用代理。这是 `WebMcpClient` 的核心创新功能，允许将当前连接的 `WebMcpServer` 端代理至 `Web Agent` 服务器。

   代理成功后，当前的 `WebMcpServer` 网页将变为受控端，并作为一个标准的 `MCP Server` 部署在 `Web Agent` 服务上，供其他 `MCP Client` 进行远程连接和操控。

   如果同时开启了 `builtin: true`，则会自动建立原生的 JSON-RPC 拦截层，将部分 MCP 请求（如 `tools/list`, `tools/call`）拦截并分发给所在浏览器的 `navigator.modelContextTesting` 原生上下文执行。这样可以让浏览器内置的能力（通过扩展或原生支持）直接透传给 Web Agent。

**类型声明**

```typescript
// WebMcpServer的配置信息
interface ClientConnectOptions {
  /** 是否代理模式 */
  agent?: boolean
  /** 是否开启浏览器内置 WebMCP 代理，拦截请求并代理给 navigator.modelContextTesting 执行。*/
  builtin?: boolean
  /** Transport类型。*/
  type?: 'channel' | 'sse' | 'stream' | 'socket'
  /** 代理模式时，传入 Web Agent 服务地址。
    非代理模式时，传入 MCP Server的url 地址。 */
  url: string
  /** 令牌*/
  token?: string
  /** 会话 ID。 不传入则自动创建一个id, 传入则可以固定会话id 。*/
  sessionId?: string
  /** 连接错误的回调函数*/
  onError?: (error: Error) => void
}

async connect(options: Transport | ClientConnectOptions):
              Promise<{ transport: Transport; sessionId: string }>

```

> 非代理模式，`type`支持以下 4 种类型：
>
> - `'channel'`：创建 `MessageChannelClientTransport` 以支持在网页内通信。
> - `'sse'`：创建 `SSEClientTransport` 以支持连接 SSE MCP Server 通信。
> - `'stream'`：创建 `StreamableHTTPClientTransport` 以支持 httpstreamable MCP Server 通信。
> - `'socket'`：创建 `WebSocketClientTransport` 以支持 Web-socket MCP Server 通信。
>
> 代理模式时，`type`仅支持 `'sse'` | `'stream'` | `'socket'` 选项，同时需要 `Web Agent` 服务端支持。

**返回值**

- `transport: Transport`
- `sessionId: string`

**示例**

1. 直连示例

```typescript
const [serverTransport, clientTransport] = createMessageChannelPairTransport()

client.connect(clientTransport)
```

2. 代理模式连接远程 WebAgent 服务

```typescript
client.connect({
  agent: true,
  url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp'
})
```

3. 固定 sessionId示例

```typescript
client.connect({
  agent: true,
  url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp',
  sessionId: 'stream06-1921-4f09-af63-51de410e9e09'
})
```

4. sse 连接示例

默认是通过 Streamable HTTP 方式与 WebAgent 进行连接，也可以通过配置 `type: 'sse'` 使用 SSE 方式进行连接

```typescript
client.connect({
  agent: true,
  type: 'sse',
  url: 'https://agent.opentiny.design/api/v1/webmcp-trial/sse',
  sessionId: 'stream06-1921-4f09-af63-51de410e9e09'
})
```

5. 错误回调函数示例

```typescript
client.connect({
  agent: true,
  url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp',
  sessionId: 'stream06-1921-4f09-af63-51de410e9e09',
  onError: (error) => {
    // 自定义错误处理逻辑
  }
})
```

6. 开启内置代理模式示例

开启 `builtin: true` 后，当前 Client 会拦截发向 Server 的请求，将其代理给浏览器的 `navigator.modelContextTesting` 原生上下文。

```typescript
client.connect({
  agent: true,
  url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp',
  builtin: true
})
```

## onclose()

连接关闭时的回调事件。当 close 方法被调用时也会触发该回调事件。

**类型**

```typescript
onclose?: () => void
```

**示例**

```typescript
client.onclose = () => {
  console.log('客户端连接已关闭')
}
```

## onerror()

发生错误时的回调函数。注意这些错误不一定是致命的,它们用于带外报告任何类型的异常情况。

**类型**

```typescript
onerror?: (error: Error) => void;
```

**参数**

- `error: Error`: 错误对象

**示例**

```typescript
client.onerror = (error) => {
  console.error('发生错误:', error.message)
}
```

## close()

关闭与服务器的连接。

**类型**

```typescript
async close(): Promise<void>
```

**返回值**

- `Promise<void>`

**示例**

```typescript
await client.close()
```

## getServerCapabilities()

获取服务器在初始化完成后报告的能力。

**类型**

```typescript
getServerCapabilities(): ServerCapabilities | undefined
```

**返回值**

- `ServerCapabilities | undefined`: 服务器能力对象

**示例**

```typescript
const capabilities = client.getServerCapabilities()
if (capabilities) {
  console.log('服务器支持的功能:', capabilities)
}
```

## getServerVersion()

获取初始化完成后的服务器名称和版本信息。

**类型**

```typescript
getServerVersion(): Implementation | undefined
```

**返回值**

- `Implementation | undefined`: 包含服务器名称和版本的对象

**示例**

```typescript
const version = client.getServerVersion()
if (version) {
  console.log('服务器版本:', version)
}
```

## getInstructions()

获取初始化完成后的服务器说明信息。

**类型**

```typescript
getInstructions(): string | undefined
```

**返回值**

- `string | undefined`: 服务器说明信息

**示例**

```typescript
const instructions = client.getInstructions()
if (instructions) {
  console.log('服务器说明:', instructions)
}
```

## ping()

向服务器发送 ping 请求以检查连接状态。

**类型**

```typescript
async ping(options?: RequestOptions)
```

**参数**

- `options?: RequestOptions`: 请求选项

**示例**

```typescript
await client.ping()
```

## complete()

向服务器发送补全请求。

**类型**

```typescript
async complete(params: CompleteRequest['params'], options?: RequestOptions)
```

**参数**

- `params: CompleteRequest['params']`: 补全请求参数
- `options?: RequestOptions`: 请求选项

**返回值**

- `Promise<Result>`: 补全结果

**示例**

```typescript
const result = await client.complete({
  prompt: '请继续写下去',
  context: '从前有座山'
})
```

## setLoggingLevel()

设置服务器的日志级别。

**类型**

```typescript
async setLoggingLevel(level: LoggingLevel, options?: RequestOptions)
```

**参数**

- `level: LoggingLevel`: 日志级别
- `options?: RequestOptions`: 请求选项

**示例**

```typescript
await client.setLoggingLevel('debug')
```

## getPrompt()

获取指定的提示信息。

**类型**

```typescript
async getPrompt(params: GetPromptRequest['params'], options?: RequestOptions)
```

**参数**

- `params: GetPromptRequest['params']`: 获取提示的参数
- `options?: RequestOptions`: 请求选项

**返回值**

- `Promise<Result>`: 提示信息结果

**示例**

```typescript
const prompt = await client.getPrompt({
  name: 'welcome',
  args: { username: 'John' }
})
```

## listPrompts()

列出服务器上所有可用的提示。

**类型**

```typescript
async listPrompts(params?: ListPromptsRequest['params'], options?: RequestOptions)
```

**参数**

- `params?: ListPromptsRequest['params']`: 列表参数
- `options?: RequestOptions`: 请求选项

**返回值**

- `Promise<Result>`: 提示列表

**示例**

```typescript
const prompts = await client.listPrompts()
console.log('Available prompts:', prompts)
```

## listResources()

列出服务器上所有可用的资源。

**类型**

```typescript
async listResources(params?: ListResourcesRequest['params'], options?: RequestOptions)
```

**参数**

`params?: ListResourcesRequest['params']`: 列表参数
`options?: RequestOptions`: 请求选项

**返回值**

- `Promise<Result>`: 资源列表

**示例**

```typescript
const resources = await client.listResources()
console.log('Available resources:', resources)
```

## listResourceTemplates()

列出服务器上所有可用的资源模板。

**类型**

```typescript
async listResourceTemplates(params?: ListResourceTemplatesRequest['params'], options?: RequestOptions)
```

**参数**

- `params?: ListResourceTemplatesRequest['params']`: 列表参数
- `options?: RequestOptions`: 请求选项

**返回值**

- `Promise<Result>`: 资源模板列表

**示例**

```typescript
const templates = await client.listResourceTemplates()
console.log('Available resource templates:', templates)
```

## readResource()

读取指定的资源。

**类型**

```typescript
async readResource(params: ReadResourceRequest['params'], options?: RequestOptions)
```

**参数**

- `params: ReadResourceRequest['params']`: 读取资源的参数
- `options?: RequestOptions`: 请求选项

**返回值**

- `Promise<Result>`: 资源内容

**示例**

```typescript
const resource = await client.readResource({
  uri: 'file://config.json'
})
console.log('Resource content:', resource)
```

## subscribeResource()

订阅服务器上的资源。

**类型**

```typescript
async subscribeResource(params: SubscribeRequest['params'], options?: RequestOptions)
```

**参数**

- `params: SubscribeRequest['params']`: 订阅参数
- `options?: RequestOptions`: 请求选项

**返回值**

- `Promise<Result>`: 订阅结果

**示例**

```typescript
const subscription = await client.subscribeResource({
  uri: 'file://config.json'
})
console.log('Subscription result:', subscription)
```

## unsubscribeResource()

取消订阅服务器上的资源。

**类型**

```typescript
async unsubscribeResource(params: UnsubscribeRequest['params'], options?: RequestOptions)
```

**参数**

- `params: UnsubscribeRequest['params']`: 取消订阅参数
- `options?: RequestOptions`: 请求选项

**返回值**

- `Promise<Result>`: 取消订阅结果

**示例**

```typescript
await client.unsubscribeResource({
  uri: 'file://config.json'
})
```

## callTool()

调用服务器上的工具。

**类型**

```typescript
async callTool(params: CallToolRequest['params'], options?: RequestOptions)
```

**参数**

- `params: CallToolRequest['params']`: 工具调用参数
- `options?: RequestOptions`: 请求选项

**返回值**

- `Promise<Result>`: 工具调用结果

**示例**

```typescript
const result = await client.callTool({
  name: 'calculator',
  args: {
    num1: 1,
    num2: 2,
    operator: '+'
  }
})
```

## listTools()

列出服务器上所有可用的工具。

**类型**

```typescript
async listTools(params?: ListToolsRequest['params'], options?: RequestOptions)
```

**参数**

- `params?: ListToolsRequest['params']:` 列表参数
- `options?: RequestOptions`: 请求选项

**返回值**

- `Promise<Result>`: 工具列表

**示例**

```typescript
const tools = await client.listTools()
console.log('Available tools:', tools)
```

## sendRootsListChanged()

向服务器发送根列表已更改的通知。

**类型**

```typescript
async sendRootsListChanged()
```

**示例**

```typescript
await client.sendRootsListChanged()
```

## request()

发送请求并等待响应。不要使用此方法发送通知,通知应使用 notification() 方法。

**类型**

```typescript
request<T extends ZodType<object>>(request: SendRequestT, resultSchema: T, options?: RequestOptions): Promise<z.infer<T>>
```

**参数**

- `request: Request`: 请求对象
- `resultSchema: T`: 结果的 Zod Schema
- `options?: RequestOptions`: 请求选项

**返回值**

- `Promise<z.infer<T>>`: 根据 Schema 类型推断的响应结果

**示例**

```typescript
const result = await client.request(
  {
    method: 'getData',
    params: { id: 123 }
  },
  z.object({
    data: z.string()
  })
)
console.log('Request result:', result)
```

## notification()

发送单向通知,不需要等待响应。

**类型**

```typescript
async notification(notification: SendNotificationT, options?: NotificationOptions): Promise<void>
```

**参数**

- `notification: Notification`: 通知对象
- `options?: NotificationOptions`: 通知选项

**示例**

```typescript
await client.notification({
  method: 'statusUpdate',
  params: {
    status: 'ready',
    timestamp: new Date().toISOString()
  }
})
```

## setRequestHandler()

注册一个请求处理程序,用于处理指定方法的请求。注意这将替换同一方法的任何现有请求处理程序。

**类型**

```typescript
setRequestHandler<
  T extends ZodObject<{
    method: ZodLiteral<string>;
  }>
>(
  requestSchema: T,
  handler: (request: z.infer<T>, extra: RequestHandlerExtra<SendRequestT, SendNotificationT>) => SendResultT | Promise<SendResultT>
): void
```

**参数**

- `requestSchema: T`: 请求的 Zod Schema
- `handler: Function`: 处理请求的函数

**示例**

```typescript
client.setRequestHandler(
  z.object({
    method: z.literal('getData'),
    params: z.object({
      id: z.number()
    })
  }),
  async (request, extra) => {
    return {
      result: `Data for ID ${request.params.id}`
    }
  }
)
```

## removeRequestHandler()

移除指定方法的请求处理程序。

**类型**

```typescript
removeRequestHandler(method: string): void
```

**参数**

- `method: string`: 要移除处理程序的方法名

**示例**

```typescript
client.removeRequestHandler('getData')
```

## setNotificationHandler()

注册一个通知处理程序,用于处理指定方法的通知。注意这将替换同一方法的任何现有通知处理程序。

**类型**

```typescript
setNotificationHandler<
  T extends ZodObject<{
    method: ZodLiteral<string>;
  }>
>(notificationSchema: T, handler: (notification: z.infer<T>) => void | Promise<void>): void
```

**参数**

- `notificationSchema: T`: 通知的 Zod Schema
- `handler: Function`: 处理通知的函数

**示例**

```typescript
client.setNotificationHandler(
  z.object({
    method: z.literal('statusUpdate'),
    params: z.object({
      status: z.string()
    })
  }),
  async (notification) => {
    console.log('Status updated:', notification.params.status)
  }
)
```

## removeNotificationHandler()

移除指定方法的通知处理程序。

**类型**

```typescript
removeNotificationHandler(method: string): void
```

**参数**

- `method: string`: 要移除处理程序的方法名

**示例**

```typescript
client.removeNotificationHandler('statusUpdate')
```

## onElicit()

注册一个问答请求的处理程序。

**类型**

```typescript
onElicit(
  handler: (
    request: z.infer<typeof ElicitRequestSchema>,
    extra: RequestHandlerExtra<SendRequestT, SendNotificationT>
  ) => SendResultT | Promise<SendResultT>
): void
```

**参数**

- `handler: Function`: 处理问答请求的函数

**示例**

```typescript
client.onElicit(async (request, extra) => {
  return {
    result: '用户输入的内容'
  }
})
```

## onCreateMessage()

注册一个创建 LLM 消息请求的处理程序。

**类型**

```typescript
onCreateMessage(
  handler: (
    request: z.infer<typeof CreateMessageRequestSchema>,
    extra: RequestHandlerExtra<SendRequestT, SendNotificationT>
  ) => SendResultT | Promise<SendResultT>
): void
```

**参数**

- `handler: Function`: 处理创建消息请求的函数

**示例**

```typescript
client.onCreateMessage(async (request, extra) => {
  return {
    id: 'msg-1',
    content: request.params.content
  }
})
```

## onListRoots()

注册一个列出根目录请求的处理程序。

**类型**

```typescript
onListRoots(
  handler: (
    request: z.infer<typeof ListRootsRequestSchema>,
    extra: RequestHandlerExtra<SendRequestT, SendNotificationT>
  ) => SendResultT | Promise<SendResultT>
): void
```

**参数**

- `handler: Function`: 处理列出根目录请求的函数

**示例**

```typescript
client.onListRoots(async (request, extra) => {
  return {
    roots: [
      { name: 'root1', uri: '/root1' },
      { name: 'root2', uri: '/root2' }
    ]
  }
})
```

## onToolListChanged()

注册一个工具列表变更通知的处理程序。

**类型**

```typescript
onToolListChanged(handler: (notification: z.infer<typeof ToolListChangedNotificationSchema>) => void | Promise<void>): void
```

**参数**

- `handler: Function`: 处理工具列表变更通知的函数

**示例**

```typescript
client.onToolListChanged(async (notification) => {
  console.log('工具列表已更新')
})
```

## onPromptListChanged()

注册一个提示列表变更通知的处理程序。

**类型**

```typescript
onPromptListChanged(handler: (notification: z.infer<typeof PromptListChangedNotificationSchema>) => void | Promise<void>): void
```

**参数**

- `handler: Function`: 处理提示列表变更通知的函数

**示例**

```typescript
client.onPromptListChanged(async (notification) => {
  console.log('提示列表已更新')
})
```

## onResourceListChanged()

注册一个资源列表变更通知的处理程序。

**类型**

```typescript
onResourceListChanged(handler: (notification: z.infer<typeof ResourceListChangedNotificationSchema>) => void | Promise<void>): void
```

**参数**

- `handler: Function`: 处理资源列表变更通知的函数

**示例**

```typescript
client.onResourceListChanged(async (notification) => {
  console.log('资源列表已更新')
})
```

## onResourceUpdated()

注册一个资源更新通知的处理程序。

**类型**

```typescript
onResourceUpdated(handler: (notification: z.infer<typeof ResourceUpdatedNotificationSchema>) => void | Promise<void>): void
```

**参数**

- `handler: Function`: 处理资源更新通知的函数

**示例**

```typescript
client.onResourceUpdated(async (notification) => {
  console.log('资源已更新:', notification.params.uri)
})
```

## onLoggingMessage()

注册一个日志消息通知的处理程序。

**类型**

```typescript
onLoggingMessage(handler: (notification: z.infer<typeof LoggingMessageNotificationSchema>) => void | Promise<void>): void
```

**参数**

- `handler: Function`: 处理日志消息通知的函数

**示例**

```typescript
client.onLoggingMessage(async (notification) => {
  console.log(`[${notification.params.level}] ${notification.params.message}`)
})
```

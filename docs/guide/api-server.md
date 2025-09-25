# WebMcpServer 类

```typescript
import { WebMcpServer } from '@opentiny/next-sdk'
```

## constructor()

WebMcpServer 类的构造函数和 MCP 官方的 McpServer 类保持一致，都包含 serverInfo 和 options 两个参数。

**类型**

```typescript
constructor(serverInfo: Implementation, options?: ServerOptions) 
```

**参数**

- `serverInfo.name?: string`：Server 名称，默认 'mcp-server'
- `serverInfo.version?: string`：Server 版本号，默认 '1.0.0'
- `options.capabilities?`：Server 能力配置

**示例**

```typescript
const server = new WebMcpServer()
```

```typescript
const capabilities: ServerCapabilities = {
  prompts: { listChanged: true },
  resources: { subscribe: true, listChanged: true },
  tools: { listChanged: true },
  completions: {},
  logging: {}
}

const server = new WebMcpServer({ name: 'my-app-server', version: '1.0.0' }, { capabilities })
```

## connect()

用于 Server 与各种类型的 ServerTransport 的连接。

**类型**

```typescript
async connect(options: Transport | string): Promise<Transport>
```

**参数**

- `options: Transport | string`：options 可以是一个 Transport，也可以是一个 endpoint 字符串

**返回值**

- `Promise<Transport>` - 已连接的传输层实例

**示例**

连接 serverTransport

```typescript
const [serverTransport, clientTransport] = createMessageChannelPairTransport()

server.connect(serverTransport)
```

连接 MessageChannelServerTransport 端点

```typescript
server.connect('endpoint')
```

## oninitialized()

服务器初始化完成时的回调函数(即客户端发送initialized通知后)。

**类型**

```typescript
oninitialized?: () => void
```

**示例**

```typescript
server.oninitialized = () => {
  console.log('服务器初始化完成');
};
```

## onclose()

连接关闭时的回调函数。当调用close()方法或连接因其他原因关闭时都会触发。

**类型**

```typescript
onclose?: () => void
```

**示例**

```typescript
server.onclose = () => {
  console.log('连接已关闭');
};
```

## onerror()

发生错误时的回调函数。注意错误不一定是致命的,它用于报告任何异常情况。

**类型**

```typescript
onerror?: (error: Error) => void
```

**参数**

- `error: Error` - 错误对象

**示例**

```typescript
server.onerror = (error) => {
  console.error('发生错误:', error.message);
};
```

## close()

关闭服务器连接。

**类型**

```typescript
async close(): Promise<void>
```

**返回值**

- `Promise<void>`

**示例**

```typescript
await server.close();
```

## registerTool()

注册一个新的工具到服务器。

**类型**

```typescript
registerTool<InputArgs extends ZodRawShape, OutputArgs extends ZodRawShape>(
  name: string,
  config: {
    title?: string;
    description?: string;
    inputSchema?: InputArgs;
    outputSchema?: OutputArgs;
    annotations?: ToolAnnotations;
  },
  cb: ToolCallback<InputArgs>
): RegisteredTool
```

**参数**

- `name: string` - 工具名称
- `config: object` - 工具配置对象
  - `title?: string` - 工具标题
  - `description?: string` - 工具描述
  - `inputSchema?: InputArgs` - 输入参数模式
  - `outputSchema?: OutputArgs` - 输出参数模式
  - `annotations?: ToolAnnotations` - 工具注解
- `cb: ToolCallback` - 工具回调函数

**返回值**

- `RegisteredTool` - 注册的工具实例

**示例**

```typescript
const weatherTool = server.registerTool(
  'getWeather',
  {
    title: '获取天气',
    description: '获取指定城市的天气信息',
    inputSchema: {
      city: z.string()
    },
    outputSchema: {
      temperature: z.number(),
      condition: z.string()
    }
  },
  async (params) => {
    // 实现获取天气的逻辑
    return { temperature: 25, condition: 'sunny' };
  }
);
```

## registerPrompt()

注册一个新的提示到服务器。

**类型**

```typescript
registerPrompt<Args extends PromptArgsRawShape>(
  name: string, 
  config: {
    title?: string;
    description?: string;
    argsSchema?: Args;
  },
  cb: PromptCallback<Args>
): RegisteredPrompt
```

**参数**

- `name: string` - 提示名称
- `config: object` - 提示配置对象
  - `title?: string` - 提示标题
  - `description?: string` - 提示描述
  - `argsSchema?: Args` - 参数模式
- `cb: PromptCallback` - 提示回调函数

**返回值**

- `RegisteredPrompt` - 注册的提示实例

**示例**

```typescript
const confirmPrompt = server.registerPrompt(
  'confirm',
  {
    title: '确认操作',
    description: '请求用户确认某个操作',
    argsSchema: {
      message: z.string()
    }
  },
  async (params) => {
    // 实现确认逻辑
    return { confirmed: true };
  }
);
```

## registerResource()

注册一个新的资源到服务器。支持静态资源和动态资源模板。

**类型**

```typescript
registerResource(name: string, uriOrTemplate: string, config: ResourceMetadata, readCallback: ReadResourceCallback): RegisteredResource;
registerResource(name: string, uriOrTemplate: ResourceTemplate, config: ResourceMetadata, readCallback: ReadResourceTemplateCallback): RegisteredResourceTemplate;
```

**参数**

- `name: string` - 资源名称
- `uriOrTemplate: string | ResourceTemplate` - 资源 URI 或资源模板
- `config: ResourceMetadata` - 资源元数据配置
- `readCallback: ReadResourceCallback | ReadResourceTemplateCallback` - 资源读取回调函数

**返回值**

- `RegisteredResource | RegisteredResourceTemplate` - 注册的资源实例

**示例**

```typescript
// 注册静态资源
const staticResource = server.registerResource(
  'config',
  'file://config.json',
  { title: '配置文件' },
  async () => {
    return { content: '配置内容' };
  }
);

// 注册动态资源模板
const dynamicResource = server.registerResource(
  'userProfile',
  { pattern: 'users/:id' },
  { title: '用户信息' },
  async (params) => {
    return { content: `用户${params.id}的信息` };
  }
);
```

## isConnected()

检查服务器是否已连接到传输层。

**类型**

```typescript
isConnected(): boolean
```

**参数**

**返回值**

- `boolean` - 如果已连接则返回 true ,否则返回 false

**示例**

```typescript
if (server.isConnected()) {
  console.log('服务器已连接');
}
```

## sendResourceListChanged()

向客户端发送资源列表变更事件。

**类型**

```typescript
sendResourceListChanged(): void
```

**示例**

```typescript
server.sendResourceListChanged();
```

## sendToolListChanged()

向客户端发送工具列表变更事件。

**类型**

```typescript
sendToolListChanged(): void
```

**示例**

```typescript
server.sendToolListChanged();
```

## sendPromptListChanged()

向客户端发送提示列表变更事件。

**类型**

```typescript
sendPromptListChanged(): void
```

**示例**

```typescript
server.sendPromptListChanged();
```

## getClientCapabilities()

获取客户端报告的能力信息。仅在初始化完成后可用。

**类型**

```typescript
getClientCapabilities(): ClientCapabilities | undefined
```

**返回值**

- `ClientCapabilities | undefined` - 客户端能力信息

**示例**

```typescript
const capabilities = server.getClientCapabilities();
if (capabilities) {
  console.log('客户端支持的功能:', capabilities);
}
```

## getClientVersion()

获取客户端的名称和版本信息。仅在初始化完成后可用。

**类型**

```typescript
getClientVersion(): Implementation | undefined
```

**参数**

**返回值**

- `Implementation | undefined` - 客户端版本信息

**示例**

```typescript
const version = server.getClientVersion();
if (version) {
  console.log('客户端版本:', version.version);
}
```

## ping()

向客户端发送 ping 请求以检查连接状态。

**类型**

```typescript
async ping(): Promise<void>
```

**返回值**

- `Promise<void>`

**示例**

```typescript
await server.ping();
```

## createMessage()

创建要发送给客户端的 LLM 消息。

**类型**

```typescript
async createMessage(params: CreateMessageRequest['params'], options?: RequestOptions)
```

**参数**

- `params: CreateMessageRequest['params']` - 消息参数
- `options?: RequestOptions` - 请求选项

**返回值**

- `Promise<any>` - 创建消息的结果

**示例**

```typescript
await server.createMessage({
  content: '这是一条消息',
  role: 'system'
});
```

## elicitInput()

从客户端获取输入，比如提示或资源。

**类型**

```typescript
async elicitInput(params: ElicitRequest['params'], options?: RequestOptions): Promise<ElicitResult>
```

**参数**

- `params: ElicitRequest['params']` - 请求参数
- `options?: RequestOptions` - 请求选项

**返回值**

- `Promise<ElicitResult>` - 用户输入结果

**示例**

```typescript
const result = await server.elicitInput({
  prompt: '请输入您的名字',
  type: 'text'
});
```

## listRoots()

列出可供客户端使用的根资源。

**类型**

```typescript
async listRoots(params?: ListRootsRequest['params'], options?: RequestOptions)
```

**参数**

- `params?: ListRootsRequest['params']` - 可选的请求参数
- `options?: RequestOptions` - 请求选项

**返回值**

- `Promise<any>` - 根资源列表

**示例**

```typescript
const roots = await server.listRoots();
```

## sendLoggingMessage()

向客户端发送日志消息。

**类型**

```typescript
async sendLoggingMessage(params: LoggingMessageNotification['params']): Promise<void>
```

**参数**

- `params: LoggingMessageNotification['params']` - 日志消息参数

**返回值**

- `Promise<void>`

**示例**

```typescript
await server.sendLoggingMessage({
  level: 'info',
  message: '操作已完成',
  timestamp: new Date().toISOString()
});
```

## sendResourceUpdated()

向客户端发送资源更新通知。

**类型**

```typescript
async sendResourceUpdated(params: ResourceUpdatedNotification['params']): Promise<void>
```

**参数**

- `params: ResourceUpdatedNotification['params']` - 资源更新参数

**返回值**

- `Promise<void>`

**示例**

```typescript
await server.sendResourceUpdated({
  uri: 'file://config.json',
  reason: 'changed'
});
```

## request()

发送请求并等待响应。不要用此方法发送通知，应使用 notification() 方法。

**类型**

```typescript
request<T extends ZodType<object>>(request: SendRequestT, resultSchema: T, options?: RequestOptions): Promise<z.infer<T>>
```

**参数**

- `request: SendRequestT` - 请求对象
- `resultSchema: T` - 结果验证模式
- `options?: RequestOptions` - 请求选项

**返回值**

- `Promise<z.infer<T>>` - 请求响应结果

**示例**

```typescript
const result = await server.request(
  { method: 'getData', params: { id: 1 } },
  z.object({ data: z.string() })
);
```

## notification()

发送通知，这是一个不需要响应的单向消息。

**类型**

```typescript
async notification(notification: SendNotificationT, options?: NotificationOptions): Promise<void>
```

**参数**

- `notification: SendNotificationT` - 通知对象
- `options?: NotificationOptions` - 通知选项

**返回值**

- `Promise<void>`

**示例**

```typescript
await server.notification({
  method: 'status',
  params: { status: 'ready' }
});
```

## setRequestHandler()

注册一个处理特定方法请求的处理程序。注意：这将替换同一方法的任何现有处理程序。

**类型**

```typescript
setRequestHandler<T extends ZodObject<{ method: ZodLiteral<string> }>>(
  requestSchema: T,
  handler: (request: z.infer<T>, extra: RequestHandlerExtra<SendRequestT, SendNotificationT>) => SendResultT | Promise<SendResultT>
): void
```

**参数**

- `requestSchema: T` - 请求验证模式
- `handler: Function` - 请求处理函数

**示例**

```typescript
server.setRequestHandler(
  z.object({ method: z.literal('getData') }),
  async (request) => {
    return { result: '数据' };
  }
);
```

## removeRequestHandler()

移除指定方法的请求处理程序。

**类型**

```typescript
removeRequestHandler(method: string): void
```

**参数**

- `method: string` - 要移除处理程序的方法名

**示例**

```typescript
server.removeRequestHandler('getData');
```

## setNotificationHandler()

注册一个处理特定方法通知的处理程序。注意：这将替换同一方法的任何现有处理程序。

**类型**

```typescript
setNotificationHandler<T extends ZodObject<{ method: ZodLiteral<string> }>>(
  notificationSchema: T, 
  handler: (notification: z.infer<T>) => void | Promise<void>
): void
```

**参数**

- `notificationSchema: T` - 通知验证模式
- `handler: Function` - 通知处理函数

**示例**

```typescript
server.setNotificationHandler(
  z.object({ method: z.literal('statusChanged') }),
  async (notification) => {
    console.log('状态已改变');
  }
);
```

## removeNotificationHandler()

移除指定方法的通知处理程序。

**类型**

```typescript
removeNotificationHandler(method: string): void
```

**参数**

- `method: string` - 要移除处理程序的方法名

**示例**

```typescript
server.removeNotificationHandler('statusChanged');
```

## onSubscribe()

注册订阅请求的处理程序。

**类型**

```typescript
onSubscribe(
  handler: (
    request: z.infer<typeof SubscribeRequestSchema>,
    extra: RequestHandlerExtra<SendRequestT, SendNotificationT>
  ) => SendResultT | Promise<SendResultT>
): void
```

**参数**

- `handler: Function` - 订阅请求处理函数

**示例**

```typescript
server.onSubscribe(async (request, extra) => {
  return { success: true };
});
```

## onUnsubscribe()

注册取消订阅请求的处理程序。

**类型**

```typescript
onUnsubscribe(
  handler: (
    request: z.infer<typeof UnsubscribeRequestSchema>,
    extra: RequestHandlerExtra<SendRequestT, SendNotificationT>
  ) => SendResultT | Promise<SendResultT>
): void
```

**参数**

- `handler: Function` - 取消订阅请求处理函数

**示例**

```typescript
server.onUnsubscribe(async (request, extra) => {
  return { success: true };
});
```

## onSetLogLevel()

注册设置日志级别请求的处理程序。

**类型**

```typescript
onSetLogLevel(
  handler: (
    request: z.infer<typeof SetLevelRequestSchema>,
    extra: RequestHandlerExtra<SendRequestT, SendNotificationT>
  ) => SendResultT | Promise<SendResultT>
): void
```

**参数**

- `handler: Function` - 设置日志级别请求处理函数

**示例**

```typescript
server.onSetLogLevel(async (request, extra) => {
  return { success: true };
});
```

## onListResources()

注册列出资源请求的处理程序。

**类型**

```typescript
onListResources(
  handler: (
    request: z.infer<typeof ListResourcesRequestSchema>,
    extra: RequestHandlerExtra<SendRequestT, SendNotificationT>
  ) => SendResultT | Promise<SendResultT>
): void
```

**参数**

- `handler: Function` - 列出资源请求处理函数

**示例**

```typescript
server.onListResources(async (request, extra) => {
  return { resources: [] };
});
```

## onRootsListChanged()

注册根资源列表变更通知的处理程序。

**类型**

```typescript
onRootsListChanged(
  handler: (notification: z.infer<typeof RootsListChangedNotificationSchema>) => void | Promise<void>
): void
```

**参数**

- `handler: Function` - 根资源列表变更通知处理函数

**示例**

```typescript
server.onRootsListChanged(async (notification) => {
  console.log('根资源列表已更新');
});
```

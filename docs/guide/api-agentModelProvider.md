# AgentModelProvider 类

```typescript
import { AgentModelProvider } from '@opentiny/next-sdk'
```

本文统一使用 `llm` 术语，来指代所有的在线大语言模式或本地部署的大语言模型。

AgentModelProvider 类是对 ai-sdk Provider 一个简单封装，通过它可以直接跟 llm 进行对话，以及 MCP 工具的调用,达到简化代码的目的。你也可以直接使用 ai-sdk 进行 llm 的访问。

## 初始化实例

`AgentModelProvider` 是一个 Class, 它的构造函数入参为：

```typescript
type ProviderFactoryConfig = {
  apiKey: string
  baseURL: string
  /** 支持内置的常用模型，或者传入一个ai-sdk官方的Provider工厂函数 */
  providerType: 'openai' | 'deepseek' | ((options: any) => ProviderV2)
}

type ProviderInstanceConfig = {
  /** 直接传入 ai-sdk Provider 实例，优先级最高 */
  llm: ProviderV2
}

/** 代理模型提供器的大语言配置对象（二选一） */
export type IAgentModelProviderLlmConfig = ProviderFactoryConfig | ProviderInstanceConfig

export interface IAgentModelProviderOption {
  /** 代理模型提供器的大语言配置对象 */
  llmConfig: IAgentModelProviderLlmConfig
  /** Mcp Server的配置对象的集合，键为服务器名称，值为配置对象 */
  mcpServers?: Record<string, McpServerConfig>
}
```

`llmConfig` 统一承载了所有 LLM 连接方式，优先级为 `llmConfig.llm` > `llmConfig.providerType`。根据需要选择以下方式：

1. **通过 `llmConfig.llm` 传入自定义 Provider 实例**

```typescript
import { createOpenAI } from '@ai-sdk/openai'

const webAgent = new AgentModelProvider({
  llmConfig: {
    llm: createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: 'https://api.openai.com/v1'
    })
  }
})
```

这种形式可以隐藏 `apiKey` 等敏感信息，通常通过环境变量创建 Provider。

2. **通过 `llmConfig.providerType` 来定义连接**

```typescript
const webAgent = new AgentModelProvider({
  llmConfig: {
    apiKey: 'sk-xxx',
    baseURL: 'https://xxxxx',
    providerType: 'deepseek'
  }
})
```

在 `llmConfig.providerType` 中，指定了 `ai-sdk Provider`的函数类型，它内置了常用的`openai`与 `deepseek` 两种类型。 如果需要连接其它的 `llm` 模型，传入自定义的 `Provider` 函数。

```typescript
import { createAnthropic } from '@ai-sdk/anthropic'

const webAgent = new AgentModelProvider({
  llmConfig: {
    apiKey: 'sk-xxx',
    baseURL: 'https://xxxxx',
    providerType: createAnthropic
  }
})
```

> [!NOTE]
> 该方法会在前端暴露敏感信息，请做好敏感信息的处理。

3. 通过 `mcpServers` 来设置对话中的 Mcp Tools

```typescript
/** Mcp Server的配置对象 */
export type McpServerConfig = { type: 'streamableHttp' | 'sse'; url: string } | { tranport: MCPTransport }

const webAgent = new AgentModelProvider({
  llmConfig: {
    apiKey: 'sk-xxx',
    baseURL: 'https://xxxxx',
    providerType: createAnthropic
  },
  mcpServers: {
    'my-mcp-server': { type: 'streamableHttp', url: 'https://xxxx' }
  }
})
```

如上配置后，在每次对话时，都会通过上述的`Transport` 向 `McpServer` 询问所有的工具列表，并在对话时自动带上这些工具。

如果指定了多个 `McpServerConfig` 对象，会给每一个 `McpServer`都建立连接，并查询工具后进行合并后，再进入对话。每个服务器都需要有唯一的名称作为键。

如果需要自定义 MCP 连接，请参考 [ai-sdk的初始化MCP Client](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#initializing-an-mcp-client)

## 使用 `AgentModelProvider` 的实例

初始化 `AgentModelProvider` 对象后，可以通过对象实例进行对话, 它暴露了 `chat` 和 `chatStream` 两个方法。

```typescript
const webAgent = new AgentModelProvider({
  llmConfig: {
    apiKey: 'sk-xxx',
    baseURL: 'https://xxxxx',
    providerType: 'deepseek'
  },
  mcpServers: {
    'my-mcp-server': { type: 'streamableHttp', url: 'https://xxxx' }
  }
})

const generateTextResult = webAgent.chat({
  model: 'deepseek-ai/DeepSeek-V3',
  messages: [
    { role: 'system', content: '你是xxx' },
    { role: 'user', content: '1+1 等于多少？' }
  ]
  // .......
})

const streamTextResult = webAgent.chatStream({
  model: 'deepseek-ai/DeepSeek-V3',
  messages: [
    { role: 'system', content: '你是xxx' },
    { role: 'user', content: '1+1 等于多少？' }
  ]
  // .......
})
```

> [!TIP]
> 以上2个函数的入参以及返回结果， 都是与 `ai-sdk` 的 `generateText` 和 `streamText` 全部兼容的，请参考 [ai-sdk core 文档](https://ai-sdk.dev/docs/ai-sdk-core) 了解详细的情况。

### `chat` 和 `chatStream` 除 `ai-sdk` 的入参外，还支持以下入参

| 参数名     | 类型     | 默认值      | 描述                                                                                                       |
| ---------- | -------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| `maxSteps` | `number` | `5`         | 工具调用最大步数，当达到最大步数时，会自动停止对话                                                         |
| `message`  | `string` | `undefined` | 用户消息，当传入该参数时，会自动将消息添加到对话历史中，可以将多轮对话消息传递给 `AgentModelProvider` 实例 |

### 用法示例

```typescript
const result = await webAgent.chat({
  model: 'deepseek-ai/DeepSeek-V3',
  message: '1+1 等于多少？',
  maxSteps: 10
})
```

## `AgentModelProvider` 的实例方法

| 方法名                | 类型                                                                         | 参数                                             | 返回值             | 描述                                                    |
| --------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------ | ------------------ | ------------------------------------------------------- |
| `closeAll`            | `async () => Promise<void>`                                                  | 无                                               | `Promise<void>`    | 关闭所有 MCP 客户端连接                                 |
| `updateMcpServers`    | `async (mcpServers: Record<string, McpServerConfig>) => Promise<void>`       | `mcpServers: Record<string, McpServerConfig>`    | `Promise<void>`    | 更新 MCP 服务器配置，会先关闭现有连接再重新初始化       |
| `insertMcpServer`     | `async (serverName: string, mcpServer: McpServerConfig) => Promise<boolean>` | `serverName: string, mcpServer: McpServerConfig` | `Promise<boolean>` | 插入新的 MCP 服务器配置，如果已存在相同名称则返回 false |
| `removeMcpServer`     | `(serverName: string) => void`                                               | `serverName: string`                             | `void`             | 删除指定名称的 MCP 服务器配置并关闭对应连接             |
| `initClientsAndTools` | `async () => Promise<void>`                                                  | 无                                               | `Promise<void>`    | 初始化所有 MCP 客户端和工具                             |

## `AgentModelProvider` 的实例属性

| 属性名           | 类型                                              | 默认值      | 描述                   |
| ---------------- | ------------------------------------------------- | ----------- | ---------------------- |
| `onUpdatedTools` | `(() => void) \| undefined`                       | `undefined` | 当工具更新时的回调函数 |
| `onError`        | `((msg: string, err?: any) => void) \| undefined` | `undefined` | 当发生错误时的回调函数 |

### 使用示例

```typescript
// 关闭所有连接
await webAgent.closeAll()

// 更新 MCP 服务器配置
await webAgent.updateMcpServers({
  'my-mcp-server': { type: 'streamableHttp', url: 'https://xxxx' }
})

// 插入新的 MCP 服务器
const success = await webAgent.insertMcpServer('new-server', { type: 'streamableHttp', url: 'https://yyyy' })

// 删除 MCP 服务器
webAgent.removeMcpServer('my-mcp-server')

// 设置工具更新回调
webAgent.onUpdatedTools = () => {
  console.log('工具更新了')
}

// 设置错误回调
webAgent.onError = (msg, err) => {
  console.log('发生错误', msg, err)
}

// 初始化客户端和工具
await webAgent.initClientsAndTools()
```

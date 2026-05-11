# 自定义LLM

TinyRemoter 组件支持自定义大模型接口和自定义 WebAgent 代理服务，让你可以灵活配置使用自己的 LLM 服务和代理服务。

## 自定义大模型接口

通过 `llmConfig` 属性，你可以配置自定义的大模型接口。TinyRemoter 支持两种配置方式：

### 方式一：使用 Provider 工厂配置

通过 `apiKey`、`baseURL` 和 `providerType` 配置大模型：

```vue
<template>
  <TinyRemoter v-model:show="show" sessionId="your-session-id" title="我的AI助手" :llmConfig="llmConfig" />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'

const show = ref(false)

// 使用 Provider 工厂配置
const llmConfig = {
  apiKey: '',
  baseURL: 'https://api.custom-llm.com/v1',
  providerType: 'openai', // 或 'deepseek'，或自定义 Provider 函数
  model: 'gpt-4o',
  maxSteps: 10
}
</script>
```

### 方式二：使用 Provider 实例配置

直接传入符合 ai-sdk Provider 规范的实例，这种方式优先级最高：

```vue
<template>
  <TinyRemoter v-model:show="show" sessionId="your-session-id" title="我的AI助手" :llmConfig="llmConfig" />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import { createOpenAI } from '@ai-sdk/openai'

const show = ref(false)

// 使用 Provider 实例配置
const llmConfig = {
  llm: createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://api.openai.com/v1',
    fetch: (...args) => {
      // 可以自定义请求拦截器，修改请求地址或添加参数
      args[0] = args[0] + '?custom=param'
      return fetch(...args)
    }
  }),
  model: 'gpt-4o',
  maxSteps: 10
}
</script>
```

### 使用自定义 Provider 函数

如果你需要使用自定义的 Provider 函数，可以这样配置：

```vue
<template>
  <TinyRemoter v-model:show="show" sessionId="your-session-id" title="我的AI助手" :llmConfig="customConfig" />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import { createCustomProvider } from '@ai-sdk/custom'

const show = ref(false)

// 使用自定义 Provider 函数
const customConfig = {
  apiKey: '',
  baseURL: 'https://api.custom-llm.com/v1',
  providerType: createCustomProvider, // 传入自定义 Provider 函数
  model: 'custom-model',
  maxSteps: 10
}
</script>
```

### llmConfig 配置项说明

```typescript
type ProviderFactoryConfig = {
  /** API密钥 */
  apiKey: string
  /** API基础URL */
  baseURL: string
  /** 提供商类型，支持 'openai' | 'deepseek' 或自定义Provider函数 */
  providerType: 'openai' | 'deepseek' | ((options: any) => ProviderV2)
}

type ProviderInstanceConfig = {
  /** 直接传入 ai-sdk Provider 实例，优先级最高 */
  llm: ProviderV2
}

type ICustomAgentModelProviderLlmConfig = (ProviderFactoryConfig | ProviderInstanceConfig) & {
  /** 模型名称 */
  model: string
  /** 工具调用最大步数（单条用户消息内），默认 30 */
  maxSteps?: number
  /** Provider 额外参数 */
  providerOptions?: Record<string, any>
  /** 额外自定义工具 */
  extraTools?: Record<string, any>
  /** 生成式 UI 服务地址；与 baseURL 同时配置时，输入框旁会显示生成式 UI 开关 */
  genuiUrl?: string
}
```

## 自定义 WebAgent 代理服务

通过 `agentRoot` 属性，你可以配置自定义的 WebAgent 代理服务地址。这对于私有化部署或使用自建代理服务非常有用。

### 基本配置

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    sessionId="your-session-id"
    title="我的AI助手"
    agentRoot="https://your-agent-server.com/api/v1/webmcp/"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'

const show = ref(false)
</script>
```

### 本地开发环境配置

在本地开发时，可以配置本地代理服务地址：

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    sessionId="your-session-id"
    title="我的AI助手"
    agentRoot="http://localhost:3000/api/v1/webmcp/"
  />
</template>
```

### 私有化部署配置

如果你已经完成了 WebAgent 的私有化部署，可以配置你的私有化服务地址：

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    sessionId="your-session-id"
    title="我的AI助手"
    agentRoot="https://your-domain.com/api/v1/webmcp/"
  />
</template>
```

### agentRoot 配置说明

- **默认值**：`https://agent.opentiny.design/api/v1/webmcp-trial/`
- **格式要求**：必须以 `/` 结尾
- **用途**：用于连接 WebAgent 服务，实现 MCP 工具的调用和会话管理

## 完整示例：同时配置自定义 LLM 和代理服务

以下示例展示了如何同时配置自定义大模型接口和自定义 WebAgent 代理服务：

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    sessionId="your-session-id"
    title="我的AI助手"
    systemPrompt="你是一个智能助手"
    :llmConfig="llmConfig"
    agentRoot="https://your-agent-server.com/api/v1/webmcp/"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import { createOpenAI } from '@ai-sdk/openai'

const show = ref(false)

// 配置自定义大模型
const llmConfig = {
  llm: createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://api.openai.com/v1'
  }),
  model: 'gpt-4o',
  maxSteps: 30
}
</script>
```

## 环境变量配置

为了安全地管理敏感信息，建议使用环境变量：

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    sessionId="your-session-id"
    title="我的AI助手"
    :llmConfig="llmConfig"
    :agentRoot="agentRoot"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'

const show = ref(false)

// 从环境变量读取配置
const llmConfig = {
  apiKey: import.meta.env.VITE_LLM_API_KEY,
  baseURL: import.meta.env.VITE_LLM_BASE_URL || 'https://api.openai.com/v1',
  providerType: import.meta.env.VITE_LLM_PROVIDER_TYPE || 'openai',
  model: import.meta.env.VITE_LLM_MODEL || 'gpt-4o',
  maxSteps: 10
}

const agentRoot = import.meta.env.VITE_AGENT_ROOT || 'https://agent.opentiny.design/api/v1/webmcp-trial/'
</script>
```

在 `.env` 文件中配置：

```env
VITE_LLM_API_KEY=your-api-key
VITE_LLM_BASE_URL=https://api.openai.com/v1
VITE_LLM_PROVIDER_TYPE=openai
VITE_LLM_MODEL=gpt-4o
VITE_AGENT_ROOT=https://your-agent-server.com/api/v1/webmcp/
```

## 生成式 UI

若需在输入框旁显示「生成式 UI」开关，请在模型配置中同时提供 `baseURL` 与 `genuiUrl`。开关的显示由当前生效的模型配置决定，与是否在浏览器扩展中运行（`inBrowserExt`）无关。启用后可通过 `v-model:genUiAble` 控制是否渲染生成式 UI 内容。

## 注意事项

1. **优先级**：`llmConfig.llm` 的优先级高于 `llmConfig.providerType`，如果同时配置，将使用 `llm` 配置
2. **agentRoot 格式**：`agentRoot` 必须以 `/` 结尾，否则可能导致连接失败
3. **跨域问题**：如果使用自定义代理服务，请确保服务端已配置正确的 CORS 策略
4. **安全性**：API Key 等敏感信息建议使用环境变量管理，不要直接写在代码中
5. **私有化部署**：如果使用私有化部署的 WebAgent，请参考 [WebAgent 私有化部署文档](./web-agent-private-deployment.md)

## 相关文档

- [TinyRemoter for Vue](./tiny-robot-remoter.md) - TinyRemoter 组件完整文档
- [AgentModelProvider API](./api-agentModelProvider.md) - AgentModelProvider 类详细说明
- [WebAgent 私有化部署](./web-agent-private-deployment.md) - WebAgent 私有化部署指南

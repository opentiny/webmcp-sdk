---
outline: [2, 3]
---

## 自定义 WebAgent 代理服务

通过 `agentRoot` 属性，你可以配置自定义的 WebAgent 代理服务地址。这对于私有化部署或使用自建代理服务非常有用。

### 基本配置

```vue
<template>
  <TinyRemoter v-model:show="show" title="我的AI助手" agentRoot="https://your-agent-server.com/api/v1/webmcp/" />
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
  <TinyRemoter v-model:show="show" title="我的AI助手" agentRoot="http://localhost:3000/api/v1/webmcp/" />
</template>
```

### 私有化部署配置

如果你已经完成了 WebAgent 的私有化部署，可以配置你的私有化服务地址：

```vue
<template>
  <TinyRemoter v-model:show="show" title="我的AI助手" agentRoot="https://your-domain.com/api/v1/webmcp/" />
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
  <TinyRemoter v-model:show="show" title="我的AI助手" :llmConfig="llmConfig" :agentRoot="agentRoot" />
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

## 相关文档

- [TinyRemoter for Vue](./tiny-robot-remoter.md) - TinyRemoter 组件完整文档
- [AgentModelProvider API](./api-agentModelProvider.md) - AgentModelProvider 类详细说明

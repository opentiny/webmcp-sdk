---
outline: [2, 3]
---

# 自定义 LLM

`TinyRemoter` 组件必须传入有效的大模型接口，才能正常进行问答。选择大模型时，需使用兼容 **Chat API** 协议的模型。组件内部依赖 `ai-sdk` 库兼容不同大模型的接口协议。在 ai-sdk V5 之后，`openai` provider 默认使用 **Response API** 协议，需切换为 **Chat API** 协议，详见 [ai-sdk OpenAI Provider 文档](https://ai-sdk.dev/providers/ai-sdk-providers/openai)。

## 自定义大模型接口

通过 `llmConfig` 属性，可配置自定义大模型接口。

### 方式一：显式设置 LLM 接口

通过 `apiKey`、`baseURL` 和 `providerType` 配置大模型：

```vue
<template>
  <TinyRemoter v-model:show="show" title="我的AI助手" :llmConfig="llmConfig" />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import '@opentiny/next-remoter/dist/style.css'

const show = ref(false)

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

在 `llm` 中直接传入符合 ai-sdk Provider 规范的实例，该方式优先级最高：

```vue
<template>
  <TinyRemoter v-model:show="show" title="我的AI助手" :llmConfig="llmConfig" />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import '@opentiny/next-remoter/dist/style.css'
import { createOpenAI } from '@ai-sdk/openai'

const show = ref(false)

// 使用 Provider 实例配置
const llmConfig = {
  llm: createOpenAI({
    apiKey: '',
    baseURL: 'https://api.openai.com/v1'
  }),
  model: 'gpt-4o',
  maxSteps: 10
}
</script>
```

### 方式三：使用自定义 Provider 函数

如需使用自定义 Provider 函数，可按如下方式配置：

```vue
<template>
  <TinyRemoter v-model:show="show" title="我的AI助手" :llmConfig="customConfig" />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import '@opentiny/next-remoter/dist/style.css'
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

### 自定义请求 Header

`headers` 字段允许在每次向 LLM 发起请求时携带自定义 HTTP 请求头。常见用途包括：

- **鉴权**：传递业务系统的 Token 或 Session 信息
- **链路追踪**：传递 `X-Request-Id`、`X-Trace-Id` 等追踪头
- **多租户路由**：传递租户标识，让代理网关按租户转发

> **注意**：`headers` 仅在使用 `providerType`（工厂模式）时生效，内部会将其透传给 ai-sdk 的 Provider 工厂函数（如 `createOpenAI`、`createDeepSeek`）。若使用 `llm` 实例配置，请在构造 Provider 实例时自行处理 Headers。

#### 1. 在 llmConfig 中使用自定义 Header

```vue
<template>
  <TinyRemoter v-model:show="show" title="我的AI助手" systemPrompt="你是一个智能助手" :llmConfig="llmConfig" />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import '@opentiny/next-remoter/dist/style.css'

const show = ref(false)

const llmConfig = {
  apiKey: '',
  baseURL: 'https://api.openai.com/v1',
  providerType: 'openai',
  model: 'gpt-4o',
  maxSteps: 10,
  // 自定义请求头，每次 LLM 请求都会携带
  headers: {
    'X-Custom-Token': 'your-business-token',
    'X-Trace-Id': 'trace-001'
  }
}
</script>
```

## 自定义大模型选择列表

通过 `llmConfigs` 属性可预先定义一组大模型接口，模型列表会显示在输入框底部供用户切换。同时设置 `llmConfig` 和 `llmConfigs` 时，`llmConfig` 配置的大模型优先生效；用户手动切换后，再使用所选模型。不建议同时配置这两个属性。

`llmConfigs` 数据项在 `llmConfig` 基础上额外包含 `id`、`label`、`icon`、`isDefault`、`useReActMode` 字段，用于渲染大模型选择列表。

**模型切换机制说明：**

当 `selectedModelId` 发生变化时，组件内部会自动执行以下操作：

1. **自动更新模型配置**：组件监听 `selectedModel` 的变化，自动调用 `customAgentProvider.updateLLMConfig()` 方法
2. **更新 LLM 实例**：`updateLLMConfig()` 根据新模型配置创建 Provider 实例，并更新到 `agent.llm`
3. **支持的条件**：仅当模型配置包含 `providerType` 时才会自动更新（若使用 `llm` 实例配置，则不会自动更新）

### 基本设置

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    v-model:selected-model-id="selectedModelId"
    :llmConfigs="modelConfigs"
    title="我的AI助手"
    systemPrompt="你是一个智能助手"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import '@opentiny/next-remoter/dist/style.css'

const show = ref(false)
const selectedModelId = ref('gpt-4o')

const modelConfigs = [
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    isDefault: true,
    apiKey: '',
    baseURL: 'https://api.openai.com/v1',
    providerType: 'openai',
    model: 'gpt-4o',
    maxSteps: 10
  },
  {
    id: 'deepseek-v3',
    label: 'DeepSeek V3',
    apiKey: '',
    baseURL: 'https://api.deepseek.com',
    providerType: 'deepseek',
    model: 'deepseek-chat',
    maxSteps: 30
  }
]
</script>
```

### 自定义请求 Header

使用多模型切换（`llmConfigs`）时，每个模型可配置独立的 `headers`，切换模型时组件会自动同步对应 Headers：

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    v-model:selected-model-id="selectedModelId"
    :llmConfigs="modelConfigs"
    title="我的AI助手"
    systemPrompt="你是一个智能助手"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import '@opentiny/next-remoter/dist/style.css'

const show = ref(false)
const selectedModelId = ref('gpt-4o')

const modelConfigs = [
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    isDefault: true,
    apiKey: '',
    baseURL: 'https://api.openai.com/v1',
    providerType: 'openai',
    model: 'gpt-4o',
    maxSteps: 10,
    // 为 GPT-4o 配置专属请求头
    headers: {
      'X-Business-Token': 'openai-business-token',
      'X-User-Id': 'user-123'
    }
  },
  {
    id: 'deepseek-v3',
    label: 'DeepSeek V3',
    apiKey: '',
    baseURL: 'https://api.deepseek.com',
    providerType: 'deepseek',
    model: 'deepseek-chat',
    maxSteps: 30,
    // 为 DeepSeek 配置专属请求头
    headers: {
      'X-Business-Token': 'deepseek-business-token',
      'X-Tenant-Id': 'tenant-456'
    }
  }
]
</script>
```

# TinyRobot 版本

```javascript
import { TinyRemoter } from '@opentiny/next-remoter'
```

该组件为使用 `@opentiny/tiny-robot` 开发的 `TinyRemoter`, 仅支持 `Vue3` 。

主要功能：

- 对话LLM
- 欢迎界面以及suggestions的展示
- 多角色展示消息以及MD, TOOL调用等展示
- 支持新建会话
- 支持扫码添加应用
- 支持MCP市场

> 1、扫码应用的 `sessionId` 后，它会自动创建一个 `streamableHTTP` 类型的 `MCPServer`，之后自动创建 `MCPClient`连接并查询所有的 TOOLS, 并展示在”已安装插件“列表中。

> 2、市场应用的插件，通常都是 `streamableHTTP` 或 `SSE` 类型的 `MCPServer`。 选择添加后，也是自动创建 `MCPClient`连接并查询所有的 TOOLS, 并展示在”已安装插件“列表中。

总之，已安装插件中的所有Tool都可以在与 `LLM` 对话时被调用。

## 属性

- `v-model:show` 双向绑定是否显示，内部关闭是 emit('update:show',false)
- `v-model:fullscreen` 双向绑定是否全屏
- `sessionId` 必须传
- `title` 左上角的 container.title
- `agentRoot` 后端代理的地址，有默认值 `https://agent.opentiny.design/api/v1/webmcp-trial/`
- `locale` 国际化key, 可选值为：'zh-CN' | 'en-US' 。一些默认描述，placeholder的国际化的key： lang=zh-CN
- `mode` 展示模式，可选值为：'remoter' | 'chat-dialog'。遥控器模式： 自动在右下角显示一个AI图标，点击展开多个菜单项； 对话框模式： 直接显示一个对话框界面
- `remoteUrl` 远程URL，用于显示在遥控器模式下，点击遥控器图标后，显示的菜单项。
- `qrCodeUrl` 二维码URL，用于显示在遥控器模式下，点击遥控器图标后，弹出二维码对应的链接 url。
- `menuItems` 菜单项配置数组，用于显示在遥控器模式下，点击遥控器图标后，显示的菜单项。具体配置项见 [api-createRemoter](./api-createRemoter.md)
- `systemPrompt` 对话llm 时，传入的 system message: system-prompt=你是一个智能助手，工作地点是深圳
- `llmConfig` 大语言模型配置对象，不能与 `llm` 同时传入。支持配置 `apiKey`、`baseURL` 、 `model` 、`maxSteps` 、 `providerType` 、 `providerOptions` 和 `extraTools`
- `llm` ai-sdk官方的Provider实例，不能与 `llmConfig` 同时传入。可以传入自定义的Provider实例
- `inBrowserExt` 设置组件运行在普通页面还是浏览器的扩展中，默认值为：false
- `genUiAble` 设置是否支持生成式UI的渲染
- `genUiComponents` 生成式UI内置了一批组件，如果需要引入新组件，需要通过这里导入。 参考示例： shallowReactive({TinyUser, TinyAlert })

### llmConfig 配置详情

```typescript
interface ICustomAgentModelProviderLlmConfig {
  /** API密钥 */
  apiKey: string
  /** API基础URL */
  baseURL: string
  /** 提供商类型，支持 'openai' | 'deepseek' 或自定义Provider函数 */
  providerType: 'openai' | 'deepseek' | ((options: any) => ProviderV2)
  /** 模型名称 */
  model: string
  /** 工具调用最大步数 */
  maxSteps: number
}
```

### llm Provider 实例

`llm` 参数接受任何符合 ai-sdk Provider 规范的实例，例如：

```typescript
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'

// OpenAI Provider
const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1'
})

// Anthropic Provider
const anthropicProvider = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})
```

## 插槽

- `#welcome`: 没有对话消息时，展示在组件中间的 `Welcome & Promts` 等内容。设计成插槽可以让用户有完全的定制能力。
- `#suggestions`: 展示在输入框上面的提示性组件。可以使用 `@opentiny/tiny-robot` 中的 `SuggestionPills` 等强大功能的组件。

## 导出变量

```typescript
defineExpose({
  /** 欢迎图标 */
  welcomeIcon,
  /** 对话消息 */
  messages,
  /** 对话消息状态 */
  messageState,
  /** 对话卡片的角色配置 */
  roles,
  /** 输入框的文本 */
  inputMessage,
  /** 输入框组件的实例 */
  senderRef,
  /** 取消发送 */
  abortRequest,
  /** 发送消息 */
  sendMessage
})
```

导出变量是方便在插槽中使用内部的功能，比如 `#welcome 插槽` 中点击后 `Promts` ,发出固定的请求:

```typescript
const robotRef = ref<InstanceType<typeof TinyRemoter>>()

function promtClick(item) {
  robotRef.sendMessage(item.description)
}
```

## 使用示例

### 基本使用

```vue
<template>
  <TinyRemoter v-model:show="show" sessionId="your-session-id" title="我的AI助手" systemPrompt="你是一个智能助手" />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'

const show = ref(false)
</script>
```

### 使用自定义LLM配置

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    sessionId="your-session-id"
    title="我的AI助手"
    systemPrompt="你是一个智能助手"
    :llmConfig="llmConfig"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'

const show = ref(false)

// 使用llmConfig配置
const llmConfig = {
  apiKey: 'your-api-key',
  baseURL: 'https://api.openai.com/v1',
  providerType: 'openai',
  model: 'gpt-4o',
  maxSteps: 10
}
</script>
```

### 使用自定义Provider实例

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    sessionId="your-session-id"
    title="我的AI助手"
    systemPrompt="你是一个智能助手"
    :llm="customProvider"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import { createOpenAI } from '@ai-sdk/openai'

const show = ref(false)

// 使用自定义Provider实例
const customProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1'
})
</script>
```

### 使用DeepSeek模型

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    sessionId="your-session-id"
    title="我的AI助手"
    systemPrompt="你是一个智能助手"
    :llmConfig="deepSeekConfig"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'

const show = ref(false)

// 使用DeepSeek配置
const deepSeekConfig = {
  apiKey: 'your-deepseek-api-key',
  baseURL: 'https://api.deepseek.com',
  providerType: 'deepseek',
  model: 'DeepSeek-V3',
  maxSteps: 10
}
</script>
```

### 使用Anthropic Claude模型

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    sessionId="your-session-id"
    title="我的AI助手"
    systemPrompt="你是一个智能助手"
    :llm="anthropicProvider"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import { createAnthropic } from '@ai-sdk/anthropic'

const show = ref(false)

// 使用Anthropic Provider
const anthropicProvider = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})
</script>
```

### 使用自定义Provider函数

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    sessionId="your-session-id"
    title="我的AI助手"
    systemPrompt="你是一个智能助手"
    :llmConfig="customConfig"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import { createCustomProvider } from '@ai-sdk/custom'

const show = ref(false)

// 使用自定义Provider函数
const customConfig = {
  apiKey: 'your-custom-api-key',
  baseURL: 'https://api.custom-llm.com/v1',
  providerType: createCustomProvider
}
</script>
```

### 环境变量配置示例

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    sessionId="your-session-id"
    title="我的AI助手"
    systemPrompt="你是一个智能助手"
    :llmConfig="envConfig"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'

const show = ref(false)

// 使用环境变量配置
const envConfig = {
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  baseURL: import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1',
  providerType: 'openai',
  model: 'gpt-4o',
  maxSteps: 10
}
</script>
```

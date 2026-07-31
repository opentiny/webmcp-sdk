---
outline: [2, 3]
---

# TinyRemoter 组件

`TinyRemoter` 是一个基于 Vue 3 的 AI 对话组件，底层依赖 `@opentiny/tiny-robot`，内置常用能力，可帮助开发者快速接入智能对话功能。

::: tip 为什么叫Remoter 的名字
最初开发时，常用远程组件，遥控器来称呼它，慢慢地的就形成了习惯叫法。其实这个名字不很准确。

它其实是一个`对话组件`，用于展示在 Web 界面上与LLM 大模型进行对话,渲染返回的消息，集成 Mcp & Skill 能力的综合性组件, 常见有3种状态：悬浮图标/左侧对话框/全屏对话框。
:::

## 快速引入

```javascript
import { TinyRemoter } from '@opentiny/next-remoter'
import '@opentiny/next-remoter/dist/style.css'
```

## 主要功能

- 支持与大语言模型对话
- 欢迎界面展示
- AI 消息流式渲染，支持 Markdown、工具调用等展示
- 会话管理
- MCP 市场与自定义 MCP Server 接入

## 一、属性

- `mode` 展示模式，可选值为 `'remoter' | 'chat-dialog'`，默认值为 `remoter`。
  - **遥控器模式**：悬浮在网页右下角 AI 图标，可拖动，点击后展开菜单项
  - **对话框模式**：显示为对话框界面

### 1.1 `chat-dialog` 模式属性

- `v-model:show` 双向绑定是否显示
- `v-model:fullscreen` 双向绑定是否全屏
- `title` 对话框模式左上角标题
- `locale` 国际化语言，可选值为 `'zh-CN' | 'en-US'`
  > 组件内置欢迎界面、建议按钮等文案提供中英文版本，默认为 `zh-CN`。
- `role-avatar` 设置 `user` / `assistant` 角色头像
  > 格式为 `{ user: VNode, assistant: VNode }`，VNode 可通过 `h` 函数创建，例如：`h(IconUser, { style: { fontSize: '32px' } })`
- `promptItems` 自定义欢迎区建议卡片数据，类型为 `PromptProps[]`
  > 用于覆盖默认的三张欢迎卡片（标题 + 描述 + 图标 + badge），建议按需修改默认值。
- `pillItems` 自定义输入框上方快捷操作按钮数据，类型为 `{ id: string; text: string; menus: { id: string | number; text: string; inputMessage: string }[] }[]`
  > 用于覆盖默认的三个胶囊按钮组（如「办公助手」「开发支持」等），建议按需修改默认值。
- `layout-mode` 布局模式，支持所有 CSS `position` 属性值：`'static' | 'relative' | 'absolute' | 'fixed' | 'sticky'`，默认值为 `'fixed'`
  > 用于控制组件在页面中的定位方式。

### 1.2 远程遥控模式属性

- `AILogoUrl` 悬浮 AI 图标的 URL 地址
- `agentRoot` 后端 `WebAgent` 代理服务地址
- `sessionId` 应用向 `WebAgent` 注册后生成的 ID，用于标识当前页面；若不使用远程遥控模式，可忽略该值
- `remoteUrl` 远程遥控页面 URL；在遥控器模式下点击「遥控器链接」菜单时跳转至该地址
- `qrCodeUrl` 远程遥控页面 URL；在遥控器模式下点击「扫码登录」菜单时弹出二维码，扫码成功后进入该地址
- `menuItems` 菜单项配置数组，用于遥控器模式下点击图标后展示的菜单项，具体配置见 [createRemoter 函数](../webmcp-sdk/create-remoter)。默认显示全部菜单，传入空数组则不显示菜单

### 1.3 大模型属性

- `llmConfig` 大语言模型配置对象，详见下方类型声明
- `llmConfigs` LLM 配置数组，每一项基于 `llmConfig` 格式，额外包含 `id`、`label`、`icon`、`isDefault`、`useReActMode` 字段。传入后会在输入框底部显示模型切换组件，可通过 `v-model:selectedModelId` 控制当前选中模型
- `v-model:selectedModelId` 双向绑定当前选中的模型 ID（字符串类型）；传入 `llmConfigs` 时，可通过该属性控制所选模型
- `v-model:enabledTools` 双向绑定默认启用的工具状态（`Record<string, boolean>` 类型），键为工具名称，值为是否启用，主要用于控制本地工具的默认启用状态
- `systemPrompt` 对话系统提示词，默认值为 `'你是一个智能助手，擅长通过工具调用帮助用户解决问题和满足用户需求'`
- `skills` 技能配置对象（`Record<string, string>` 类型），通常配合 Vite 的 `import.meta.glob` 导入标准 `SKILL.md` 文件；AI 助手会自动识别用户意图并调用相应技能，无需手动触发
- `mcpServers` 预置 MCP 服务器配置（业界格式 `Record<string, McpServerConfig>`），键为服务器名称，值为单台服务器配置；组件初始化时会自动加载并出现在「已添加 MCP 服务」中。**一般对应前端 MCP 服务，页面关闭后即不存在。** 支持配置自定义 `name`（插件显示名称）和 `description`（插件功能描述），详见 [MCP Server 与工具指南](./mcp-server-tool.md)
- `customMarketMcpServers` 自定义 MCP 市场服务列表（`PluginInfo[]`）。组件内部不再内置默认市场服务，若需使用官方 MCP 工具集，需从应用层导入并传入。**一般对应后台 MCP 服务，可常驻存在。**

::: tip
同时设置 `llmConfig` 和 `llmConfigs` 时，`llmConfig` 优先生效；用户手动切换 `llmConfigs` 中的模型后，所选模型生效。不建议同时传入这两个属性。
:::

```typescript
// llmConfig 类型声明
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
  /**
   * 自定义请求 Header，会在创建 Provider 实例时透传给 ai-sdk
   * 仅在使用 providerType（工厂模式）时生效，使用 llm 实例时请自行处理
   * 适用于需要在每次请求时携带特定 Header 的场景（如鉴权、链路追踪等）
   */
  headers?: Record<string, string>
}

// llmConfigs 的数据项的类型声明

type UnifiedModelConfig = ICustomAgentModelProviderLlmConfig & {
  /** 模型唯一标识 Model unique identifier */
  id: string

  /** 显示名称 Display name */
  label: string

  /** 模型图标组件 Icon component */
  icon?: Component

  /** 是否为默认模型 Is default model */
  isDefault?: boolean

  /** 模型描述（可选）Description (optional) */
  description?: string

  /** 多模态能力配置 Multimodal capability configuration */
  multimodal?: MultimodalCapability

  // 生成式UI 的 url
  genuiUrl?: string
}
```

#### customMarketMcpServers 与 mcpServers 的区别

| 属性                     | 典型场景                                    | 生命周期                                   |
| ------------------------ | ------------------------------------------- | ------------------------------------------ |
| `customMarketMcpServers` | **后台** MCP 服务，由后端/代理常驻提供      | 可常驻存在，不随页面关闭而消失             |
| `mcpServers`             | **前端** MCP 服务，随当前页面或本地环境提供 | 与页面一致，页面关闭后连接即断开、不再存在 |

### 1.4 杂项属性

- `inBrowserExt` 设置组件运行于普通页面还是浏览器扩展，默认值为 `false`
- `genUiAble` 双向绑定是否启用生成式 UI 渲染，默认值为 `false`。输入框旁的「生成式 UI」开关是否显示由**当前模型配置**决定：仅当配置中同时包含 `baseURL` 和 `genuiUrl` 时才会显示
- `genUiComponents` 生成式 UI 已内置一批组件；如需支持额外组件，可通过该属性导入，例如：`shallowReactive({ TinyUser, TinyAlert })`
- `allowSpeech` 启用语言输入模式，默认值为 `false`

## 二、事件

- `before-ai-render` 在 AI 消息渲染前触发，可用于修改消息内容。参数中的 `uiContent` 包含当前流式返回的消息类型（如 `markdown`、`reasoning`、`tool` 或自定义类型），可自由编排。配合组件暴露的 `registerContentRenderer` 方法，可实现自定义流消息渲染，详见 [自定义流消息的渲染](#六、自定义流消息的渲染)。

## 三、插槽

- `#welcome`：无对话消息时，展示在组件中间的 Welcome、Prompts 等内容，提供完全自定义能力
- `#suggestions`：展示在输入框上方的提示组件，可使用 `@opentiny/tiny-robot` 中的 `SuggestionPills` 等组件
- `#operations`：容器头部右侧操作区域，默认包含新建会话、历史会话和扫码组件，可通过该插槽自定义头部操作按钮

## 四、导出变量

```typescript
defineExpose({
  /** 大模型代理 */
  agent,
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
  senderRef: senderRef as Ref<ComponentInstance<typeof TrSender>>,
  /** 取消发送 */
  abortRequest,
  /** 发送消息 */
  sendMessage,
  /** 向插件市场添加一个server */
  loadMcpServerToPlugin,
  /** 处理客户端断开连接 */
  handleClientDisconnected,
  /** 添加消息 */
  addMessage,
  /** 已安装的插件 */
  installedPlugins,
  /** 添加插件核心方法 */
  addPluginCore,
  /** 删除插件核心方法 */
  deletePlugin,
  /** 注册内容渲染器 */
  registerContentRenderer,
  /**
   * 刷新已安装插件的工具列表（从 agent.mcpTools 同步到 UI）
   * 适用于 builtin client 工具变化后的快速刷新，避免 remove + reload 导致的 UI 闪烁
   */
  refreshPluginTools
})
```

导出变量便于在插槽中调用组件内部能力，例如在 `#welcome` 插槽中点击 Prompt 后发送固定请求：

```typescript
const robotRef = ref<InstanceType<typeof TinyRemoter>>()

function promtClick(item) {
  robotRef.sendMessage(item.description)
}
```

## 五、基础示例

### 基本使用

```vue
<template>
  <TinyRemoter v-model:show="show" v-model:fullscreen="fullscreen" title="我的AI助手" systemPrompt="你是一个智能助手" />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import '@opentiny/next-remoter/dist/style.css'

const show = ref(false)
const fullscreen = ref(false)
</script>
```

### 设置布局模式（layout-mode）

`layout-mode` 属性用于控制组件的定位方式，支持所有 CSS `position` 属性值，在不同使用场景下非常实用：

#### 静态定位模式

使用 `static` 定位，组件会占据正常的文档流位置，适合将对话框嵌入到页面布局中。

```vue
<template>
  <div class="chat-container">
    <!-- 静态定位，组件会占据 100% 的宽高，适合嵌入页面 -->
    <TinyRemoter v-model:show="show" layout-mode="static" title="我的AI助手" systemPrompt="你是一个智能助手" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import '@opentiny/next-remoter/dist/style.css'

const show = ref(true)
</script>

<style scoped>
.chat-container {
  width: 800px;
  height: 80vh;
  margin: 20px auto 0;
}
</style>
```

#### 动态切换布局模式

你也可以根据业务需求动态切换布局模式：

```vue
<template>
  <div>
    <!-- 切换按钮 -->
    <div class="controls">
      <button @click="layoutMode = 'fixed'">固定定位</button>
      <button @click="layoutMode = 'static'">静态定位</button>
      <button @click="layoutMode = 'absolute'">绝对定位</button>
    </div>

    <!-- 动态布局模式 -->
    <TinyRemoter v-model:show="show" :layout-mode="layoutMode" title="我的AI助手" systemPrompt="你是一个智能助手" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import '@opentiny/next-remoter/dist/style.css'

const show = ref(true)
const layoutMode = ref('fixed')
</script>

<style scoped>
.controls {
  padding: 20px;
  display: flex;
  gap: 10px;
}

button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

button:hover {
  background: #f5f5f5;
}
</style>
```

**布局模式使用建议：**

- **`fixed`（默认）**：适合悬浮式聊天窗口、客服对话框等需要始终可见的场景
- **`static`**：适合将对话框完整嵌入到页面布局中，作为页面的一部分
- **`absolute`**：适合在特定容器内定位对话框，需要精确控制位置
- **`relative`**：适合需要在原位置基础上微调的场景
- **`sticky`**：适合需要在滚动时保持可见，但不完全固定的场景

### 自定义 AI、USER 头像

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    title="我的AI助手"
    systemPrompt="你是一个智能助手"
    :llmConfig="llmConfig"
    :roleAvatar="roleAvatar"
  />
</template>

<script setup>
import { ref, h } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import { createOpenAI } from '@ai-sdk/openai'

const show = ref(false)
const llmConfig = {
  apiKey: '',
  baseURL: 'https://api.openai.com/v1',
  providerType: 'openai',
  model: 'gpt-4o'
}

const roleAvatar = {
  user: h('div', { style: { fontSize: '32px' } }, 'U'),
  assistant: h('img', { src: 'https://play.vuejs.org/logo.svg', width: '32px', height: '32px' })
}
</script>
```

## 六、自定义流消息的渲染

部分场景下，大模型会在普通文本中混入**特定格式**的内容，需要对这些内容进行单独渲染（例如生成卡片交互）。此时需要对流消息进行处理：截取特定格式内容，再插入为独立消息类型。

下面通过一个简单的例子说明如何使用自定义流消息渲染。

**需求**：当大模型返回的文本中包含 `HEART` 时，将其渲染为 emoji ❤️。分两步实现：

1. 监听流消息，将包含 `HEART` 的文本拆分为多个消息段，并插入 `type='heart'` 的消息。例如：

```javascript
// 拆分前
{
  uiContent: [{ type: 'markdown', content: '你好，我的中国HEART ！' }]
}

// 拆分后
{
  uiContent: [
    { type: 'markdown', content: '你好，我的中国' },
    { type: 'heart', content: '❤️' },
    { type: 'markdown', content: ' ！' }
  ]
}
```

2. 注册 `heart` 类型的渲染器，用于渲染 heart 消息。

```javascript
  remoterRef.value?.registerContentRenderer('heart', (content: any) => {
    return h('span', {}, content)
  })
```

完整示例如下：

```vue
<template>
  <TinyRemoter ref="myRemoter" v-model:show="show" sessionId="your-session-id" @before-ai-render="beforeAiRender" />
</template>

<script setup>
import { onMounted, ref, h, useTemplateRef } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import '@opentiny/next-remoter/dist/style.css'
import { createOpenAI } from '@ai-sdk/openai'

const show = ref(false)
const llmConfig = {
  apiKey: '',
  baseURL: 'https://api.openai.com/v1',
  providerType: 'openai',
  model: 'gpt-4o'
}

const myRemoter = useTemplateRef('myRemoter')

// 1、监听流消息进行数据截取
function beforeAiRender(currMessage: any) {
  if (!currMessage?.uiContent || !Array.isArray(currMessage.uiContent)) {
    return
  }

  const newUiContent: any[] = []

  for (const item of currMessage.uiContent) {
    if (item.type === 'markdown' && typeof item.content === 'string') {
      const heartIndex = item.content.indexOf('HEART')

      if (heartIndex !== -1) {
        // 找到 HEART 关键字，进行分割
        const parts = item.content.split('HEART')

        // 遍历分割后的部分
        for (let i = 0; i < parts.length; i++) {
          // 添加 markdown 类型的内容（如果该部分不为空）
          if (parts[i].trim()) {
            newUiContent.push({
              type: 'markdown',
              content: parts[i]
            })
          }

          // 如果不是最后一部分，在中间插入 heart 类型
          if (i < parts.length - 1) {
            newUiContent.push({
              type: 'heart',
              content: '❤️'
            })
          }
        }
      } else {
        // 没有找到 HEART，保持原样
        newUiContent.push(item)
      }
    } else {
      // 非 markdown 类型，保持原样
      newUiContent.push(item)
    }
  }

  // 更新 currMessage.uiContent
  currMessage.uiContent = newUiContent

}

onMounted(()=>{
  // 2. 注册 heart 渲染类型
  myRemoter.value?.registerContentRenderer('heart', (content: any) => {
    return h('span', {}, content)
  })
})
</script>
```

## 七、插槽示例

### 自定义欢迎界面和提示建议（welcome 和 suggestions 插槽）

```vue
<template>
  <TinyRemoter ref="robotRef" v-model:show="show" title="我的AI助手" systemPrompt="你是一个智能助手">
    <!-- 自定义欢迎界面 -->
    <template #welcome>
      <div class="custom-welcome">
        <h2>欢迎使用 AI 助手</h2>
        <p>我可以帮助你完成各种任务</p>
        <div class="prompts">
          <button v-for="prompt in prompts" :key="prompt.id" @click="handlePromptClick(prompt)">
            {{ prompt.label }}
          </button>
        </div>
      </div>
    </template>

    <!-- 自定义输入框上方的提示建议 -->
    <template #suggestions>
      <div class="suggestion-pills">
        <button
          v-for="suggestion in suggestions"
          :key="suggestion"
          class="suggestion-pill"
          @click="handleSuggestionClick(suggestion)"
        >
          {{ suggestion }}
        </button>
      </div>
    </template>
  </TinyRemoter>
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import '@opentiny/next-remoter/dist/style.css'

const show = ref(false)
const robotRef = ref()

const prompts = [
  { id: 1, label: '帮我写一个快速排序', text: '帮我写一个快速排序算法' },
  { id: 2, label: '解释一下 Vue3 的响应式原理', text: '请详细解释 Vue3 的响应式原理' }
]

const suggestions = ['天气查询', '日程安排', '代码生成', '文本翻译']

function handlePromptClick(prompt) {
  // 使用组件暴露的方法发送消息
  robotRef.value?.sendMessage(prompt.text)
}

function handleSuggestionClick(suggestion) {
  robotRef.value?.sendMessage(suggestion)
}
</script>
<style scoped>
/** 需要自定义插槽中button的样式 */
</style>
```

### 自定义头部操作区域（operations 插槽）

```vue
<template>
  <TinyRemoter v-model:show="show" title="我的AI助手" systemPrompt="你是一个智能助手">
    <template #operations>
      <!-- 自定义头部操作按钮 -->
      <button @click="handleCustomAction">自定义操作</button>
      <!-- 或者保留默认功能，添加额外按钮 -->
      <button @click="handleExport">导出对话</button>
    </template>
  </TinyRemoter>
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import '@opentiny/next-remoter/dist/style.css'

const show = ref(false)

function handleCustomAction() {
  console.log('执行自定义操作')
}

function handleExport() {
  console.log('导出对话')
}
</script>
```

## 八、生成式 UI 示例

生成式 UI（Gen UI）要求大模型返回特定格式的响应。为此需要本地化部署专用的 GenUI LLM 服务，详见 [Gen UI 文档](https://docs.opentiny.design/genui-sdk/guide/quick-start.html)。

部署 GenUI LLM 服务后，在 `llmConfig` 或 `llmConfigs` 中配置 `genuiUrl` 指向私有化服务地址，然后在对话框底部激活「生成式 UI」按钮，或直接设置 `v-model:genUiAble` 启用生成式 UI 输出模式。

启用生成式 UI 后，`TinyRemoter` 发起新对话时会使用 `genuiUrl` 地址，并自动处理流消息渲染，从而输出正确的卡片组件。

::: warning
建议直接使用 Gen UI 完整方案，以获得最新的 Gen UI 特性。
:::

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    title="我的AI助手"
    systemPrompt="你是一个智能助手"
    :llmConfig="llmConfig"
    :genUiComponents="genUiComponents"
  />
</template>

<script setup>
import { ref, shallowReactive } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import { TinyUser, TinyAlert } from '@opentiny/vue'
import '@opentiny/next-remoter/dist/style.css'

const show = ref(false)

const llmConfig = {
  apiKey: '',
  baseURL: 'https://xxx.com/v1',
  genuiUrl: 'https://xxx.com/v1/gen',
  providerType: 'deepseek'
}

// 让GenUI 额外支持一些组件
const genUiComponents = shallowReactive({ TinyUser, TinyAlert })
</script>
```

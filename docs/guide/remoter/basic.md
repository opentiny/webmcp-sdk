# TinyRemoter 组件

`TinyRemoter` 是一个Vue3 组件，底层依赖`@opentiny/tiny-robot` 组件库，它内置了一系列的功能，方便开发者迅速接入AI 对话能力！

```javascript
import { TinyRemoter } from '@opentiny/next-remoter'
```

主要功能：

- 支持与对话LLM
- 欢迎界面展示
- AI消息的流式渲染 markdown, 工具调用等展示
- 支持会话管理
- 支持MCP市场与自定义添加McpServer

## 一、属性

- `mode` 展示模式，可选值为：'remoter' | 'chat-dialog'，默认值为 `remoter`。
  - 遥控器模式： 自动在右下角显示一个AI图标，点击展开多个菜单项；
  - 对话框模式： 直接显示一个对话框界面

### 1.1 `chat-dialog` 模式的属性

- `v-model:show` 双向绑定是否显示，内部关闭是 emit('update:show',false)
- `v-model:fullscreen` 双向绑定是否全屏
- `title` `chat-dialog` 模式时，左上角的标题。
- `locale` 选择国际化语言, 可选值为：`'zh-CN' | 'en-US'` 。
  > 组件内置的欢迎界面，建议按钮等文字有中英文的2个版本，默认为`zh-CN`。
- `role-avatar` 设置角色user/assistant的头像。
  > 格式为 {user: VNode, assistant: VNode }, VNode 可以通过h函数创建，比如： h(IconUser, { style: { fontSize: '32px' } })
- `promptItems` 自定义欢迎区建议卡片数据，类型为 `PromptProps[]`。
  > 用于覆盖默认的三张欢迎卡片（标题 + 描述 + 图标 + badge），建议用户修改掉默认值。
- `pillItems` 自定义输入框上方的快捷操作按钮数据，类型为 `{ id: string; text: string; menus: { id: string | number; text: string; inputMessage: string }[] }[]`。用
  > 于覆盖默认的三个胶囊按钮组（如「办公助手」「开发支持」等），建议用户修改掉默认值。
- `layout-mode` 布局模式，支持所有 CSS position 属性值：`'static' | 'relative' | 'absolute' | 'fixed' | 'sticky'`，默认值为 `'fixed'`。
  > 用于控制组件在网页上定位方式。

### 1.2 远程遥控模式属性

- `AILogoUrl` 悬浮AI图标的 url 地址。
- `agentRoot` 后端代理`Web Agent`的服务地址。
- `sessionId` 用户应用向`Web Agent`的服务端注册后生成的id, 用于标识当前页面。如果不使用远程遥控模式，可以忽略该值。
- `remoteUrl` 远程遥控的URL地址，用于显示在遥控器模式下，点击`遥控器链接`菜单时，要跳转的远程遥控网页。
- `qrCodeUrl` 远程遥控的URL地址，用于显示在遥控器模式下，点击 `扫码登录`菜单时，会弹出二维码让用户扫码，扫码成功后进入的地址。
- `menuItems` 菜单项配置数组，用于显示在遥控器模式下，点击遥控器图标后，显示的菜单项。具体配置项见 [api-createRemoter](./api-createRemoter.md)。 它默认情况下显示全部菜单，若传入空数组，则不显示菜单。

### 1.3 大模型属性

- `llmConfig` 大语言模型配置对象，详见下面类型声明。
- `llmConfigs` LLM 配置数组，每一项基于 `llmConfig` 格式，额外包含 `id`、`label`、`icon`、`isDefault`、`useReActMode` 字段。传入此属性后，会在输入框底部部显示模型切换组件，支持通过 `v-model:selectedModelId` 控制选中的模型。
- `v-model:selectedModelId` 双向绑定当前选中的模型 ID（字符串类型），当传入 `llmConfigs` 时，可通过此属性控制选择的模型
- `v-model:enabledTools` 双向绑定默认启用的工具状态（`Record<string, boolean>` 类型），键为工具名称，值为是否启用。主要用于控制本地工具的默认启用状态
- `systemPrompt` 对话的系统提示词，默认值为`'你是一个智能助手，擅长通过工具调用帮助用户解决问题和满足用户需求'`
- `skills` 设置技能的配置对象（`Record<string, string>` 类型）。通常配合 Vite 的 `import.meta.glob` 导入标准 `SKILL.md` 文件。AI 助手会自动识别用户意图并调用相应的技能，无需手动触发。
- `mcpServers` 预置 MCP 服务器配置（业界格式 `Record<string, McpServerConfig>`）。键为服务器名称，值为单台服务器配置；组件初始化时会自动加载并出现在「已添加MCP服务」中。**一般对应前端的 MCP 服务，页面关闭后即不存在。** 支持配置自定义 `name`（插件显示名称）和 `description`（插件功能描述），配置说明见 [预置 MCP 服务器（mcpServers）](#预置-mcp-服务器mcpservers)
- `customMarketMcpServers` 自定义 MCP 市场服务列表（`PluginInfo[]`）。组件内部不再内置任何默认市场服务，若需使用官方默认的 MCP 工具集，需从应用层导入并传入。**一般对应后台的 MCP 服务，可常驻存在。**

::: tip
`llmConfig` 和 `llmConfigs`同时设置时，`llmConfig`优先生效。当手动切换`llmConfigs`中的模型时，会切换为选择的模型。 不建议同时传入这2个属性。
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

- `inBrowserExt` 设置组件运行在普通页面还是浏览器的扩展中，默认值为：false
- `genUiAble` 双向绑定是否启用生成式 UI 的渲染，默认值为：false。输入框旁的「生成式 UI 开关」是否显示由**当前模型配置**决定：仅当配置中同时包含 `baseURL` 和 `genuiUrl` 时才会显示该开关
- `genUiComponents` 生成式 UI 内置了一批组件，如果需要引入新组件，需要通过这里导入。参考示例：`shallowReactive({ TinyUser, TinyAlert })`

## 二、事件

- `before-ai-render` 在 AI 消息渲染之前触发，用户此时可以修改消息内容。 参数的`uiContent`属性中，包含当前流返回的消息类型：markdown, reasoning,tool,或其它自定义的消息，用户可以自由编排`uiContent`属性。 它配合组件暴露的`registerContentRenderer`方法，可以实现自定义流消息的渲染，详见底部示例。

## 三、插槽

- `#welcome`: 没有对话消息时，展示在组件中间的 `Welcome & Promts` 等内容。设计成插槽可以让用户有完全的定制能力。
- `#suggestions`: 展示在输入框上面的提示性组件。可以使用 `@opentiny/tiny-robot` 中的 `SuggestionPills` 等强大功能的组件。
- `#operations`: 容器头部右侧的操作区域，默认包含新建会话按钮、历史会话按钮和扫码组件。可以通过此插槽自定义头部操作按钮。
- `#header-actions`: MCP 服务器选择器（插件市场）头部的操作区域，可以在此处添加自定义操作按钮，如自定义添加插件的按钮等。

## 四、导出变量

```typescript
defineExpose({
  /** 大模型代理（AgentModelProvider 实例） */
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
  senderRef,
  /** 取消发送 */
  abortRequest,
  /** 发送消息 */
  sendMessage,
  /** 向插件市场添加一个server */
  loadMcpServerToPlugin,
  /** mcp client断开时，自动清理已断开的插件和资源 */
  handleClientDisconnected,
  /** 添加消息 */
  addMessage
})
```

导出变量是方便在插槽中使用内部的功能，比如 `#welcome 插槽` 中点击后 `Promts` ,发出固定的请求:

```typescript
const robotRef = ref<InstanceType<typeof TinyRemoter>>()

function promtClick(item) {
  robotRef.sendMessage(item.description)
}
```

## 五、插槽示例

### 插槽使用示例

#### 自定义头部操作区域（operations 插槽）

```vue
<template>
  <TinyRemoter v-model:show="show" sessionId="your-session-id" title="我的AI助手" systemPrompt="你是一个智能助手">
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

const show = ref(false)

function handleCustomAction() {
  console.log('执行自定义操作')
}

function handleExport() {
  console.log('导出对话')
}
</script>
```

#### 自定义插件市场头部操作（header-actions 插槽）

```vue
<template>
  <TinyRemoter v-model:show="show" sessionId="your-session-id" title="我的AI助手" systemPrompt="你是一个智能助手">
    <template #header-actions>
      <!-- 在插件市场头部添加自定义按钮 -->
      <button class="custom-add-button" type="button" @click="openCustomModal">
        <span>+</span>
        自定义添加
      </button>
    </template>
  </TinyRemoter>
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'

const show = ref(false)

function openCustomModal() {
  // 打开自定义添加插件的弹窗
  console.log('打开自定义添加弹窗')
}
</script>
```

#### 自定义欢迎界面和提示建议（welcome 和 suggestions 插槽）

```vue
<template>
  <TinyRemoter
    ref="robotRef"
    v-model:show="show"
    sessionId="your-session-id"
    title="我的AI助手"
    systemPrompt="你是一个智能助手"
  >
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
```

## 六、自定义市场 MCP 插件（customMarketMcpServers）

`customMarketMcpServers` 属性让你可以在 TinyRemoter 的“插件市场”中动态追加自有 MCP 服务。**一般用于接入后台的 MCP 服务，这类服务可常驻存在。** 数组结构遵循 `PluginInfo` 定义，常用字段如下：

```ts
const customMarketMcpServers = [
  {
    id: 'ppt-mcp',
    name: 'PPT文档MCP服务器',
    description: '可以创建、编辑、保存PPT文档',
    icon: 'https://your-mcp-server-icon-url.com/icon.png',
    url: 'https://your-mcp-server-url.com/servers/ppt-mcp/sse',
    type: 'sse',
    enabled: false,
    addState: 'idle',
    tools: []
  }
]
```

- `id` 需要保持唯一（最终会拼接成 `plugin-${id}`）
- `type` 对应该 MCP 服务的协议类型，例如 `sse`、`StreamableHTTP`
- `enabled/addState/tools` 驱动 TinyRemoter 市场内的状态展示（中文注释：配合 UI 控制按钮、进度等）

组件不再内置默认市场服务。你可以在应用层灵活定义并传入。如果你希望保留 OpenTiny 官方提供的默认市场工具，可以参照如下配置：

```vue
<!-- App.vue (推荐配置示例) -->
<script setup lang="ts">
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
// 导入官方定义的默认市场工具（按需）
import { DEFAULT_SERVERS } from '@opentiny/next-remoter/src/components/default-mcps'

const customMarketMcpServers = ref([...DEFAULT_SERVERS])
</script>

<template>
  <TinyRemoter :customMarketMcpServers="customMarketMcpServers" />
</template>
```

通过这种方式，你可以完全控制市场面板中显示的插件列表。

### 自定义 MCP 请求 Header (headers)

`customMarketMcpServers` 中的每个配置项也支持 `headers` 字段，用于向该 MCP 服务器发起请求时携带自定义 Header：

```ts
const customMarketMcpServers = [
  {
    id: 'ppt-mcp',
    name: 'PPT文档MCP服务器',
    // ... 其他配置
    url: 'https://your-mcp-server-url.com/mcp',
    type: 'streamableHttp',
    // 自定义请求 Header
    headers: {
      'Authorization': 'Bearer your-mcp-token'
    }
  }
]
```

## 七、设置 MCP 服务器（mcpServers）

`mcpServers` 属性用于在组件初始化时预置一批 MCP 服务器，采用业界通用的对象格式：**键为服务器名称，值为 `McpServerConfig`**。**一般用于接入前端的 MCP 服务，生命周期与页面一致，页面关闭后连接即断开。** 这些服务器会在启动时自动加载并出现在「已添加MCP服务」中，无需用户从市场手动添加。

格式示例：

```ts
// 业界格式：键为服务器名称，值为 McpServerConfig
const mcpServers = {
  'my-app-mcp-server': {
    type: 'streamableHttp',
    url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp?sessionId=xxx',
    name: '我的自定义助手', // 可选：插件在面板中显示的名称
    description: '这是一个预置的专业助手服务', // 可选：插件的描述信息
    // 支持配置自定义 Header
    headers: {
      'X-Project-Id': 'project-456'
    }
  },
  'local-mcp-server': {
    type: 'local',
    transport: clientTransport,
    name: '本地专用工具' // 可选
  }
}
```

`McpServerConfig` 支持以下类型（与 next-sdk 一致），所有类型均支持可选的 `name` (string) 和 `description` (string) 字段：

- `type: 'streamableHttp'` 或 `type: 'sse'`：需提供 `url`，可选 `useAISdkClient` 和 `headers`
- `type: 'extension'`：需提供 `url`、`sessionId`，可选 `useAISdkClient` 和 `headers`
- `type: 'local'`：需提供 `transport`（MCP 传输层），可选 `useAISdkClient`
- `type: 'builtin'`：浏览器内置 WebMCP（如 Chrome 146+）。需提供 `client` 对象，通常设为 `document.modelContext`。**建议配合 `@opentiny/next-sdk` 的 `modelContext` 使用，以获得完美的 SPA 路由握手支持。**

## 八、浏览器内置 WebMCP 配置示例

```ts
const nav = navigator as any
const mcpServers = {
  // 接入浏览器原生 WebMCP 能力（需浏览器支持或通过 SDK 模拟）
  'builtin-mcp': {
    type: 'builtin',
    client: nav.modelContextTesting, // 指向原生测试接口
    name: '浏览器内置工具', // 自定义插件名称
    description: '通过原生测试接口暴露的工具集' // 自定义描述
  }
}
```

> **注意：** 即使使用了内置浏览器 MCP，我们也强烈建议在业务页面内通过 `import { modelContext } from '@opentiny/next-sdk'` 来注册工具。SDK 提供的 `modelContext` 封装层会自动透传给原生引擎，同时解决了原生 API 无法感知单页应用路由跳转导致的调用超时问题。

## 工具接入模式（两条路径）

当前推荐按业务选择以下两种模式之一：

### 模式一：分离式定义（mcp-servers）

- 在 `mcp-servers` 中集中声明工具（`server.registerTool(..., { route })`）；
- 页面中使用 `registerPageTool` 提供实际 handler；
- 工具调用时由 `withPageTools` 自动跳转到 `route` 并等待页面就绪后执行。

该模式适合工具治理要求高、希望工具定义集中管理的项目。

### 模式二：页面内一体化定义

- 在业务页面中直接 `server.registerTool(name, config, callback)`；
- 页面销毁时调用 `server.unregisterTool(name)` 取消注册；
- Remoter 通过 `listTools` 实时感知工具增删变化。

该模式适合工具与页面状态强耦合、希望“声明和回调在同文件”维护的项目。

### 选择建议

- 团队协作、规范优先：选“分离式定义”；
- 页面自治、开发效率优先：选“页面内一体化定义”；
- 两种模式可以并存，但建议按模块统一风格，避免维护复杂度上升。

## 页面工具调用提示效果（invokeEffect）

`invokeEffect` 不是 TinyRemoter 的属性，而是 `withPageTools` 的 `RouteConfig` 中的可选配置，用于在调用页面工具时在业务页面左下角展示一个轻量的调用提示效果。

典型注册方式如下：

```ts
// 业务侧 mcp-servers/orders/tools.ts
server.registerTool(
  'order_query',
  {
    title: '查询订单',
    description: '【订单管理工具】查询电商订单列表，可按订单号、客户姓名或状态筛选。'
  },
  {
    route: '/orders',
    // 开启页面工具调用提示效果，并自定义展示文案
    invokeEffect: {
      label: '正在为你查询订单列表…'
    }
  }
)
```

配置说明：

- `invokeEffect?: boolean | { label?: string }`
  - 不配置 / `false`：不展示任何额外提示；
  - `true`：使用默认文案（优先取工具标题 `config.title`，否则回退到工具名）；
  - 对象：可通过 `label` 自定义提示文案，例如「正在为你整理库存数据…」。
- 提示效果渲染在**业务页面所在的 window** 中，因此：
  - 当 TinyRemoter 与业务页面处于同一窗口时，效果直接展示在当前页面左下角；
  - 当 TinyRemoter 运行在 iframe 中时，效果展示在宿主页面左下角，Remoter 内部无须额外配置。

推荐做法是：

- 通过 `withPageTools + RouteConfig` 精准绑定工具与页面路由，并按需开启 `invokeEffect`；
- 对于远程调用型工具（如订单、库存等跨页面能力），可在各自的 RouteConfig 中配置不同的 `invokeEffect.label`，帮助最终用户理解当前 AI 正在操作哪类页面能力。

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

### 设置布局模式（layout-mode）

`layout-mode` 属性用于控制组件的定位方式，支持所有 CSS position 属性值。这在不同的使用场景下非常有用：

#### 静态定位模式

使用 `static` 定位，组件会占据正常的文档流位置，适合将对话框嵌入到页面布局中。

```vue
<template>
  <div class="chat-container">
    <!-- 静态定位，组件会占据 100% 的宽高，适合嵌入页面 -->
    <TinyRemoter
      v-model:show="show"
      layout-mode="static"
      sessionId="your-session-id"
      title="我的AI助手"
      systemPrompt="你是一个智能助手"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'

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
    <TinyRemoter
      v-model:show="show"
      :layout-mode="layoutMode"
      sessionId="your-session-id"
      title="我的AI助手"
      systemPrompt="你是一个智能助手"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'

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
  apiKey: '',
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
    :llmConfig="llmConfig"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import { createOpenAI } from '@ai-sdk/openai'

const show = ref(false)

// 使用自定义Provider实例
const llmConfig = {
  llm: createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://api.openai.com/v1',
    fetch: (...args) => {
      // 这里可以自定义大模型请求链接地址，非必要无需配置fetch
      args[0] = args[0] + '?test=123'
      return fetch(...args)
    }
  })
}
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
  apiKey: '',
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
    :llmConfig="anthropicConfig"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import { createAnthropic } from '@ai-sdk/anthropic'

const show = ref(false)

// 使用Anthropic Provider
const anthropicConfig = {
  llm: createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  })
}
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
  apiKey: '',
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

### 使用模型切换功能（llmConfigs）

当传入 `llmConfigs` 属性时，组件会在头部显示模型切换组件，支持在不同模型之间切换。通过 `v-model:selectedModelId` 可以双向绑定当前选中的模型 ID。

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    v-model:selected-model-id="selectedModelId"
    sessionId="your-session-id"
    title="我的AI助手"
    systemPrompt="你是一个智能助手"
    :llmConfigs="modelConfigs"
  />
</template>

<script setup>
import { ref, watch } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import IconOpenAI from './icons/openai.svg'
import IconDeepSeek from './icons/deepseek.svg'

const show = ref(false)
const selectedModelId = ref('gpt-4o')

// 定义模型配置数组
const modelConfigs = [
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    icon: IconOpenAI,
    isDefault: true,
    apiKey: '',
    baseURL: 'https://api.openai.com/v1',
    providerType: 'openai',
    model: 'gpt-4o',
    maxSteps: 10,
    useReActMode: false
  },
  {
    id: 'deepseek-v3',
    label: 'DeepSeek V3',
    icon: IconDeepSeek,
    apiKey: '',
    baseURL: 'https://api.deepseek.com',
    providerType: 'deepseek',
    model: 'deepseek-chat',
    maxSteps: 30,
    useReActMode: false
  }
]

// 监听模型切换
watch(selectedModelId, (newModelId) => {
  console.log('当前选中的模型:', newModelId)
  // 组件内部会自动调用 customAgentProvider.updateLLMConfig() 更新模型配置
  // 无需手动调用，模型切换时会自动更新 Agent Provider 的 LLM 配置
})
</script>
```

**模型切换机制说明：**

当 `selectedModelId` 发生变化时，组件内部会自动执行以下操作：

1. **自动更新模型配置**：组件会监听 `selectedModel` 的变化，自动调用 `customAgentProvider.updateLLMConfig()` 方法
2. **更新 LLM 实例**：`updateLLMConfig()` 方法会根据新的模型配置创建新的 Provider 实例，并更新到 `agent.llm`
3. **支持的条件**：只有当模型配置中包含 `providerType` 时才会自动更新（如果使用 `llm` 实例配置，则不会自动更新）

### 自定义AI, USER的头像

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    sessionId="your-session-id"
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

### 通过脚本控制插件市场

有的场景不希望用户手动控制对话中要使用的 `MCP Tools`, 而是通过脚本控制加载的插件。

```vue
<template>
  <TinyRemoter
    ref="myRemoter"
    v-model:show="show"
    sessionId="your-session-id"
    title="我的AI助手"
    systemPrompt="你是一个智能助手"
    :llmConfig="llmConfig"
  />
</template>

<script setup>
import { ref, useTemplateRef } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import { createOpenAI } from '@ai-sdk/openai'

const show = ref(false)
const llmConfig = {
  apiKey: '',
  baseURL: 'https://api.openai.com/v1',
  providerType: 'openai',
  model: 'gpt-4o'
}

const myRemoter = useTemplateRef('myRemoter')

// 通过脚本来查看和控制插件的加载
async function setMyMcpTool() {
  if (myRemoter.value) {
    // 打印当前的插件
    console.log('当前的插件', myRemoter.value.installedPlugins)

    // 添加插件
    await myRemoter.value.addPluginCore({
      pluginId: 'my-pdf-mcptool',
      name: '我的pdf工具',
      description: 'pdf工具的描述',
      mcpServer: {
        type: 'streamableHttp',
        url: 'https://agent.opentiny.design/servers/markdown2pdf-mcp/sse'
      }
    })

    // 移除插件
    const delPlugin = myRemoter.value.installedPlugins.find((item) => item.id === 'my-pdf-mcptool')
    if (delPlugin) {
      await myRemoter.value.deletePlugin(delPlugin)
    }
  }
}
</script>
```

### 自定义流消息的渲染

有的场景是让大模型返回指定格式的文本内容，对这些内容进行特别渲染,适用于生成式UI 等。 下面举一个简单的例子说明如何使用自定义流消息的渲染。

当大模型返回的文本中包含 `HEART` 时，将它渲染为 emoji ❤️ 。我们分2步来实现：

1. 监听所有流消息中，包含`HEART`的文本，并分隔成多个消息段。 比如：

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

2. 注册一个 heart 类型的渲染器,渲染所有的heart消息。

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
import { createOpenAI } from '@ai-sdk/openai'

const show = ref(false)
const llmConfig = {
  apiKey: '',
  baseURL: 'https://api.openai.com/v1',
  providerType: 'openai',
  model: 'gpt-4o'
}

const myRemoter = useTemplateRef('myRemoter')

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
  myRemoter.value?.registerContentRenderer('heart', (content: any) => {
    return h('span', {}, content)
  })
})
</script>
```

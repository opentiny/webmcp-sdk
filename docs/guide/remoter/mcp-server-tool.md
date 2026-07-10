---
outline: [2, 3]
---

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

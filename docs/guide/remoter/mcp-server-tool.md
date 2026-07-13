---
outline: [2, 3]
---

# MCP Server 与工具指南

## 一、概念介绍

在智能体开发中，**工具**是大模型感知和操作外部世界的唯一方式；**MCP Server** 是工具的载体，通过 MCP Server 可以方便地将工具引入智能体对话。`TinyRemoter` 组件支持多种方式配置工具和 MCP Server。

## 二、引入工具

通过 `llmConfig` 或 `llmConfigs` 数据项中的 `extraTools` 属性，可向 `TinyRemoter` 引入 tools。`extraTools` 为 ai-sdk 库的 `ToolSet` 类型，本质是一个对象，键为工具名称，值为 `Tool` 类型，详见 [ai-sdk Tools](https://ai-sdk.dev/docs/foundations/tools) 文档。

```vue
<template>
  <TinyRemoter v-model:show="show" title="我的AI助手" :llmConfig="llmConfig" />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import '@opentiny/next-remoter/dist/style.css'
import { tool } from 'ai'
import { z } from 'zod'

const show = ref(false)

const llmConfig = {
  apiKey: '',
  baseURL: 'https://api.custom-llm.com/v1',
  providerType: 'openai',
  model: 'gpt-4o',
  extraTools:{
    ['get-time']: tool({
        description: 'Get the weather in a location',
        inputSchema: z.object({ }),
        execute: async ({  }) => {
            return { time: new Date().toString() };
        },
    });
  }
}
</script>
```

## 三、引入 MCP Server

通过 `mcpServers` 属性配置 MCP 服务器，格式为业界通用的 `Record<string, McpServerConfig>`。组件初始化时会自动加载，并出现在插件 Server 列表中。配置类型如下：

`useAISdkClient` 用于指定通过 ai-sdk 的 `createMCPClient` 还是原生 `WebMcpClient` 创建 client，使用时无实质差别。

除两种标准 MCP Server 外，还支持 `type: 'builtin'` 自定义 Server，表示使用浏览器内置 WebMCP API，将 `document.modelContext` 作为 MCP 工具数据源，详见下方示例：

```typescript
type McpServerConfig =
  | {
      type: 'streamableHttp'
      url: string
      useAISdkClient?: boolean
      headers?: Record<string, string>
      name?: string
      description?: string
    }
  | {
      type: 'sse'
      url: string
      useAISdkClient?: boolean
      headers?: Record<string, string>
      name?: string
      description?: string
    }
  | {
      type: 'builtin'
      client: BuiltinMcpClient
      name?: string
      description?: string
    }
```

简单示例：

```vue
<template>
  <TinyRemoter v-model:show="show" title="我的AI助手" :llmConfig="llmConfig" :mcpServers="mcpServers" />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import '@opentiny/next-remoter/dist/style.css'
import { tool } from 'ai'
import { z } from 'zod'

const show = ref(false)

const llmConfig = {
  apiKey: '',
  baseURL: 'https://api.custom-llm.com/v1',
  providerType: 'openai',
  model: 'gpt-4o'
}

const mcpServers = ref({
    '12306':{
        type: 'streamableHttp',
        url: 'https://www.12306.com/mcp',
        useAISdkClient: true,
        name: '12306服务'
        description: "查询车次，票价等"
    },
    'page-builtin-webmcp': {
        type: 'builtin' as const,
        client: doc.modelContext,
        name: '浏览器内置工具',
        description: '通过 document.modelContext 暴露的浏览器原生 MCP 工具'
    }
})
</script>
```

## 四、自定义市场 MCP 插件

组件的「插件」功能支持预先配置一批可用 MCP Server，便于用户快速勾选并添加到对话中。通过 `customMarketMcpServers` 属性传入，数据结构遵循 `PluginInfo` 定义，详见 [Tiny Robot MCP Server Picker 文档](https://docs.opentiny.design/tiny-robot/guide/quick-start)。

完整示例如下：

```vue
<!-- App.vue（推荐配置示例） -->
<script setup lang="ts">
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'

/**
 * - `id` 需保持唯一（最终会拼接为 `plugin-${id}`）
 * - `type` 对应该 MCP 服务的协议类型，例如 `sse`、`StreamableHTTP`
 * - `enabled` / `addState` / `tools` 驱动 TinyRemoter 市场内的状态展示（配合 UI 控制按钮、进度等）
 */
const customMarketMcpServers = ref([
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
  // .......
])
</script>

<template>
  <TinyRemoter :customMarketMcpServers="customMarketMcpServers" />
</template>
```

## 五、编程方式控制插件和 MCP Server

`TinyRemoter` 实例暴露了多个变量和方法，详见 [基本用法](./basic.md) 中的「导出变量」。与本章相关的包括：`loadMcpServerToPlugin`、`installedPlugins`、`addPluginCore`、`deletePlugin`、`refreshPluginTools` 等。

```vue
<template>
  <TinyRemoter
    ref="remoterRef"
    v-model:show="show"
    v-model:fullscreen="fullscreen"
    title="我的AI助手"
    systemPrompt="你是一个智能助手"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import '@opentiny/next-remoter/dist/style.css'

const show = ref(false)
const fullscreen = ref(false)
const remoterRef = ref()

// 在后续事件中，通过 remoterRef.value 调用内部变量和方法
</script>
```

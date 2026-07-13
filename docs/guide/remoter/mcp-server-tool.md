---
outline: [2, 3]
---

# Mcp Server 与 工具指南

## 一、概念介绍

在智能体的开发中，`工具`是大模型能够感知世界和操作世界唯一方式，`Mcp Server`是工具的载体，通过Mcp Server很容易将工具引入智能体的对话中。TinyRemoter组件支持设置多种方式设置`工具和Mcp Server`。

## 二、引入工具

通过 `llmConfig` 或 `llmConfigs` 的数据项中，通过 `extraTools` 属性，向TinyRemoter组件引入tools。`extraTools` 属性是 ai-sdk 库的`ToolSet`类型，本质是一个对象， 键为工具名称，键值为`Tool`类型， 请参考 [ai-sdk Tools](https://ai-sdk.dev/docs/foundations/tools) 的文档。

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

## 三、引入 Mcp Sever

通过`mcpServers`属性来设置MCP 服务器,它是符合业界格式 `Record<string, McpServerConfig>`的对象,组件初始化时会自动加载并出现在插件的Server列表中。它的键值类型为：

`useAISdkClient` 是设置使用 `ai-sdk`的 `createMCPClient` 创建 或者 使用原生`WebMcpClient` 创建 client。在使用时并无差别。

除了2种标准的`McpServer`之外， 还支持 `type: 'builtin'` 自定义的Server，它表示使用浏览器内置 WebMCP API 类型,将 `document.modelContext` 作为 MCP 工具数据源，详见下方示例：

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

组件的`插件`功能中，默认支持预先设置一批可用 `McpServer`, 这样可以让使用者快速勾选服务，即可以添加到对话中。通过`customMarketMcpServers` 属性设置这些信息， 数据结构遵循 `PluginInfo` 定义，请参考 [Tiny Robot](https://docs.opentiny.design/tiny-robot/guide/quick-start)的`MCP Server Picker 插件选择器`组件的文档。

完整示例如下：

```vue
<!-- App.vue (推荐配置示例) -->
<script setup lang="ts">
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'

/**
 * `id` 需要保持唯一（最终会拼接成 `plugin-${id}`）
- `type` 对应该 MCP 服务的协议类型，例如 `sse`、`StreamableHTTP`
- `enabled/addState/tools` 驱动 TinyRemoter 市场内的状态展示（中文注释：配合 UI 控制按钮、进度等）
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

## 五、编程的方式控制插件和McpServer

TinyRemoter的实例上有很多`expose`的变量和方法，详见[基本用法](./basic.md)的 导出变量，通过它们可以直接操作组件内部的`插件`和`Mcp Server`。与本章相关的变量和方法有： `loadMcpServerToPlugin` ,`installedPlugins`, `addPluginCore`, `deletePlugin` , `refreshPluginTools` 等。

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

// 在后续事件中，使用remoterRef.value 来调用内部变量和方法
</script>
```

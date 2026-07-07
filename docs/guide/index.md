# 快速开始

**OpenTiny NEXT-SDKs** 是一套面向未来的前端智能化极简开发工具包。它的**核心使命是让每一个 Web 页面都能以极低的成本，快速进化为 AI Agent 的原生运行环境**。

作为 **WebMCP 规范**（浏览器内置模型上下文协议）的先行者与布道者，NEXT-SDKs 提供了以下不可替代的核心价值：

- **提供跨浏览器的 WebMCP Polyfill**：通过一行代码即可向全局注入标准的 `document.modelContext` 接口，让所有现代浏览器无需等待厂商升级，瞬间具备标准化的 AI 工具注册与调用能力。
- **化普通页面为原生 MCP Server**：打破传统后端 MCP Server 的局限，让前端开发者能使用最熟悉的 Web 原生 API，将复杂的页面状态、业务逻辑和底层 DOM 操作，直接且安全地暴露给 AI 大模型。
- **开箱即用的跨端遥控与通信架构**：内置与远端 Agent 的底层通信层，支持通过二维码扫码等极简交互，在手机端直接用自然语言实时遥控桌面端的 Web 页面。
- **全技术栈与复杂架构兼容**：无论是 Vue、React、Angular，还是多 iframe 嵌套、微前端等复杂业务场景，SDK 均提供了优雅的一体化解决方案。
- **对话组件与多模态的无缝集成**：提供灵活的适配器，能够将任意 UI 对话组件（如 TinyRobot）快速与底层的 WebMCP 能力桥接，让应用快速拥有强大的专属 AI 助手。

## 让你的应用智能化

使用 OpenTiny NEXT-SDKs，只需要以下四步，就可以把你的前端应用变成智能应用。我们**强烈推荐**使用基于浏览器原生标准 `document.modelContext` 的方式接入，它更符合 Web 标准并且代码更加简洁。

**第一步：安装 NEXT-SDKs**

```shell
npm i @opentiny/next-sdk
```

**第二步：初始化浏览器内置 WebMCP（Polyfill）**

在 Web 应用的主入口（比如：Vue 项目的 `main.ts` 或 `App.vue` 文件）调用 `initializeBuiltinWebMCP`。这会为不支持 WebMCP 的低版本浏览器注入 `document.modelContext` 实现。

```typescript
import { onMounted } from 'vue'
import { initializeBuiltinWebMCP } from '@opentiny/next-sdk'

onMounted(() => {
  // 激活浏览器内置 WebMCP 服务 (含低版本浏览器 Polyfill)
  initializeBuiltinWebMCP()
})
```

**第三步：在页面中按需注册工具**

在 Web 应用的具体业务页面（比如：`views/page1.vue`）中直接通过 `document.modelContext` 注册工具。当页面组件挂载时注册，卸载时通过 `AbortSignal` 取消注册，即可实现工具随路由按需加载。

```typescript
import { onMounted, onUnmounted } from 'vue'

const modelContext = (document as any).modelContext
const abortController = new AbortController()

onMounted(() => {
  if (!modelContext) return

  // 注册当前页面专属能力
  modelContext.registerTool(
    {
      name: 'demo_tool',
      title: '演示工具',
      description: '一个简单工具',
      inputSchema: {
        type: 'object',
        properties: { foo: { type: 'string' } },
        required: ['foo']
      },
      execute: async ({ foo }: { foo: string }) => {
        console.log('收到参数:', foo)
        return { content: [{ type: 'text', text: `收到: ${foo}` }] }
      }
    },
    { signal: abortController.signal } // 绑定取消信号
  )
})

onUnmounted(() => {
  // 页面离开时，自动取消注册工具，避免大模型产生工具干扰（幻觉）
  abortController.abort()
})
```

完成以上步骤，你的前端应用就变成了一个智能应用，你可以[通过各类 MCP Host 操控智能应用](mcp-host)。

我们还提供了一个网页版本的 AI 对话框，它就像一个遥控器，你可以通过这个遥控器直接在页面上与你的前端应用交互。

**第四步：引入并使用遥控器**

安装遥控器：

```shell
npm i @opentiny/next-remoter
```

在 App.vue 中使用遥控器，并连接到原生 WebMCP 接口：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import '@opentiny/next-remoter/dist/style.css'

const show = ref(true)

// 将客户端配置指向 document.modelContext 测试接口
const mcpServers = {
  'builtin-webmcp': {
    type: 'builtin' as const,
    client: navigator.modelContextTesting
  }
}
</script>

<template>
  <tiny-remoter :show="show" :mcpServers="mcpServers" />
</template>
```

这时你的前端应用右下角会出现一个遥控器入口，你可以将鼠标悬浮到这个图标上，弹出 AI 对话框并要求 AI 调用刚才注册的 `demo_tool` 工具。

> **底层进阶方案：**  
> 早期版本中，我们介绍过通过手动实例化 `WebMcpServer` 和 `WebMcpClient` 并结合 `createMessageChannelPairTransport` 建立通信层的方法。这种方式依然可用，但现在更推荐上述原生接入方式。关于手动构建通信层的方法，您可以参考相关的 API 手册。

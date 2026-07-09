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

在 Web 应用的主入口调用 `initializeBuiltinWebMCP`。这会为不支持 WebMCP 的浏览器注入 `document.modelContext` 实现。

> **提示：** 本文档的代码示例均以 **Vue** 技术栈为例。如果你使用的是 Angular 或 React 等其他前端框架，核心逻辑是完全相同的，只需参考对应框架的最佳实践，在应用全局入口和组件生命周期中执行相应的代码即可。

对于 Vue 项目，我们推荐直接在 `main.ts` 中进行全局初始化：

```typescript
import { createApp } from 'vue'
import App from './App.vue'
import { initializeBuiltinWebMCP } from '@opentiny/next-sdk'

// 激活浏览器内置 WebMCP 服务 (抹平浏览器兼容性)
initializeBuiltinWebMCP()

createApp(App).mount('#app')
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
    client: document.modelContext,
    name: '浏览器内置工具',
    description: '通过 document.modelContext 暴露的浏览器原生 MCP 工具'
  }
}
</script>

<template>
  <tiny-remoter :show="show" :mcpServers="mcpServers" />
</template>
```

这时你的前端应用右下角会出现一个遥控器入口，你可以将鼠标悬浮到这个图标上，弹出 AI 对话框并要求 AI 调用刚才注册的 `demo_tool` 工具。

### 进阶：连接第三方 Agent (可选)

通过 `@opentiny/next-sdk` 提供的 `WebMcpClient`，你可以将前端工具暴露给第三方代理（如 Coze、Cursor、Codex 等）。这需要连接到 `web-agent` 后台代理服务。

```typescript
import { WebMcpClient } from '@opentiny/next-sdk'

const client = new WebMcpClient()

// 连接 web-agent 后台代理
const { sessionId, transport } = await client.connect({
  sessionId: localStorage.getItem('web-agent-session-id') ?? undefined,
  agent: true,
  builtin: true,
  url: 'http://localhost:3000/api/v1/webmcp/mcp'
})

// 持久化 session，以便刷新页面后复用
if (sessionId) {
  localStorage.setItem('web-agent-session-id', sessionId)
}
```

#### 第三方 Agent 接入指南

对于第三方 Agent（如 Coze、Cursor 等大模型开发平台或编辑器），接入 `web-agent` 暴露出来的 MCP Server 接口与接入普通的后端 MCP Server 完全一样（例如使用标准的 SSE Transport）。

唯一的区别在于：由于后台代理需要知道把工具调用请求路由给哪一个具体的浏览器前端实例，**第三方 Agent 在连接 MCP 服务地址时，必须在 URL 或参数中附带上述代码获取到的 `sessionId`**。

例如，在 Cursor 或 Coze 等平台配置 MCP 服务（SSE 类型）时，你可以将连接的 URL 配置为类似如下格式：
```text
http://localhost:3000/api/v1/webmcp/mcp?sessionId=YOUR_SESSION_ID
```
通过附带这个 `sessionId`，第三方 Agent 就可以精准地与你当前正在操作的特定前端页面进行交互，并双向调用页面上注册的工具了。

关于如何启动和部署 `web-agent` 后台代理服务，请参考官方仓库：[https://github.com/opentiny/web-agent](https://github.com/opentiny/web-agent)。

#### 另一种接入方式：使用 webmcp-cli

除了通过远端的 `web-agent` 代理服务外，第三方 Agent 还可以通过 `webmcp-cli` 来接入和调用网页中的 WebMCP 工具。

`webmcp-cli` 作为一个可以在本地运行的命令行 MCP Server，无需额外部署后台网络服务。它非常适合本地开发调试阶段，或者配合运行在本地桌面端的大模型工具（如 Cursor 或本地的 Claude Desktop 等）快速与当前浏览器页面建立通信链路。有关 `webmcp-cli` 的详细使用与安装方法，请参考本项目的相关 CLI 文档。

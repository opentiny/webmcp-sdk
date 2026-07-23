---
outline: [2, 3]
---

# 快速开始

**MCP** 是一种开放标准网络协议 ，它标准化AI模型与智能体之间的双向通信，提供工具调用能力。**WebMCP** 就是在浏览器上运行的Mcp, 并提供工具调用，在与AI模型对话时，智能体就能感知到浏览器信息并操作浏览器。

**OpenTiny WebMCP-SDKs** 是一套面向未来的网页应用的智能化极简开发工具包。它的**核心使命是让每一个 Web 页面都能以极低的成本，快速进化为 AI Agent 的原生运行环境**。
目前， W3C 组织已经定义标准**WebMCP API**，将在 Chrome 150 上推出， **WebMCP-SDKs** 遵守浏览器最佳实践，整个方案都围绕着标准**WebMCP API**展开。

**WebMCP-SDKs** 提供了以下不可替代的核心价值：

- **提供 WebMCP Polyfill**：`WebMCP API`的Pollfill 方案，让所有现代浏览器无需等待厂商升级，具备`WebMCP API` 的工具注册与调用能力。
- **化普通页面为原生 MCP Server**：打破传统后端 MCP Server 的局限，让前端开发者能使用最熟悉的 Web 原生 API，将复杂的页面状态、业务逻辑和底层 DOM 操作，直接且安全地暴露给 AI 大模型。
- **开箱即用的跨端遥控与通信架构**：内置与远端 Agent 的底层通信层，支持通过二维码扫码等极简交互，在手机端直接用自然语言实时遥控桌面端的 Web 页面。
- **全技术栈与复杂架构兼容**：无论是 Vue、React、Angular，还是多 iframe 嵌套、微前端等复杂业务场景，SDK 均提供了优雅的一体化解决方案。
- **对话组件与多模态的无缝集成**：提供灵活的适配器，能够将任意 UI 对话组件（如 TinyRobot）快速与底层的 WebMCP 能力桥接，让应用快速拥有强大的专属 AI 助手。

## 一、应用页面智能化

使用 OpenTiny WebMCP-SDKs 可以把你的前端应用变成智能应用。我们**强烈推荐**使用基于浏览器原生标准 `document.modelContext` 的方式接入页面工具，它更符合 Web 标准并且代码更加简洁。

### 安装 WebMCP-SDKs依赖

```shell
npm i @opentiny/next-sdk
```

::: tip
由于历史原因， `WebMCP-SDKs`的名字最初叫 `next-sdk`， 在本系列文章中，凡是用 `next-sdk`的地方，均是`WebMCP-SDKs`的意思。
:::

### 安装 WebMCP Polyfill

在 Web 应用的主入口调用 `initializeBuiltinWebMCP`，这会为不支持 WebMCP 的浏览器注入 `document.modelContext` 实现。

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

### 按需注册页面工具

在 Web 应用的具体业务页面（比如：`views/page1.vue`）中直接通过 `document.modelContext` 注册工具。当页面组件挂载时注册，卸载时通过 `AbortSignal` 取消注册，即可实现工具随路由按需加载。完整的 `WebMCP API`的语法，参见下一节 [WebMCP API 文档](./webmcp-article.md)。

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

完成以上步骤，你的前端应用就变成了一个智能应用，我们提供了一个网页版本的 AI 对话框，它就像一个遥控器，你可以通过这个遥控器直接在页面上与你的前端应用交互。

## 二、集成对话组件

为了在应用中，集成一个对话组件与AI模型对话，并调用页面注册的工具， 我们提供了一个开箱即用的`Vue3组件`，首先安装对话组件的依赖包，然后在你的应用中引用它即可！

```shell
npm i @opentiny/next-remoter
```

::: tip 为什么叫Remoter 的名字
最初开发时，常用远程组件，遥控器来称呼它，慢慢地的就形成了习惯叫法。其实这个名字不很准确。
:::

在 App.vue 中的适当位置引入这个组件，并添加一个`mcpServer` 来关联上页面工具即可，详细的组件使用说明，参见[TinyRemoter 组件文档](../remoter/basic.md)：

```vue
<template>
  <tiny-remoter :show="show" title="智能小助理" :mcpServers="mcpServers" :llmConfig="llmConfig" />
</template>

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

const llmConfig = {
  // llm 配置信息
}
</script>
```

这种接入方式默认封装了底层的复杂交互，自动代理了页面注册工具。

1. **工具动态发现**：通过 `client` 属性，它内部会监听 `document.modelContext` 的 `toolchange` 事件，自动感知当前页面注册或销毁的工具，并实时将最新的 Schema 同步给大模型。
2. **自动代理执行**：当大模型决定调用特定工具时，底层会自动拦截指令，并代为调用浏览器的原生 `document.modelContext.executeTool()` 执行，最后将页面 UI 执行的结果反馈给模型和用户。

## 三、增加远程遥控能力

你可以将页面连接到 `WebAgent` 后台代理服务，之后就可以通过`WebAgent` 后台代理来`远程遥控`该页面。`WebAgent` 后台代理提供的是一个标准的`Mcp Server`服务，所以它可以方便接入许多智能体，实现跨应用或跨主机的`远程遥控`的功能。

`sessionId` 是连接凭证，通过它可以定位到操作页面。当页面关闭后，该`sessionId`会自动失效。

::: tip WebAgent 服务
WebAgent 服务是一个提前部署的 Node.js 后端应用，部署方法详见 [WebAgent 文档](https://docs.opentiny.design/web-agent/guide/getting-started) 或 [WebAgent 仓库](https://github.com/opentiny/web-agent/blob/main/README.zh-CN.md)。
:::

连接到 `WebAgent` 示例代码如下：

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

`WebAgent` 服务向外提供的是一个标准的`Mcp Server`，通过`sessionId` 实现在AI 智能体上来遥控网页。比如：

- 对接TinyRemoter对话组件
- 对接遥控网站
- 对接第三方代理（如 Vs Code 、Cursor、Codex 等）。

以Vs Code为例,在它的 `mcp.json`中配置：

```json
{
  "servers": {
    "page-tool-mcpServer": {
      "type": "http",
      "url": "http://localhost:3000/api/v1/webmcp/mcp?sessionId=SESSION_ID"
    }
  }
}
```

## 四、结语

WebMCP 并非要替代传统的后端服务器生态，而是将原本只开放给“人类键鼠交互”的浏览器前端功能，以结构化契约的形式开放给了 AI 代理。

通过结合 **WebMCP 原生标准** 与 **OpenTiny WebMcp SDKs**（含 polyfill、Tiny Remoter 组件集成），开发者可以在几乎不改变现有前端业务架构的前提下，快速低成本地为 Web 应用插上“原生 AI 操作”的翅膀，迈向人机高效协作的新纪元。

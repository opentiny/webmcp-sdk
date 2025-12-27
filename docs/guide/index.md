# 快速开始

**OpenTiny NEXT-SDKs** 是一套前端智能应用开发工具包，旨在简化 WebAgent 的集成与使用，支持多种编程语言和前端框架，帮助开发者快速实现智能化功能。

- 核心 SDK (包括 TypeScript, Python, Java 等版本) 提供简化的 API 封装与 WebAgent 服务的连接、认证等逻辑，同时提供易用的 API 让开发者将企业应用的前端功能声明为 MCP Server。
- 针对不同前端框架（Vue、React、Angular、Vanilla）特性，提供 API 以降低用户在特定前端框架中的使用 MCP Server 和连接 WebAgent 的难度。
- 提供一个适配器层，可以将任意前端 AI 对话框组件（包括 TinyRobot 组件）快速接入 WebAgent 服务。
- 支持抹平不同 LLM 差异，支持文字、语音等多模态输入，使得 AI 对话框连接的 LLM 支持受控端的 MCP 工具调用。
- 提供动态生成二维码功能，让企业应用里的 MCP 服务成为 AI 对话框里可以让 Agent 调用的工具。

## 让你的应用智能化

使用 OpenTiny NEXT-SDKs，只需要以下四步，就可以把你的前端应用变成智能应用。

**第一步：安装 NEXT-SDKs**

```shell
npm i @opentiny/next-sdk
```

**第二步：创建 WebMcpClient ，并与 WebAgent 连接**

在 Web 应用的主入口（比如：Vue 项目的 `App.vue` 文件）定义 WebMcpClient。

```typescript
import { onMounted, provide } from 'vue'
import { WebMcpClient, createMessageChannelPairTransport } from '@opentiny/next-sdk'

onMounted(async () => {
  const [serverTransport, clientTransport] = createMessageChannelPairTransport()
  provide('serverTransport', serverTransport)

  const client = new WebMcpClient()
  await client.connect(clientTransport)
  // 这个 sessionId 是 Web 应用与 WebAgent 服务建立连接后，由 WebAgent 服务生成的，用来唯一标识被操控的 Web 应用（被控端）
  const { sessionId } = await client.connect({
    agent: true,
    url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp'
  })
})
```

**第三步：创建 WebMcpServer ，并与 ServerTransport 连接**

在 Web 应用的子页面（比如：`views/page1.vue`）中定义 WebMcpServer，每个页面可以定义自己的 WebMcpServer，页面切换时，MCP Client 会与当前页面的 MCP Server 建立连接，并丢弃与之前页面的连接。

```typescript
import { onMounted, inject } from 'vue'
import { WebMcpServer, z } from '@opentiny/next-sdk'

onMounted(async () => {
  const serverTransport = inject('serverTransport')
  const server = new WebMcpServer({
    name: 'mcp-server-page1',
    version: '1.0.0'
  })

  server.registerTool(
    'demo-tool',
    {
      title: '演示工具',
      description: '一个简单工具',
      inputSchema: { foo: z.string() }
    },
    async (params) => {
      console.log('params:', params)
      return { content: [{ type: 'text', text: `收到: ${params.foo}` }] }
    }
  )

  await server.connect(serverTransport)
})
```

完成以上步骤，你的前端应用就变成了一个智能应用，就可以被 AI 操控，你可以[通过各类 MCP Host 操控智能应用](mcp-host)。

我们还提供了一个网页版本的 AI 对话框，这个 AI 对话框支持 PC 端和手机端，它就像一个遥控器，你可以通过这个遥控器操控你的前端应用。

**第四步：引入并使用遥控器**

安装遥控器：

```shell
npm i @opentiny/next-remoter
```

在 App.vue 中使用遥控器：

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import '@opentiny/next-remoter/dist/style.css'
const mySessionId = ref('')
const fullscreen = ref(false)

onMounted(async () => {
  // 第二步代码 ...
  // 第三步代码 ...

  mySessionId.value = session
})
</script>

<template>
  <!-- 注意：传递给 tiny-remoter 组件的 session-id 需要是 client.connect() 与 WebAgent 服务建立连接后，由 WebAgent 服务返回的 sessionId -->
  <tiny-remoter session-id="your-session-id" show :fullscreen="fullscreen" />
</template>
```

这时你的前端应用右下角会出现一个图标，这就是遥控器的入口，你可以将鼠标悬浮到这个图标上，选择：

- 弹出 AI 对话框，你的前端应用侧边会打开一个 AI 对话框
- 弹出二维码，手机扫码之后会打开手机端的遥控器

不管是通过弹出 AI 对话框，还是通过手机扫码，你都可以通过对话方式让 AI 代替你操作前端应用，提升完成任务的效率。

## 浏览器直接引入

你也可以直接通过浏览器 HTML 标签导入 NEXT-SDKs ，这样就可以使用全局变量 `WebMCP` 了。同样，通过初始化`WebMcpServer`和`WebMcpClient`生成一个`sessionId`, 就可以传递给 `TinyRemoter`组件使用了。

```html
<html>
  <head>
    <!-- 导入 NEXT-SDKs -->
    <script src="https://unpkg.com/@opentiny/next-sdk@0.1/dist/webmcp-full.js"></script>
  </head>
  <body>
    <script>
      ;(async () => {
        const { WebMcpServer, createMessageChannelPairTransport, z, WebMcpClient } = WebMCP
        const [serverTransport, clientTransport] = createMessageChannelPairTransport()

        const server = new WebMcpServer()
        server.registerTool(
          'demo-tool',
          {
            title: '演示工具',
            description: '一个简单工具',
            inputSchema: { foo: z.string() }
          },
          async (params) => {
            console.log('params:', params)
            return { content: [{ type: 'text', text: `收到: ${params.foo}` }] }
          }
        )

        await server.connect(serverTransport)

        const client = new WebMcpClient()
        await client.connect(clientTransport)
        const { sessionId } = await client.connect({
          agent: true,
          url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp'
        })

        console.log('sessionId:', sessionId)
      })()
    </script>
  </body>
</html>
```

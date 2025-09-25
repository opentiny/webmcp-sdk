# 远程连接 WebAgent 服务

**WebAgent** 是 [OpenTiny](https://opentiny.design/) 推出的智能代理的 Web 服务，提供智能应用与 AI 的连接通讯、OAuth 鉴权等丰富的特性。

<Info>
  我们以 Vue 应用为例，为大家介绍如何使用 NEXT-SDKs 将现有应用连接到 WebAgent 服务，转变成智能应用，被 AI 操控。
</Info>

## 安装 NEXT-SDKs

```shell
npm i @opentiny/next-sdk
```

## 创建 WebMcpClient，并与 WebAgent 连接

在 **App.vue** 文件中加入以下代码：

```typescript
import { onMounted } from 'vue'
import { WebMcpClient, createMessageChannelPairTransport } from '@opentiny/next-sdk'

onMounted(async () => {
  const [serverTransport, clientTransport] = createMessageChannelPairTransport()
  const client = new WebMcpClient()
  await client.connect(clientTransport)
  const { sessionId } = await client.connect({
    agent: true,
    url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp'
  })
)}
```

## 创建 WebMcpServer ，并与 ServerTransport 连接

在 **App.vue** 文件中加入以下代码：

```typescript
import { onMounted } from 'vue'
import { WebMcpServer } from '@opentiny/next-sdk'

onMounted(async () => {
  const server = new WebMcpServer()

  // 注册 MCP 工具
  server.registerTool(
    'demo-tool',
    {
      title: '演示工具',
      description: '一个简单工具',
      inputSchema: { foo: z.string() }
    },
    async (params) => {
      return { content: [{ type: 'text', text: `收到: ${params.foo}` }] }
    }
  )

  await server.connect(serverTransport)
})
```

完成以上步骤，你的前端应用就升级为智能应用了，你可以通过各种接入了 AI 的 MCP Host 对智能应用进行操控，具体配置方式参考：[通过各类 MCP Host 操控智能应用](mcp-host)

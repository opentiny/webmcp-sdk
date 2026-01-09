interface DefaultFilesOptions {
  nextSdkVersion?: string
}

export function getDefaultFiles(options?: DefaultFilesOptions) {
  const { nextSdkVersion = 'latest' } = options || {}

  return [
    {
      filename: 'src/App.vue',
      code: `
<script setup lang="ts">
  import { ref ,onMounted} from 'vue'
  import { WebMcpClient,WebMcpServer, z,createMessageChannelPairTransport } from '@opentiny/next-sdk'
  import { TinyRemoter } from '@opentiny/next-remoter'

  const count = ref(0)
  const sessionId = ref('')
  const [serverTransport, clientTransport] = createMessageChannelPairTransport()

  const changeCount = (action: 'increment' | 'decrement' = 'increment') => {
    if (action === 'increment') {
      count.value++
    } else {
      count.value--
    }
  }

  onMounted(async () => {
    // 创建 WebMcpClient ，并与 WebAgent 连接
    const server = new WebMcpServer({
      name: 'mcp-server-page1',
      version: '1.0.0'
    })

    server.registerTool(
      'button-control',
      {
        title: '按钮点击工具',
        description: '点击按钮进行增加或者减少',
        inputSchema: { action: z.enum(['increment', 'decrement']) }
      },
      async (params) => {
        changeCount(params.action)
        return { content: [{ type: 'text', text: '按钮已点击' }] }
      }
    )

    await server.connect(serverTransport)
    const client = new WebMcpClient()
    await client.connect(clientTransport)
    // 这个 sessionId 是 Web 应用与 WebAgent 服务建立连接后，由 WebAgent 服务生成的，用来唯一标识被操控的 Web 应用（被控端）
    const { sessionId: sessionID } = await client.connect({
      agent: true,
      url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp'
    })
    sessionId.value = sessionID
  })
</script>

<template>
  <div class="card">
    <tiny-remoter
      v-if="sessionId"
      agent-root="https://agent.opentiny.design/api/v1/webmcp-trial/"
      :session-id="sessionId"
      :menuItems="[
        {
          action: 'qr-code',
          show: false
        },
        {
          action: 'remote-control',
          show: false
        },
        {
          action: 'remote-url',
          show: false
        }
      ]"
    />
    <div>
      <div class="counter-label">计数器</div>
      <div class="counter">{{ count }}</div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button type="button" @click="changeCount('increment')">增加</button>
      <button type="button" @click="changeCount('decrement')">减少</button>
    </div>
  </div>
</template>

<style scoped>
.card {
  padding: 20px;
}

.read-the-docs {
  color: #888;
}
.tr-container {
  z-index: 999 !important;
}
.counter-label{
  width: 100px;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  margin: 10px 0;
}
.counter{
  border: 1px solid blue; 
  padding: 10px; 
  margin-bottom: 10px;
  text-align: center;
  width: 100px;
  font-size: 24px;
  color: blue;
}
</style>
`
    },
    {
      filename: 'src/index.css',
      code: `@import url('https://cdn.jsdelivr.net/npm/@opentiny/next-remoter@0.0.10-beta.7/dist/style.css') layer(base);
@import url('https://cdn.jsdelivr.net/npm/@opentiny/next-remoter@0.2.0/dist/style.css') layer(base);
@layer base {
  body {
    background-color: #fafafa;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
}
`
    }
  ]
}

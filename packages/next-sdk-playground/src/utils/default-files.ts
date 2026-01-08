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
  console.log('sessionId123:', sessionId.value)

  const changeCount = () => {
    count.value++
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
        title: '按钮控制工具',
        description: '控制按钮进行加减操作',
        inputSchema: { action: z.enum(['increment', 'decrement']) }
      },
      async (params) => {
        changeCount()
        return { content: [{ type: 'text', text: '按钮已点击' }] }
      }
    )

    await server.connect(serverTransport)
    const client = new WebMcpClient()
    await client.connect(clientTransport)

    const { sessionId: sessionID } = await client.connect({
      agent: true,
      url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp'
    })
    sessionId.value = sessionID
    console.log('sessionId456:', sessionId.value)
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
    <p>count is {{ count }}</p>
    <button type="button" @click="changeCount">点击按钮</button>
  </div>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
.tr-container {
  z-index: 999 !important;
}
</style>
`
    },
    {
      filename: 'src/index.css',
      code: `@import url('https://cdn.jsdelivr.net/npm/@opentiny/next-remoter@0.0.10-beta.7/dist/style.css') layer(base);
@import url('https://cdn.jsdelivr.net/npm/@opentiny/tiny-robot@0.4.0-alpha.2/dist/style.css') layer(base);
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

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
  import { TinyStatistic, TinyButton } from '@opentiny/vue'

  const count = ref(100)
  const sessionId = ref('')
  const [serverTransport, clientTransport] = createMessageChannelPairTransport()

  const changeCount = (action: 'increment' | 'decrement' = 'increment' , step: number = 1) => {
    if (action === 'increment') {
      count.value += step
    } else {
      count.value -= step
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
        inputSchema: { action: z.enum(['increment', 'decrement']), 
        step: z.number().optional() },
      },
      async (params) => {
        changeCount(params.action, params.step)
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
    <div class="card-container">
      <div class="counter-label">
        <tiny-statistic
          :value="count"
          :value-style="{ 'color': '#3ac295' }"
          :title="{ value: '计数中', position: 'top' }"
          >
        </tiny-statistic>
      </div>
        <div class="button-container">
          <tiny-button round @click="changeCount('increment')"> 增加 </tiny-button>
          <tiny-button type="primary" round @click="changeCount('decrement')"> 减少 </tiny-button>
        </div>
    </div>
    <tiny-remoter
      class="card-tiny-remoter"
      v-if="sessionId"
      agent-root="https://agent.opentiny.design/api/v1/webmcp-trial/"
      :session-id="sessionId"
      layout-mode="static"
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
  </div>
</template>

<style scoped>
.card {
  padding: 20px;
  display: flex;
  flex-direction: row;
  gap: 20px;
  align-items: flex-start;
}
.card-container {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  margin-top: 40px;
}
.card-tiny-remoter{
  min-width: 478px;
}
.counter-label{
  display: flex;
  flex-direction: column;
  align-items: center;
}
.button-container{
  display: flex; 
  gap: 8px;
  margin-top: 30px;
}
.tr-container {
  z-index: 999 !important;
}

:deep(.tiny-statistic__description){
  font-size: 28px;
  text-align: center;
  width: 100px;
}
:deep(.tiny-statistic__title){
  font-size: 28px;
  text-align: center;
}
</style>
`
    },
    {
      filename: 'src/index.css',
      code: `@import url('https://cdn.jsdelivr.net/npm/@opentiny/next-remoter@0.2/dist/style.css') layer(base);
@import url('https://cdn.jsdelivr.net/npm/@opentiny/next-remoter@0.2/dist/style.css') layer(base);
@import url('https://cdn.jsdelivr.net/npm/@opentiny/vue-theme@3.28.0/index.min.css') layer(base);
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

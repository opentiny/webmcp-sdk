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
  import { WebMcpClient, createMessageChannelPairTransport } from '@opentiny/next-sdk'
  import { TinyRemoter } from '@opentiny/next-remoter'
  const count = ref(0)
  const sessionId = ref('')
  console.log('sessionId:', sessionId)
  onMounted(async () => {
    const [serverTransport, clientTransport] = createMessageChannelPairTransport()

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
        :session-id="sessionId"
        mode="remoter"
        agent-root="https://agent.opentiny.design/api/v1/webmcp-trial"
        :menuItems="[
          { actions: 'qr-code', show: false },
          { actions: 'remote-control', show: false },
          { actions: 'remote-url', show: false }
        ]"
      >
      </tiny-remoter>
    <button type="button" @click="count++">count is {{ count }}</button>
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
    }
  ]
}

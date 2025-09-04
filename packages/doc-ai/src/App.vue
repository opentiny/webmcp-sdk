<template>
  <div class="app-container">
    <!-- 主体内容区域 -->
    <div class="main-content">
      <router-view />
    </div>
    <tiny-remoter :sessionId="SSEION_ID" v-if="loadingSessionId">
      <template #chat v-if="isAntDesignX">
        <ant-design-x></ant-design-x>
      </template>
    </tiny-remoter>
  </div>
</template>

<script setup lang="ts">
import { TinyRemoter } from '@opentiny/next-remoter'
import antDesignX from './components/ant-design-x.vue'
import { WebMcpClient, createMessageChannelPairTransport } from '@opentiny/next-sdk'
import type { Transport } from '@opentiny/next-sdk'
import { AGENT_ROOT, SSEION_ID } from './const'
import { provide, ref } from 'vue'

const [serverTransport, clientTransport] = createMessageChannelPairTransport()
const loadingSessionId = ref(false)

const query = new URLSearchParams(window.location.search)
const dialogId = query.get('dialog')

const isAntDesignX = dialogId === 'ant'

// 定义 MCP Server 的能力
const capabilities = {
  prompts: { listChanged: true },
  resources: { subscribe: true, listChanged: true },
  tools: { listChanged: true },
  completions: {},
  logging: {}
}

const mcpServer: {
  transport: Transport | null
  capabilities: Record<string, any>
} = {
  transport: serverTransport,
  capabilities
}

provide('mcpServer', mcpServer)

serverTransport.onerror = (error) => {
  console.error(`ServerTransport error:`, error)
}

const createProxyTransport = async () => {
  const client = new WebMcpClient(
    { name: 'mcp-web-client', version: '1.0.0' },
    { capabilities: { roots: { listChanged: true }, sampling: {}, elicitation: {} } }
  )
  // @ts-expect-error client
  window.client = client
  await client.connect(clientTransport)

  try {
    const { sessionId } = await client.connect({
      url: AGENT_ROOT + 'mcp',
      sessionId: SSEION_ID,
      agent: true,
      onError: (error: Error) => {
        console.error('Connect proxy error:', error)
      }
    })

    loadingSessionId.value = true //  加载sessionId成功后，再执行后续

    console.log('sessionId', sessionId)
  } catch (error) {
    console.error('WebMcpClient的连接失败', error)
  }

  window.addEventListener('pagehide', client.onPagehide)
}

createProxyTransport()
</script>

<style scoped></style>

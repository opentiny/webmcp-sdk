<template>
  <div class="app-container">
    <!-- 主体内容区域 -->
    <div class="main-content">
      <router-view />
    </div>
    <tiny-remoter :sessionId="sessionId" :menuItems="menuItems" :llmConfig="llmConfig">
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
import type { Transport, MenuItemConfig } from '@opentiny/next-sdk'
import { AGENT_ROOT } from './const'
import { provide, ref } from 'vue'
// 导入自定义 Provider
import { createCustomProvider } from './providers/custom-provider'
// 导入 Mock Fetch（用于测试）
import { createMockFetch } from './providers/mock-fetch'

// 方式一：使用现有的 ollama provider（当前使用）
// const llmConfig = {
//   model: 'deepseek-r1:1.5b',
//   llm: createOllama({
//     // baseURL: 'https://agent.opentiny.design/api/v1/ai/chat/completions',
//     baseURL: 'http://localhost:11434/api'
//     // fetch: (...args) => {
//     //   const urls = args[0].split('/chat')
//     //   urls.pop()
//     //   args[0] = urls.join('/chat')
//     //   args[1].headers.authorization = 'Bearer sk-trial'
//     //   console.log('ollama fetch args:' + args)
//     //   return fetch(...args)
//     // }
//   })
// }

// 方式二：使用自定义 Provider + Mock Fetch（用于测试，当前启用）
// 简单配置：直接使用 createMockFetch() 即可，无需传参数
const llmConfig = {
  model: 'mock-model',
  llm: createCustomProvider({
    baseURL: 'http://mock-api/v1', // URL 可以是任意值，会被 mock 拦截
    fetch: createMockFetch() // 使用默认配置即可
  })
}

// 方式三：使用自定义 Provider + 真实 API（取消注释即可使用）
// const llmConfig = {
//   model: 'your-model-name', // 替换为你的模型名称
//   llm: createCustomProvider({
//     // API 基础 URL
//     baseURL: 'https://api.your-llm.com/v1',
//     // API 密钥（如果需要）
//     apiKey: 'your-api-key',
//     // 自定义请求头（可选）
//     headers: {
//       'X-Custom-Header': 'custom-value'
//     },
//     // 自定义 fetch 函数（可选，可用于代理或拦截请求）
//     // fetch: (...args) => {
//     //   // 可以在这里修改请求 URL、添加认证等
//     //   return fetch(...args)
//     // },
//     // API 路径（可选，默认为 /chat/completions）
//     // apiPath: '/chat/completions',
//     // 是否启用流式响应（可选，默认为 true）
//     // stream: true
//   })
// }

const [serverTransport, clientTransport] = createMessageChannelPairTransport()
const menuItems = ref<MenuItemConfig[]>([])
const query = new URLSearchParams(window.location.search)
const dialogId = query.get('dialog')

const isAntDesignX = dialogId === 'ant'

menuItems.value = [
  {
    action: 'qr-code',
    show: false
  }
]

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

const sessionId = ref('')

const createProxyTransport = async () => {
  const client = new WebMcpClient(
    { name: 'mcp-web-client', version: '1.0.0' },
    { capabilities: { roots: { listChanged: true }, sampling: {}, elicitation: {} } }
  )
  // @ts-expect-error client
  window.client = client
  await client.connect(clientTransport)

  try {
    const { sessionId: _sessionId } = await client.connect({
      url: AGENT_ROOT + 'mcp',
      sessionId: localStorage.getItem('mcp-sessionId') || undefined,
      agent: true,
      onError: (error: Error) => {
        console.error('Connect proxy error:', error)
      }
    })

    console.log('sessionId', _sessionId)
    localStorage.setItem('mcp-sessionId', _sessionId)
    sessionId.value = _sessionId
  } catch (error) {
    console.error('WebMcpClient的连接失败', error)
  }

  window.addEventListener('pagehide', client.onPagehide)
}

createProxyTransport()
</script>

<style scoped></style>

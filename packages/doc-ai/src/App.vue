<template>
  <div class="app-container">
    <!-- 主体内容区域 -->
    <div class="main-content">
      <router-view />
    </div>
    <tiny-remoter :sessionId="sessionId" :menuItems="menuItems"> </tiny-remoter>
  </div>
</template>

<script setup lang="ts">
import { TinyRemoter } from '@opentiny/next-remoter'
import { WebMcpClient, createMessageChannelPairTransport } from '@opentiny/next-sdk'
import type { Transport, MenuItemConfig } from '@opentiny/next-sdk'
import { AGENT_ROOT } from './const'
import { provide, ref } from 'vue'

const [serverTransport, clientTransport] = createMessageChannelPairTransport()
const menuItems = ref<MenuItemConfig[]>([])

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

// --- Web Skill Integration Start ---
import { loadAllSkills } from './skill-runtime/loader'

// 使用自动加载器初始化技能系统
const skillRegistry = await loadAllSkills()

// 暴露给 window 以便控制台调试验证
// @ts-ignore
window.skillRegistry = skillRegistry

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('🎯 Web Skill System (Clean Architecture)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(
  'Available skills:',
  skillRegistry
    .getAllSkills()
    .map((s) => s.name)
    .join(', ')
)
console.log('\n💡 Try these commands:')
console.log('  await window.skillRegistry.executeSkill("calculator", { a: 10, b: 5, operation: "add" })')
console.log('  await window.skillRegistry.executeSkill("search_guide", { keyword: "库存" })')
console.log('  await window.skillRegistry.executeSkill("get_section", { section: "商品创建" })')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
// --- Web Skill Integration End ---
</script>

<style scoped></style>

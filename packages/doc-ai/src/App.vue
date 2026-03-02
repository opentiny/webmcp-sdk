<template>
  <div class="app-container">
    <!-- 主体内容区域 -->
    <div class="main-content">
      <router-view />
    </div>
    <!-- 用户层传入 skillMdModules，由 remoter 内部调用 next-sdk 的 skill 能力处理 -->
    <tiny-remoter :skills="skillMdModules" :show="show" :menuItems="menuItems" :mcpServers="mcpServers"> </tiny-remoter>
  </div>
</template>

<script setup lang="ts">
import { TinyRemoter } from '@opentiny/next-remoter'
import type { MenuItemConfig } from '@opentiny/next-sdk'
import { onMounted, ref } from 'vue'
import { createMcpServer, clientTransport } from './mcp-servers'
const menuItems = ref<MenuItemConfig[]>([])
const show = ref(true)

// 高兼容：同时匹配常见位置的 skills 目录，合并后直接传给 remoter，next-sdk 内部会统一处理 key
const skillMdModules = import.meta.glob('./skills/**/*', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

// 业界格式：key 为 MCP 服务器名称，value 为 McpServerConfig
const mcpServers = {
  'local-mcp-server': {
    type: 'local',
    transport: clientTransport
  }
}

console.log(skillMdModules)

onMounted(async () => {
  await createMcpServer()
})
</script>

<style scoped></style>

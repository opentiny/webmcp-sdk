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
import { skillMdModules } from './skills'
import { createMcpServer, clientTransport } from './mcp-servers'
const menuItems = ref<MenuItemConfig[]>([])
const show = ref(true)

// 业界格式：key 为 MCP 服务器名称，value 为 McpServerConfig
const mcpServers = {
  'local-mcp-server': {
    type: 'local',
    transport: clientTransport
  }
}

onMounted(async () => {
  await createMcpServer()
})
</script>

<style scoped></style>

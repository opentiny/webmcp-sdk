<template>
  <div class="app-container">
    <!-- 左侧主页面内容（70% 宽度） -->
    <div class="main-content">
      <router-view />
    </div>
    <!-- 右侧 AI 对话框（30% 宽度），使用相对布局避免覆盖左侧页面 -->
    <tiny-remoter
      class="remoter-pane"
      :skills="skillMdModules"
      :show="show"
      :menuItems="menuItems"
      :mcpServers="mcpServers"
      :routeBasedPageTools="true"
      :layoutMode="'relative'"
    />
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

onMounted(async () => {
  await createMcpServer()
})
</script>

<style scoped>
.app-container {
  display: flex;
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
  overflow: hidden;
}

.main-content {
  flex: 0 0 70%;
  max-width: 70%;
  height: 100%;
  overflow: auto;
}

.remoter-pane {
  flex: 0 0 30%;
  max-width: 30%;
  height: 100%;
  box-sizing: border-box;
  border-left: 1px solid #e5e6eb;
  background-color: #f7f8fa;
}
</style>

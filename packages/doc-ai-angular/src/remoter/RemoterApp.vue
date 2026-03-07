<template>
  <!-- iframe 内只渲染 TinyRemoter，不需要任何其他布局 -->
  <tiny-remoter :skills="skillMdModules" :show="show" :menuItems="menuItems" :mcpServers="mcpServers" />
</template>

<script setup lang="ts">
import { TinyRemoter } from '@opentiny/next-remoter'
import { createMessageChannelClientTransport } from '@opentiny/next-sdk'
import type { MenuItemConfig } from '@opentiny/next-sdk'
import { ref } from 'vue'

const menuItems = ref<MenuItemConfig[]>([])
const show = ref(true)

/**
 * 加载 skills 目录下所有 markdown 文件（技能定义保留在 Vue 侧）
 * 与 Vue 版本 App.vue 中的写法完全一致
 */
const skillMdModules = import.meta.glob('./skills/**/*', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

/**
 * 创建 MessageChannel 客户端传输层，连接到 Angular 主窗口中运行的 MCP Server。
 *
 * Angular 侧（主窗口）：
 *   createMessageChannelServerTransport('local-mcp') → listen() → server.connect()
 *
 * Vue iframe 侧（此处）：
 *   createMessageChannelClientTransport('local-mcp', window.parent)
 *   → 通过 MessageChannel 协议与 Angular 主窗口通信
 *
 * 参见文档：https://docs.opentiny.design/next-sdk/guide/connect-local.html
 */
const clientTransport = createMessageChannelClientTransport('local-mcp', window.parent)

// TinyRemoter 通过此 transport 与 Angular 中的 WebMcpServer 建立 MCP 连接
const mcpServers = {
  'local-mcp-server': {
    type: 'local',
    transport: clientTransport
  }
}

/**
 * 注意：
 * - 无需 onMounted 初始化 MCP Server（MCP Server 在 Angular 侧）
 * - 无需 setNavigator（Angular AppComponent 已直接注册 Angular Router）
 * - 无需跨窗口消息桥接（page-tool-bridge 的 postMessage 在 Angular 主窗口内通信）
 * - Vue iframe 职责单一：AI 聊天 UI + skills 加载 + 与 Angular MCP Server 的连接
 */
</script>

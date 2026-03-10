<template>
  <tiny-remoter
    :skills="skillMdModules"
    :show="show"
    :fullscreen="true"
    :menuItems="menuItems"
    :mcpServers="mcpServers"
    :pageToolsOnDemand="true"
  />
</template>

<script setup lang="ts">
import { TinyRemoter } from '@opentiny/next-remoter'
import { createMessageChannelClientTransport } from '@opentiny/next-sdk'
import type { MenuItemConfig } from '@opentiny/next-sdk'
import { ref } from 'vue'

const menuItems = ref<MenuItemConfig[]>([])
const show = ref(true)

/** 加载 skills 目录下所有 markdown（技能定义），与 next-remoter 示例一致 */
const skillMdModules = import.meta.glob('./skills/**/*', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

/** MessageChannel 客户端：与 Angular 主窗口中的 MCP Server 通信 */
const clientTransport = createMessageChannelClientTransport('local-mcp', window.parent)

const mcpServers = {
  'local-mcp-server': {
    type: 'local',
    transport: clientTransport
  }
}
</script>

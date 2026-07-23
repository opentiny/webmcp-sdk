import { ref } from 'vue'
import type { ICustomMarketMcpServers } from '@opentiny/next-remoter'

/**
 * MCP 市场自定义条目（远程/可添加的市场插件）。
 *
 * 注意：当前网页注入的 WebMCP 工具（page-agent-tool、域名工具等）
 * 不走这里，而是由 mcpServer.syncPageProxy → sidepanel modelContext
 * → loadMcpServerToPlugin('mcp-server-builtin') 直接出现在「已添加」的「浏览器内置工具」中。
 */
export const useCustomMarketMcpServers = (): Ref<ICustomMarketMcpServers> => {
  return ref([])
}

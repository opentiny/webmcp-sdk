import { AgentModelProvider, type McpServerConfig } from '@opentiny/next-sdk'
import { onMounted } from 'vue'

declare const chrome: any

const isExtension = typeof chrome !== 'undefined' && chrome.runtime

export const useBrowserExtensions = ({
  agent,
  loadMcpServerToPlugin,
  handleClientDisconnected
}: {
  agent: AgentModelProvider
  loadMcpServerToPlugin: (serverName: string, mcpServer: McpServerConfig) => Promise<void>
  handleClientDisconnected: (serverName: string) => Promise<void>
}) => {
  /**
   * 设置消息监听器
   */
  if (isExtension) {
    chrome.runtime.onMessage.addListener(async (message: any) => {
      if (message.type === 'mcp-server-register') {
        const sessionId = message.sessionId
        if (sessionId) {
          const mcpServer = {
            type: 'extension',
            url: message.serverInfo.url,
            sessionId
          }
          const serverName = `mcp-server-${sessionId}`
          console.log('开始插入插件', serverName, mcpServer)
          // 1、 插入McpServers, 此时内部会判断重复。  不重复则插入，并连接和查询tools到agent上。
          const inserted = await agent.insertMcpServer(serverName, mcpServer as McpServerConfig)
          if (inserted) {
            console.log('插入插件成功，加载插件到McpServerPicker')
            await loadMcpServerToPlugin(serverName, mcpServer as McpServerConfig)
          }
        }
      }

      if (message.type === 'unregister-mcp-session') {
        const sessionId = message.sessionId
        if (sessionId) {
          const serverName = `mcp-server-${sessionId}`
          await handleClientDisconnected(serverName)
        }
      }
    })
    /**
     * 发现已存在的服务器
     * Sidepanel 启动时，向所有标签页广播，请求已有的 MCP Server 重新注册
     */
    onMounted(async () => {
      try {
        // 查询所有标签页
        const tabs = await chrome.tabs.query({})

        // 向每个标签页发送发现请求
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs
              .sendMessage(tab.id, {
                type: 'sidepanel-ready',
                timestamp: Date.now()
              })
              .catch(() => {
                // 某些标签页可能没有 content script，静默忽略
              })
          }
        }
      } catch (error) {
        console.error('[MultiClientManager] 发现服务器失败:', error)
      }
    })
  }
}

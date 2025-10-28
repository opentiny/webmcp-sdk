import { AgentModelProvider, type McpServerConfig } from '@opentiny/next-sdk'
import { onMounted } from 'vue'
import { onMessage, sendMessage } from 'webext-bridge/popup'

// Session 注册表：sessionId → {tabId, serverInfo, timestamp}
// 用于 Port 连接时查找 Server 所在的 tab
const sessionRegistry = new Map()

browser.sessionRegistry = sessionRegistry

export const useBrowserExtensions = ({
  agent,
  loadMcpServerToPlugin,
  handleClientDisconnected
}: {
  agent: AgentModelProvider
  loadMcpServerToPlugin: (serverName: string, mcpServer: McpServerConfig) => Promise<void>
  handleClientDisconnected: (serverName: string) => Promise<void>
}) => {
  // 注册队列：确保 MCP server 注册操作串行执行，避免并发时 closeAll() 导致冲突
  let registerQueue = Promise.resolve()

  /**
   * 设置消息监听器
   */
  onMessage('mcp-server-register', async ({ data, sender }) => {
    const { sessionId, serverInfo } = data
    console.log('sidepanel 收到 mcp-server-register 消息', data)

    if (!sessionId) {
      return { success: false, msg: 'Invalid sessionId or insertion failed' }
    }

    // 将注册操作加入队列，确保串行执行
    return new Promise<{ success: boolean; msg: string }>((resolve) => {
      registerQueue = registerQueue
        .then(async () => {
          try {
            sessionRegistry.set(sessionId, { tabId: sender.tabId, serverInfo, timestamp: Date.now() })
            const mcpServer = {
              type: 'extension',
              url: serverInfo.url,
              sessionId
            }
            const serverName = `mcp-server-${sessionId}`
            console.log('开始插入插件', serverName, mcpServer)

            // 1、 插入McpServers, 此时内部会判断重复。  不重复则插入，并连接和查询tools到agent上。
            const inserted = await agent.insertMcpServer(serverName, mcpServer as McpServerConfig)
            if (inserted) {
              await loadMcpServerToPlugin(serverName, mcpServer as McpServerConfig)
              await agent.closeAll()
              showToast(`插件已添加: ${serverInfo.url}`)
              resolve({ success: true, msg: `插件已添加: ${serverInfo.url}` })
            } else {
              resolve({ success: false, msg: 'Insertion failed' })
            }
          } catch (error) {
            console.error('注册插件失败:', error)
            resolve({ success: false, msg: 'Registration error' })
          }
        })
        .catch((error) => {
          console.error('队列执行失败:', error)
          resolve({ success: false, msg: 'Queue error' })
        })
    })
  })

  // 监听 tab 关闭事件，清理映射
  browser.tabs.onRemoved.addListener(async (tabId) => {
    for (const [sessionId, info] of sessionRegistry.entries()) {
      if (info.tabId === tabId) {
        sessionRegistry.delete(sessionId)
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
      const tabs = await browser.tabs.query({})

      // 向每个标签页发送发现请求
      for (const tab of tabs) {
        if (tab.id) {
          sendMessage('sidepanel-ready', { timestamp: Date.now() }, `content-script@${tab.id}`)
        }
      }
    } catch (error) {
      console.error('[MultiClientManager] 发现服务器失败:', error)
    }
  })
}

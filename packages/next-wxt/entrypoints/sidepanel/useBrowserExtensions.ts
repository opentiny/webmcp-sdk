import { AgentModelProvider, type McpServerConfig } from '@opentiny/next-sdk'
import { onMounted } from 'vue'
import { onMessage, sendMessage } from 'webext-bridge/popup'

// Session 注册表：sessionId → {tabIds, serverInfo, timestamp}
// 用于 Port 连接时查找 Server 所在的 tabs（支持同域名多页签）
const sessionRegistry = new Map<string, { tabIds: number[]; serverInfo: any; timestamp: number }>()

// 将 sessionRegistry 挂载到 browser 对象上供 ExtensionClientTransport 使用
;(browser as any).sessionRegistry = sessionRegistry

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
  // @ts-ignore - webext-bridge 支持返回值，但类型定义不完整
  onMessage('mcp-server-register', async ({ data, sender }) => {
    const { sessionId, serverInfo } = data
    console.log('sidepanel 收到 mcp-server-register 消息', data)

    if (!sessionId) {
      return { success: false, msg: 'Invalid sessionId or insertion failed' }
    }

    // 检查 sessionId 是否已存在
    const existingSession = sessionRegistry.get(sessionId)

    if (existingSession) {
      // 已存在该 sessionId，只需追加 tabId
      if (!existingSession.tabIds.includes(sender.tabId)) {
        existingSession.tabIds.push(sender.tabId)
        console.log(
          `页签已添加到现有会话: sessionId=${sessionId}, tabId=${sender.tabId}, 当前 tabIds:`,
          existingSession.tabIds
        )
      }
      return { success: true, msg: '页签已记录' }
    }

    // 新的 sessionId，创建记录并注册插件
    sessionRegistry.set(sessionId, {
      tabIds: [sender.tabId],
      serverInfo,
      timestamp: Date.now()
    })

    // 将注册操作加入队列，确保串行执行
    return new Promise<{ success: boolean; msg: string }>((resolve) => {
      registerQueue = registerQueue
        .then(async () => {
          try {
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
      const index = info.tabIds.indexOf(tabId)
      if (index !== -1) {
        // 从数组中移除该 tabId
        info.tabIds.splice(index, 1)
        console.log(`页签已关闭: sessionId=${sessionId}, tabId=${tabId}, 剩余 tabIds:`, info.tabIds)

        // 只有当所有 tabId 都关闭时，才删除插件
        if (info.tabIds.length === 0) {
          sessionRegistry.delete(sessionId)
          const serverName = `mcp-server-${sessionId}`
          console.log(`所有页签已关闭，删除插件: ${serverName}`)
          await handleClientDisconnected(serverName)
        }
        break
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

import { AgentModelProvider, type McpServerConfig } from '@opentiny/next-sdk'
import { onMounted } from 'vue'

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

  onRuntimeMessage(
    'mcp-server-register',
    (data, sender) => {
      const { sessionId, serverInfo } = data
      const tabId: number = sender.tab!.id!

      const existingSession = sessionRegistry.get(sessionId)

      // 1.1 已存在该 sessionId，只需追加 tabId 后返回
      if (existingSession) {
        if (!existingSession.tabIds.includes(tabId)) {
          existingSession.tabIds.push(tabId)
        }
        console.log('【useBrowserExt】tabId 已记录在sessionRegistry ')
        return
      }

      // 1.2 新的 sessionId，创建记录并注册插件
      sessionRegistry.set(sessionId, {
        tabIds: [tabId],
        serverInfo,
        timestamp: Date.now()
      })

      // 1.3 串行执行： agent 添加 mcpServer, 更新侧边中的插件列表
      registerQueue = registerQueue.then(async () => {
        try {
          const mcpServer = {
            type: 'extension',
            url: serverInfo.url,
            sessionId
          }
          const serverName = `mcp-server-${sessionId}`

          // 1、 插入McpServers, 此时内部会判断重复。  不重复则插入，并连接和查询tools到agent上。
          const inserted = await agent.insertMcpServer(serverName, mcpServer as McpServerConfig)
          if (inserted) {
            await loadMcpServerToPlugin(serverName, mcpServer as McpServerConfig)
            await agent.closeAll()
            showToast(`插件已添加: ${serverInfo.url}`)
            console.log(`【useBrowserExt】 mcpServer插件已添加: ${serverInfo.url}`)
          } else {
            console.error(`【useBrowserExt】 mcpServer插件添加失败: ${serverInfo.url}`)
          }
        } catch (error) {
          console.error(`【useBrowserExt】agent 注册插件失败: ${sessionId}`, error as any)
        }
      })
    },
    'content->side'
  )

  // 监听 tab 关闭事件，清理映射
  browser.tabs.onRemoved.addListener(async (tabId) => {
    for (const [sessionId, info] of sessionRegistry.entries()) {
      const index = info.tabIds.indexOf(tabId)
      if (index !== -1) {
        // 从数组中移除该 tabId
        info.tabIds.splice(index, 1)
        // 只有当所有 tabId 都关闭时，才删除插件
        if (info.tabIds.length === 0) {
          sessionRegistry.delete(sessionId)
          const serverName = `mcp-server-${sessionId}`
          await handleClientDisconnected(serverName) // ---> 转到 remoter内部方法去关闭client
        }
        break // ---> tabId 只能在一个sessionId下面，所以立即退出for
      }
    }
  })

  // 每次只调用最后激活的页面
  browser.tabs.onActivated.addListener(async ({ tabId }) => {
    for (const [sessionId, info] of sessionRegistry.entries()) {
      const index = info.tabIds.indexOf(tabId)
      if (index !== -1) {
        // 从数组中移除该 tabId,之后追加在最后
        info.tabIds.splice(index, 1)
        info.tabIds.push(tabId)
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
      sendRuntimeMessage('sidepanel-ready', {}, 'side->content')
    } catch (error) {
      console.error('【useBrowserExt】 sidePanel onMounted 时，通知所有tabs 的任务中，有报错：', error as any)
    }
  })
}

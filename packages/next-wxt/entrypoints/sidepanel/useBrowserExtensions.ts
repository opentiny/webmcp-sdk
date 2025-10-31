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

  // 1、监听页面注册sessionId
  onMessage('mcp-server-register-to-side', async ({ data, sender }) => {
    const { sessionId, serverInfo } = data
    await insertLog('side-panel', `收到 server注册消息, sessionId=${sessionId}`)

    if (!sessionId) {
      await insertLog('side-panel', `❌️ 收到 server注册消息缺少sessionId`)
      await insertLog('event-end', 'mcp-server-register#' + sessionId)
      return { success: false, msg: 'Invalid sessionId or insertion failed' }
    }

    const existingSession = sessionRegistry.get(sessionId)

    // 1.1 已存在该 sessionId，只需追加 tabId 后返回
    if (existingSession) {
      if (!existingSession.tabIds.includes(sender.tabId)) {
        existingSession.tabIds.push(sender.tabId)
        await insertLog('side-panel', `sessionId=${sessionId} 已存在, 只追加 tabId=${sender.tabId} 到当前的 tabIds`)
      }

      await insertLog('event-end', 'mcp-server-register#' + sessionId)
      return { success: true, msg: '页签已记录' }
    }

    // 1.2 新的 sessionId，创建记录并注册插件
    sessionRegistry.set(sessionId, {
      tabIds: [sender.tabId],
      serverInfo,
      timestamp: Date.now()
    })
    await insertLog('side-panel', `新建一条 sessionRegistry[sessionId]`)
    await insertSessionRegistry(sessionRegistry)

    // 1.3 串行执行： agent 添加 mcpServer, 更新侧边中的插件列表
    registerQueue = registerQueue.then(async () => {
      try {
        const mcpServer = {
          type: 'extension',
          url: serverInfo.url,
          sessionId
        }
        const serverName = `mcp-server-${sessionId}`
        await insertLog('side-panel', `agent 开始插入插件${serverName}`, mcpServer)

        // 1、 插入McpServers, 此时内部会判断重复。  不重复则插入，并连接和查询tools到agent上。
        const inserted = await agent.insertMcpServer(serverName, mcpServer as McpServerConfig)
        if (inserted) {
          await loadMcpServerToPlugin(serverName, mcpServer as McpServerConfig)
          await agent.closeAll()
          showToast(`插件已添加: ${serverInfo.url}`)
          await insertLog('side-panel', `插件已添加: ${serverInfo.url}`)
        } else {
          await insertLog('side-panel', `插件添加失败: ${serverInfo.url}`)
        }
      } catch (error) {
        await insertLog('side-panel', `agent 注册插件失败: ${sessionId}`, error as any)
      }

      await insertLog('event-end', '⭐ mcp-server-register-#' + sessionId) //  流程结束
    })
  })

  // 监听 tab 关闭事件，清理映射
  browser.tabs.onRemoved.addListener(async (tabId) => {
    await insertLog('side-panel', `有某个页签已关闭,tabId=${tabId}, 即将删除对应的插件`)

    for (const [sessionId, info] of sessionRegistry.entries()) {
      const index = info.tabIds.indexOf(tabId)
      if (index !== -1) {
        // 从数组中移除该 tabId
        info.tabIds.splice(index, 1)
        await insertLog('side-panel', `页签已关闭: sessionId=${sessionId}, tabId=${tabId}`)
        // 只有当所有 tabId 都关闭时，才删除插件
        if (info.tabIds.length === 0) {
          sessionRegistry.delete(sessionId)
          await insertSessionRegistry(sessionRegistry)

          const serverName = `mcp-server-${sessionId}`
          await insertLog('side-panel', `所有页签已关闭，即将删除插件: ${serverName}`)
          await handleClientDisconnected(serverName) // ---> 转到 remoter内部方法去关闭client
        }
        break // ---> tabId 只能在一个sessionId下面，所以立即退出for
      }
    }
  })

  /**
   * 发现已存在的服务器
   * Sidepanel 启动时，向所有标签页广播，请求已有的 MCP Server 重新注册
   */
  onMounted(async () => {
    try {
      insertLog('side-panel', '重新打开ready, 所以要通知所有 tabs 重新注册')
      // 查询所有标签页
      const tabs = await browser.tabs.query({})

      // 向每个标签页发送发现请求
      for (const tab of tabs) {
        if (tab.id) {
          sendMessage('sidepanel-ready', { timestamp: Date.now() }, `content-script@${tab.id}`)
        }
      }
      insertLog('side-panel', '重新通知所有 tabs 重新注册完毕')
      insertLog('event-end', 'side-panal-mount-reReg-tabs')
    } catch (error) {
      insertLog('side-panel', '❌️ 通知所有tabs 的任务中，有报错：', error as any)
    }
  })
}

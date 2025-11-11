import { AgentModelProvider, type McpServerConfig } from '@opentiny/next-sdk'
import { onMounted } from 'vue'
import { clientTransport, createMcpServer } from './mcpServer'

// Session 注册表：sessionId → {tabIds, serverInfo, timestamp}
// 用于 Port 连接时查找 Server 所在的 tabs（支持同域名多页签）
const sessionRegistry = new Map<string, { tabIds: number[]; serverInfo: any; timestamp: number }>()
// 主机名映射表：host → tabIds[]（支持同域名多页签）
const hostNameMap = new Map<string, number[]>()

// 等待特定 host 初始化完成的 Promise Map
const hostInitPromises = new Map<string, { resolve: (tabId: number) => void; reject: (err: Error) => void }[]>()

// 将 sessionRegistry 挂载到 browser 对象上供 ExtensionClientTransport 使用
;(browser as any).sessionRegistry = sessionRegistry
;(browser as any).hostNameMap = hostNameMap

// 暴露给 mcpServer 使用的等待函数
;(browser as any).waitForHostInit = (hostname: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    // 先检查是否已经存在
    const existingTabIds = hostNameMap.get(hostname)
    if (existingTabIds && existingTabIds.length > 0) {
      resolve(existingTabIds[existingTabIds.length - 1])
      return
    }
    
    // 否则添加到等待队列
    if (!hostInitPromises.has(hostname)) {
      hostInitPromises.set(hostname, [])
    }
    hostInitPromises.get(hostname)!.push({ resolve, reject })
    
    // 设置超时（30秒）
    setTimeout(() => {
      reject(new Error(`等待 ${hostname} 初始化超时`))
    }, 30000)
  })
}

export const useBrowserExtensions = async ({
  agent,
  loadMcpServerToPlugin,
  handleClientDisconnected
}: {
  agent: AgentModelProvider
  loadMcpServerToPlugin: (serverName: string, mcpServer: McpServerConfig) => Promise<void>
  handleClientDisconnected: (serverName: string) => Promise<void>
}) => {
  /**
   * 发现已存在的服务器
   * Sidepanel 启动时，向所有标签页广播，请求已有的 MCP Server 重新注册
   */
  onMounted(async () => {
    try {
      console.log('【useBrowserExt】即将发送 sidepanel-ready 广播')
      sendRuntimeMessage('sidepanel-ready', {}, 'side->content')
    } catch (error) {
      console.error('【useBrowserExt】 sidePanel onMounted 时，通知所有tabs 的任务中，有报错：', error as any)
    }
  })
  // 注册队列：确保 MCP server 注册操作串行执行，避免并发时 closeAll() 导致冲突
  let registerQueue = Promise.resolve()

  await createMcpServer()

  // 1.3 串行执行： agent 添加 mcpServer, 更新侧边中的插件列表
  registerQueue = registerQueue.then(async () => {
    try {
      const mcpServer = {
        url: 'http://localhost:3000'
      }
      const serverName = `mcp-server-localhost`

      // 1、 插入McpServers, 此时内部会判断重复。  不重复则插入，并连接和查询tools到agent上。
      const inserted = await agent.insertMcpServer(serverName, clientTransport as any)
      if (inserted) {
        await loadMcpServerToPlugin(serverName, mcpServer as McpServerConfig)
        showToast(`插件已添加: localhost:3000`)
      } else {
        console.error(`【useBrowserExt】 mcpServer插件添加失败: localhost:3000`)
      }
    } catch (error) {
      console.error(`【useBrowserExt】agent 注册插件失败: localhost:3000`, error as any)
    }
  })

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

    // 清理 hostNameMap 中的 tabId
    for (const [host, tabIds] of hostNameMap.entries()) {
      const index = tabIds.indexOf(tabId)
      if (index !== -1) {
        // 从数组中移除该 tabId（即使变为空数组也保留）
        tabIds.splice(index, 1)
        console.log(`【useBrowserExt】从 hostNameMap 移除 tabId: ${tabId}, host: ${host}`)
        break
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

    // 维护 hostNameMap 中的 tabId 顺序
    for (const [host, tabIds] of hostNameMap.entries()) {
      const index = tabIds.indexOf(tabId)
      if (index !== -1) {
        // 从数组中移除该 tabId，之后追加在最后
        tabIds.splice(index, 1)
        tabIds.push(tabId)
        console.log(`【useBrowserExt】hostNameMap 更新激活顺序, host: ${host}, tabId: ${tabId}`)
        break
      }
    }
  })

  onRuntimeMessage(
    'define-tool-from-content-to-sidepanel',
    (data, sender) => {
      const { host } = data
      const tabId: number = sender.tab!.id!

      const existingHost = hostNameMap.get(host)

      // 已存在该 host，只需追加 tabId
      if (existingHost) {
        if (!existingHost.includes(tabId)) {
          existingHost.push(tabId)
        }
        console.log('【useBrowserExt】tabId 已记录在 hostNameMap')
      } else {
        // 新的 host，创建 tabIds 数组
        hostNameMap.set(host, [tabId])
        console.log('【useBrowserExt】新 host 已添加到 hostNameMap')
      }

      console.log('【useBrowserExt】hostNameMap', hostNameMap)
      
      // 触发等待队列中的 Promise
      const waitingPromises = hostInitPromises.get(host)
      if (waitingPromises && waitingPromises.length > 0) {
        waitingPromises.forEach(({ resolve }) => resolve(tabId))
        hostInitPromises.delete(host)
        console.log(`【useBrowserExt】触发 ${host} 的等待队列，共 ${waitingPromises.length} 个`)
      }
    },
    'content->side'
  )
}

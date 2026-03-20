import { browser } from 'wxt/browser'

// Session 注册表：sessionId → {tabIds, serverInfo, timestamp}
// 用于 Port 连接时查找 Server 所在的 tabs（支持同域名多页签）
export const sessionRegistry = new Map<string, { tabIds: number[]; serverInfo: any; timestamp: number }>()

// 主机名映射表：host → tabIds[]（支持同域名多页签）
export const hostNameMap = new Map<string, number[]>()

// 等待特定 host 初始化完成的 Promise Map
const hostInitPromises = new Map<string, { resolve: (tabId: number) => void; reject: (err: Error) => void }[]>()

// 统一处理地址匹配键
export const normalizeUrlKey = (value?: string): string | undefined => {
  if (!value) return value
  return value.endsWith('/') ? value.slice(0, -1) : value
}

// 暴露给外部使用的等待函数
export const waitForHostInit = (url: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const normalizedUrl = normalizeUrlKey(url)

    if (!normalizedUrl) {
      reject(new Error(`无效的 URL: ${url}`))
      return
    }

    const existingTabIds = hostNameMap.get(normalizedUrl)
    if (existingTabIds && existingTabIds.length > 0) {
      resolve(existingTabIds[existingTabIds.length - 1])
      return
    }

    if (!hostInitPromises.has(normalizedUrl)) {
      hostInitPromises.set(normalizedUrl, [])
    }
    hostInitPromises.get(normalizedUrl)!.push({ resolve, reject })

    setTimeout(() => {
      reject(new Error(`等待 ${normalizedUrl} 初始化超时`))
    }, 30000)
  })
}

// 为了向下兼容原有基于 (browser as any) 的代码，暂时保留挂载
;(browser as any).hostNameMap = hostNameMap
;(browser as any).sessionRegistry = sessionRegistry
;(browser as any).waitForHostInit = waitForHostInit

export const initHostManager = () => {
  // 监听 tab 关闭事件，清理映射
  browser.tabs.onRemoved.addListener(async (tabId) => {
    for (const [sessionId, info] of sessionRegistry.entries()) {
      const index = info.tabIds.indexOf(tabId)
      if (index !== -1) {
        info.tabIds.splice(index, 1)
        if (info.tabIds.length === 0) {
          sessionRegistry.delete(sessionId)
          // 通知 sidepanel 删除对应插件（交由 sidepanel 的 runtime 消息或已有逻辑处理）
          browser.runtime.sendMessage({ type: 'bg-mcp-server-removed', sessionId }).catch(() => {})
        }
        break
      }
    }

    for (const [host, tabIds] of hostNameMap.entries()) {
      const index = tabIds.indexOf(tabId)
      if (index !== -1) {
        tabIds.splice(index, 1)
        console.log(`【HostManager】从 hostNameMap 移除 tabId: ${tabId}, host: ${host}`)
        break
      }
    }
  })

  // 每次只调用最后激活的页面
  browser.tabs.onActivated.addListener(async ({ tabId }) => {
    for (const [sessionId, info] of sessionRegistry.entries()) {
      const index = info.tabIds.indexOf(tabId)
      if (index !== -1) {
        info.tabIds.splice(index, 1)
        info.tabIds.push(tabId)
        break
      }
    }

    for (const [host, tabIds] of hostNameMap.entries()) {
      const index = tabIds.indexOf(tabId)
      if (index !== -1) {
        tabIds.splice(index, 1)
        tabIds.push(tabId)
        console.log(`【HostManager】hostNameMap 更新激活顺序, host: ${host}, tabId: ${tabId}`)
        break
      }
    }
  })

  onRuntimeMessage(
    'define-tool-from-content-to-sidepanel',
    (data: any, sender: any) => {
      const { host } = data
      const { url } = sender
      const tabId: number = sender.tab!.id!

      const existingHost = hostNameMap.get(host)

      if (existingHost) {
        if (!existingHost.includes(tabId)) {
          existingHost.push(tabId)
        }
        console.log('【HostManager】tabId 已记录在 hostNameMap')
      } else {
        hostNameMap.set(host, [tabId])
        console.log('【HostManager】新 host 已添加到 hostNameMap')
      }

      console.log('【HostManager】hostNameMap', hostNameMap)

      const normalizedUrl = normalizeUrlKey(url)
      const waitingPromises = normalizedUrl ? hostInitPromises.get(normalizedUrl) : undefined
      if (waitingPromises && waitingPromises.length > 0) {
        waitingPromises.forEach(({ resolve }) => resolve(tabId))
        hostInitPromises.delete(normalizedUrl!)
        console.log(`【HostManager】触发 ${normalizedUrl} 的等待队列，共 ${waitingPromises.length} 个`)
      }
    },
    'content->bg'
  )

  onRuntimeMessage(
    'mcp-server-register',
    (data: any, sender: any) => {
      const { sessionId, serverInfo } = data
      const tabId: number = sender.tab!.id!

      const existingSession = sessionRegistry.get(sessionId)

      if (existingSession) {
        if (!existingSession.tabIds.includes(tabId)) {
          existingSession.tabIds.push(tabId)
        }
        console.log('【HostManager】tabId 已记录在sessionRegistry ')
      } else {
        sessionRegistry.set(sessionId, {
          tabIds: [tabId],
          serverInfo,
          timestamp: Date.now()
        })
      }

      // 转发给 sidepanel 以加载到 Remoter (如果 sidepanel 开启的话)
      browser.runtime
        .sendMessage({
          type: 'bg-mcp-server-register-forward',
          data: { sessionId, serverInfo, tabId }
        })
        .catch(() => {})
    },
    'content->bg'
  )

  // 处理直接发到 background 的普通消息，比如 UI 获取快照
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'get-session-registry') {
      // sessionRegistry 是 Map，转换为数组返回
      const sessions = Array.from(sessionRegistry.entries()).map(([sessionId, info]) => ({
        sessionId,
        ...info
      }))
      sendResponse(sessions)
    }
  })
}

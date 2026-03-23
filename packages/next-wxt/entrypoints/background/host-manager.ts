import { browser } from 'wxt/browser'
import type { ServerInfo } from '@opentiny/next-sdk'
import { onRuntimeMessage } from '../../utils/messages'

const STORAGE_KEY_SESSION = 'hostManager:sessionRegistry'
const STORAGE_KEY_HOST = 'hostManager:hostNameMap'

// Session 注册表：sessionId → {tabIds, serverInfo, timestamp}
// 用于 Port 连接时查找 Server 所在的 tabs（支持同域名多页签）
export const sessionRegistry = new Map<string, { tabIds: number[]; serverInfo: ServerInfo; timestamp: number }>()

// 主机名映射表：host → tabIds[]（支持同域名多页签）
export const hostNameMap = new Map<string, number[]>()

// 持久化保存状态到 Storage
const saveState = () => {
  browser.storage.local.set({
    [STORAGE_KEY_SESSION]: Array.from(sessionRegistry.entries()),
    [STORAGE_KEY_HOST]: Array.from(hostNameMap.entries())
  }).catch(() => {})
}

// 初始化时从 Storage 恢复状态
const restoreState = async () => {
  try {
    const res = await browser.storage.local.get([STORAGE_KEY_SESSION, STORAGE_KEY_HOST])
    if (Array.isArray(res[STORAGE_KEY_SESSION])) {
      res[STORAGE_KEY_SESSION].forEach(([k, v]: [string, any]) => sessionRegistry.set(k, v))
    }
    if (Array.isArray(res[STORAGE_KEY_HOST])) {
      res[STORAGE_KEY_HOST].forEach(([k, v]: [string, any]) => hostNameMap.set(k, v))
    }
  } catch (err) {
    console.warn('【HostManager】恢复状态失败', err)
  }
}

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

    let isDone = false
    const cleanup = () => {
      isDone = true
      const waiters = hostInitPromises.get(normalizedUrl!)
      if (waiters) {
        const index = waiters.findIndex(w => (w as any)._id === waiterId)
        if (index !== -1) waiters.splice(index, 1)
        if (waiters.length === 0) hostInitPromises.delete(normalizedUrl!)
      }
    }

    const waiterId = Date.now() + Math.random()

    const timerId = setTimeout(() => {
      if (isDone) return
      cleanup()
      reject(new Error(`等待 ${normalizedUrl} 初始化超时`))
    }, 30000)

    const waiter = {
      _id: waiterId,
      resolve: (tabId: number) => {
        if (isDone) return
        clearTimeout(timerId)
        cleanup()
        resolve(tabId)
      },
      reject: (err: Error) => {
        if (isDone) return
        clearTimeout(timerId)
        cleanup()
        reject(err)
      }
    }

    if (!hostInitPromises.has(normalizedUrl)) {
      hostInitPromises.set(normalizedUrl, [])
    }
    hostInitPromises.get(normalizedUrl)!.push(waiter as any)
  })
}

// 为了向下兼容原有基于 (browser as any) 的代码，暂时保留挂载
// @ts-ignore
;(browser as any).hostNameMap = hostNameMap
// @ts-ignore
;(browser as any).sessionRegistry = sessionRegistry
// @ts-ignore
;(browser as any).waitForHostInit = waitForHostInit

export const initHostManager = () => {
  // 异步恢复状态
  restoreState()

  // 监听 tab 关闭事件，清理映射
  browser.tabs.onRemoved.addListener(async (tabId) => {
    let changed = false
    for (const [sessionId, info] of sessionRegistry.entries()) {
      const index = info.tabIds.indexOf(tabId)
      if (index !== -1) {
        info.tabIds.splice(index, 1)
        if (info.tabIds.length === 0) {
          sessionRegistry.delete(sessionId)
          // 通知 sidepanel 删除对应插件（交由 sidepanel 的 runtime 消息或已有逻辑处理）
          browser.runtime.sendMessage({ type: 'bg-mcp-server-removed', sessionId }).catch(() => {})
        }
        changed = true
        break
      }
    }

    for (const [host, tabIds] of hostNameMap.entries()) {
      const index = tabIds.indexOf(tabId)
      if (index !== -1) {
        tabIds.splice(index, 1)
        console.log(`【HostManager】从 hostNameMap 移除 tabId: ${tabId}, host: ${host}`)
        changed = true
        break
      }
    }
    
    if (changed) saveState()
  })

  // 每次只调用最后激活的页面
  browser.tabs.onActivated.addListener(async ({ tabId }) => {
    let changed = false
    for (const [sessionId, info] of sessionRegistry.entries()) {
      const index = info.tabIds.indexOf(tabId)
      if (index !== -1) {
        info.tabIds.splice(index, 1)
        info.tabIds.push(tabId)
        changed = true
        break
      }
    }

    for (const [host, tabIds] of hostNameMap.entries()) {
      const index = tabIds.indexOf(tabId)
      if (index !== -1) {
        tabIds.splice(index, 1)
        tabIds.push(tabId)
        console.log(`【HostManager】hostNameMap 更新激活顺序, host: ${host}, tabId: ${tabId}`)
        changed = true
        break
      }
    }
    
    if (changed) saveState()
  })

  onRuntimeMessage(
    'define-tool-from-content-to-sidepanel',
    (data: { host: string }, sender: Browser.runtime.MessageSender) => {
      const { host } = data
      const { url } = sender
      
      const tabId = sender.tab?.id
      if (tabId === undefined) {
        console.warn('【HostManager】define-tool: 无法获取 sender.tab.id，忽略该消息')
        return
      }

      // 从旧的 host 分组中移除该 tabId，保证其在一个时间内只属于一个 host
      let changed = false
      for (const [existingHost, tabIds] of hostNameMap.entries()) {
        if (existingHost !== host) {
          const index = tabIds.indexOf(tabId)
          if (index !== -1) {
            tabIds.splice(index, 1)
            changed = true
          }
        }
      }

      const existingHost = hostNameMap.get(host)

      if (existingHost) {
        if (!existingHost.includes(tabId)) {
          existingHost.push(tabId)
          changed = true
        }
        console.log('【HostManager】tabId 已记录在 hostNameMap')
      } else {
        hostNameMap.set(host, [tabId])
        changed = true
        console.log('【HostManager】新 host 已添加到 hostNameMap')
      }

      if (changed) saveState()

      console.log('【HostManager】hostNameMap', hostNameMap)

      const normalizedUrl = normalizeUrlKey(url)
      const waitingPromises = normalizedUrl ? hostInitPromises.get(normalizedUrl) : undefined
      if (waitingPromises && waitingPromises.length > 0) {
        const toResolve = [...waitingPromises]
        toResolve.forEach(({ resolve }) => resolve(tabId))
        hostInitPromises.delete(normalizedUrl!)
        console.log(`【HostManager】触发 ${normalizedUrl} 的等待队列，共 ${toResolve.length} 个`)
      }
    },
    'content->bg'
  )

  onRuntimeMessage(
    'mcp-server-register',
    (data: { sessionId: string; serverInfo: ServerInfo }, sender: Browser.runtime.MessageSender) => {
      const { sessionId, serverInfo } = data
      
      const tabId = sender.tab?.id
      if (tabId === undefined) {
        console.warn('【HostManager】register: 无法获取 sender.tab.id，忽略该消息')
        return
      }

      let changed = false
      // 从其他 session 中移除该 tabId
      for (const [existingSessionId, info] of sessionRegistry.entries()) {
        if (existingSessionId !== sessionId) {
          const index = info.tabIds.indexOf(tabId)
          if (index !== -1) {
            info.tabIds.splice(index, 1)
            changed = true
          }
        }
      }

      const existingSession = sessionRegistry.get(sessionId)

      if (existingSession) {
        if (!existingSession.tabIds.includes(tabId)) {
          existingSession.tabIds.push(tabId)
          changed = true
        }
        console.log('【HostManager】tabId 已记录在sessionRegistry ')
        if (changed) saveState()
        return
      } else {
        sessionRegistry.set(sessionId, {
          tabIds: [tabId],
          serverInfo,
          timestamp: Date.now()
        })
        changed = true
      }
      
      if (changed) saveState()

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
    } else if (message.type === 'get-host-tab-ids') {
      sendResponse(hostNameMap.get(message.host) || [])
    } else if (message.type === 'get-session-tab-id') {
      const session = sessionRegistry.get(message.sessionId)
      sendResponse(session && session.tabIds.length > 0 ? session.tabIds[session.tabIds.length - 1] : null)
    } else if (message.type === 'wait-for-host-init') {
      waitForHostInit(message.url)
        .then((tabId) => sendResponse(tabId))
        .catch((err) => sendResponse({ error: err.message }))
      return true
    }
  })
}

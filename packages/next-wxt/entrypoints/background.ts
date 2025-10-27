import { onMessage, sendMessage } from 'webext-bridge/background'

export default defineBackground(async () => {
  console.log('Hello background!', { id: browser.runtime.id })

  // Session 注册表：sessionId → {tabId, serverInfo, timestamp}
  // 用于 Port 连接时查找 Server 所在的 tab
  const sessionRegistry = new Map()

  // 监听 tab 关闭事件，清理映射
  chrome.tabs.onRemoved.addListener((tabId) => {
    for (const [sessionId, info] of sessionRegistry.entries()) {
      if (info.tabId === tabId) {
        sessionRegistry.delete(sessionId)
        chrome.runtime.sendMessage({
          type: 'unregister-mcp-session',
          sessionId: sessionId
        })
        console.log('[Service Worker] 注销 session:', sessionId)
      }
    }
  })

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 注册 MCP Session：Content Script 通知 Server 所在的 tab
    if (message.type === 'mcp-server-register') {
      const { sessionId, serverInfo } = message
      const tabId = sender.tab?.id

      if (!tabId) {
        console.error('[Service Worker] 无法获取 tab ID')
        sendResponse({ success: false, error: '无法获取 tab ID' })
        return true
      }

      sessionRegistry.set(sessionId, {
        tabId,
        serverInfo,
        timestamp: Date.now()
      })
      console.log('[Service Worker] 注册 session:', sessionId, '→ tab:', tabId)
      sendResponse({ success: true })
      return true
    }

    // 查询 MCP Session：Client 查询 Server 所在的 tab ID
    if (message.type === 'query-mcp-session') {
      const { sessionId } = message
      const info = sessionRegistry.get(sessionId)

      if (info) {
        console.log('[Service Worker] 查询 session:', sessionId, '→ tab:', info.tabId)
        sendResponse({ success: true, tabId: info.tabId, serverInfo: info.serverInfo })
      } else {
        console.log('[Service Worker] Session 不存在:', sessionId)
        sendResponse({ success: false, error: 'Session 不存在或已关闭' })
      }
      return true
    }

    // 注销 MCP Session：手动清理
    if (message.type === 'unregister-mcp-session') {
      const { sessionId } = message
      sessionRegistry.delete(sessionId)
      console.log('[Service Worker] 注销 session:', sessionId)
      sendResponse({ success: true })
      return true
    }
  })

  // 1、监听子页面initWebMCP 消息
  onMessage('initWebMCP', async ({ data }) => {
    const { originUrl } = data
    bgLog(`${originUrl} 页面initWebMCP `)()

    return (await injectMainScript(originUrl))
      ? { success: true, msg: 'WebMCP 初始化成功,已插入脚本:' + originUrl }
      : { success: false, msg: `WebMCP 初始化,插入脚本${originUrl}失败` }
  })
})

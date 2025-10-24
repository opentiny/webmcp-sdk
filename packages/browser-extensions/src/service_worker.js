const USER_SCRIPT_ID = 'default'

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

const init = async (url, originUrl) => {
  const script = await fetch(url).then((res) => res.text())
  const existingScripts = await chrome.userScripts.getScripts({
    ids: [url]
  })

  if (existingScripts.length > 0) {
    // Update existing script.
    await chrome.userScripts.update([
      {
        id: url,
        matches: [`${originUrl}/*`],
        js: [{ code: script }],
        world: 'MAIN'
      }
    ])

    return { type: 'update' }
  } else {
    // Register new script.
    await chrome.userScripts.register([
      {
        id: url,
        matches: [`${originUrl}/*`],
        js: [{ code: script }],
        world: 'MAIN'
      }
    ])

    return { type: 'register' }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'initWebMCP') {
    console.log('收到 initWebMCP 消息:', message.data)

    // 异步处理，使用 sendResponse 回调
    init(message.data.url, message.data.originUrl)
      .then(() => {
        console.log('WebMCP 初始化成功')
        sendResponse({ success: true })
      })
      .catch((error) => {
        console.error('WebMCP 初始化失败:', error)
        sendResponse({ success: false, error: error.message })
      })

    // 返回 true 表示异步处理，保持消息通道开放
    return true
  }

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

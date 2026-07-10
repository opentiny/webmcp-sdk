import { useWebAgentServer, forceWebAgentReconnect } from './sidepanel/composable/useWebAgentServer'
import { tabHistory } from './background/tab-history'

export default defineBackground(() => {
  // ─────────────────────────────────────────
  // 延迟初始化 Web Agent 连接，确保消息监听器已就绪
  // ─────────────────────────────────────────
  setTimeout(() => {
    useWebAgentServer()
      .then((sessionId) => {
        console.log('【Background】MCP 服务端启动成功，sessionId:', sessionId)
      })
      .catch((error: any) => {
        console.warn('【Background】初始化 useWebAgentServer 失败:', error)
      })
  }, 0)

  // ─────────────────────────────────────────
  // Tab 生命周期：清理握手状态
  // ─────────────────────────────────────────
  browser.tabs.onRemoved.addListener((_tabId) => {
    // 当前架构通过 executeScript(world: MAIN) 实时查询页面工具，无需 background 侧缓存
  })

  // ─────────────────────────────────────────
  // 消息处理（需要返回值的使用原生 onMessage）
  // ─────────────────────────────────────────
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Web Agent 手动重连
    // 注意：不依赖 initPromise，因为它可能已经 rejected（初始连接失败时），
    // rejected 的 Promise 状态永久不变，会导致重连请求直接走 catch 分支而不实际发起连接。
    if (message.type === 'reconnect-web-agent') {
      forceWebAgentReconnect()
        .then((sessionId) => sendResponse({ success: true, sessionId }))
        .catch((error) => sendResponse({ success: false, error: error.message }))
      return true
    }

    // 获取 MCP session ID（供 Popup 展示连接状态）
    if (message.type === 'get-mcp-session-id') {
      browser.storage.local
        .get(['mcp-sessionId', 'mcp-connection-status'])
        .then((res) => {
          sendResponse({
            sessionId: res['mcp-sessionId'] || '',
            status: res['mcp-connection-status'] || 'connecting'
          })
        })
        .catch(() => sendResponse({ sessionId: '', status: 'error' }))
      return true
    }

    // ── PAGE_CONTROL 等后续消息处理 ──
    // PAGE_CONTROL：由 sidepanel 发起，转发给目标 tab 的 content script 执行 DOM 操作
    // content script 里的 PageController 在 ISOLATED world 运行，完全不受页面 CSP 限制
    if (message.type === 'PAGE_CONTROL') {
      const { tabId, action, payload } = message
      browser.tabs
        .sendMessage(tabId, { type: 'PAGE_CONTROL', action, payload })
        .then((result) => sendResponse(result))
        .catch((err) => {
          console.warn('【Background】PAGE_CONTROL 转发失败:', err)
          sendResponse({ success: false, error: err.message })
        })
      return true
    }
    // ── execute-page-tool 之后的消息处理结束 ──
  })

  // ─────────────────────────────────────────
  // 简单消息（无需返回值）
  // ─────────────────────────────────────────
  onRuntimeMessage(
    'focus-current-tab',
    async (_, sender) => await browser.tabs.update(sender.tab?.id, { active: true }),
    'content->bg'
  )

  // 自动返回 sender 给 content-script（用于获取 tabId）
  onRuntimeMessage('who-am-i', () => {}, 'content->bg')

  onRuntimeMessage('active-pre-tab', async () => tabHistory.activePreTab(), 'side->bg')

  // 点击扩展图标显示右侧面板 (SidePanel)
  if ((browser.sidePanel as any).setPanelBehavior) {
    ;(browser.sidePanel as any).setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})
  }
})

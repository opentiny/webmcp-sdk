import { useWebAgentServer, forceWebAgentReconnect } from './sidepanel/composable/useWebAgentServer'
import { tabHistory } from './background/tab-history'
import {
  injectUserMcpScriptsForTab,
  reloadTabsByMatchesSnapshot,
  reinjectAfterUserMcpScriptsChange
} from './background/inject-user-mcp-scripts'

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

    // content：注入匹配的用户 MCP 脚本，并返回是否跳过内置 mcp-servers
    if (message.type === 'inject-user-mcp-scripts') {
      const tabId = message.tabId ?? sender.tab?.id
      const url = message.url || sender.tab?.url
      if (!tabId || !url) {
        sendResponse({
          success: false,
          shouldSkipBuiltIn: false,
          injectedCount: 0,
          error: '缺少 tabId 或 url'
        })
        return true
      }
      injectUserMcpScriptsForTab(tabId, url)
        .then((result) => sendResponse(result))
        .catch((error) =>
          sendResponse({
            success: false,
            shouldSkipBuiltIn: false,
            injectedCount: 0,
            error: error?.message || String(error)
          })
        )
      return true
    }

    // Options：保存/删除后刷新匹配标签页
    if (message.type === 'reinject-user-mcp-scripts') {
      const run = message.matchesSnapshot
        ? reloadTabsByMatchesSnapshot(message.matchesSnapshot)
        : reinjectAfterUserMcpScriptsChange(message.scriptId)
      run
        .then((reloaded) => sendResponse({ success: true, reloaded }))
        .catch((error) => sendResponse({ success: false, error: error?.message || String(error) }))
      return true
    }
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

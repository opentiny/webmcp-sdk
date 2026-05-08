import { useWebAgentServer, forceWebAgentReconnect } from './sidepanel/composable/useWebAgentServer'
import { tabHistory } from './background/tab-history'

export default defineBackground(() => {
  // 初始化 Web Agent 连接
  const initPromise = useWebAgentServer()
    .then((sessionId) => {
      console.log('【Background】MCP 服务端启动成功，sessionId:', sessionId)
      return sessionId
    })
    .catch((error: any) => {
      console.error('【Background】初始化 useWebAgentServer 失败:', error)
      throw error
    })

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
    if (message.type === 'reconnect-web-agent') {
      initPromise
        .then(() => {
          forceWebAgentReconnect()
            .then((sessionId) => sendResponse({ success: true, sessionId }))
            .catch((error) => sendResponse({ success: false, error: error.message }))
        })
        .catch((err) => sendResponse({ success: false, error: `初始化失败，无法重连: ${err.message}` }))
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

    // ── 浏览器内置 WebMCP 代理通信（代替原有的复杂消息桥接） ──
    // 侧边栏查询：直接在目标页面执行脚本，调用 __nextSdkRegisteredTools 或 listTools()
    if (message.type === 'get-page-tools') {
      const { tabId } = message
      browser.scripting
        .executeScript({
          target: { tabId },
          world: 'MAIN',
          func: () => {
            // 优先使用 bridge.ts 暴露的全局函数（拦截 navigator.modelContext 注册的工具）
            if (typeof (window as any).__nextSdkRegisteredTools === 'function') {
              return (window as any).__nextSdkRegisteredTools()
            }
            // Fallback：尝试通过 modelContextTesting.listTools()
            return (navigator as any).modelContextTesting?.listTools?.() || []
          }
        })
        .then((res) => {
          sendResponse(res[0]?.result || [])
        })
        .catch((err) => {
          console.warn('【Background】get-page-tools 失败:', err)
          sendResponse([])
        })
      return true
    }

    // 侧边栏调用：直接在目标页面执行脚本，调用 executeTool
    if (message.type === 'execute-page-tool') {
      const { tabId, toolName, args } = message
      browser.scripting
        .executeScript({
          target: { tabId },
          world: 'MAIN',
          func: async (name: string, inputStr: string) => {
            try {
              const ctx = (navigator as any).modelContextTesting || (navigator as any).modelContext
              if (!ctx) throw new Error('WebMCP is not initialized on this page')
              const res = await ctx.executeTool(name, inputStr)
              return { success: true, result: res }
            } catch (e: any) {
              return { success: false, error: e.message }
            }
          },
          args: [toolName, JSON.stringify(args)]
        })
        .then((res) => {
          sendResponse(res[0]?.result)
        })
        .catch((err) => {
          console.warn('【Background】execute-page-tool 失败:', err)
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

  // 点击扩展图标显示 Popup
  if ((browser.sidePanel as any).setPanelBehavior) {
    ;(browser.sidePanel as any).setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {})
  }
})

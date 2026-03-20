import { useWebAgentServer } from './sidepanel/composable/useWebAgentServer'
import { initHostManager } from './background/hostManager'

export default defineBackground(() => {
  // 初始化全局 Host 缓存管理器，提供给 background 的 mcpServer 实例
  initHostManager()

  // 启动 MCP 服务端（常驻或随 Service Worker 唤醒）
  useWebAgentServer()
    .then((sessionId) => {
      console.log('【Background】MCP 服务端启动成功，可用于远程控制的 sessionId:', sessionId)
    })
    .catch((error: any) => {
      console.error('【Background】初始化 useWebAgentServer 失败:', error)
    })

  // 未整改该事件，因为此处需要返回值
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'inject-mcp-scripts') {
      const { hostname, tabId } = message
      try {
        injectMainScript(hostname, tabId).then((success: boolean) => {
          sendResponse({ success, hostname, tabId })
        })
      } catch (error: any) {
        console.error('脚本注入失败:', error)
        sendResponse({ success: false, hostname, tabId, error })
      }
      return true
    }

    if (message.type === 'inject-tools-script') {
      const { hostname, tabId } = message
      try {
        // 首次注册成功后可能需要刷新当前标签页，tabId 用于定位
        injectToolsScript(hostname, tabId).then((success: boolean) => {
          sendResponse({ success, hostname, tabId })
        })
      } catch (error: any) {
        console.error('脚本注入失败:', error)
        sendResponse({ success: false, hostname, tabId, error })
      }
      return true
    }

    if (message.type === 'get-mcp-session-id') {
      // 异步获取 session ID 从 local storage 中
      browser.storage.local.get('MCP_SESSION_ID').then((res) => {
        sendResponse({ sessionId: res['MCP_SESSION_ID'] || '' })
      }).catch((err) => {
        console.error('获取 session ID 失败:', err)
        sendResponse({ sessionId: '' })
      })
      return true
    }
  })

  onRuntimeMessage(
    'focus-current-tab',
    async (_, sender) => await browser.tabs.update(sender.tab?.id, { active: true }),
    'content->bg'
  )

  // 自动返回sender 给 content-script
  onRuntimeMessage('who-am-i', () => {}, 'content->bg')

  // 点击图标自动打开侧边栏
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.log(error))
})

import { useWebAgentServer, forceWebAgentReconnect } from './sidepanel/composable/useWebAgentServer'
import { initHostManager } from './background/host-manager'

export default defineBackground(() => {
  // 初始化全局 Host 缓存管理器，提供给 background 的 mcpServer 实例
  initHostManager()

  // 启动 MCP 服务端（常驻或随 Service Worker 唤醒）
  const initPromise = useWebAgentServer()
    .then((sessionId) => {
      console.log('【Background】MCP 服务端启动成功，可用于远程控制的 sessionId:', sessionId)
      return sessionId
    })
    .catch((error: any) => {
      console.error('【Background】初始化 useWebAgentServer 失败:', error)
      throw error
    })

  // 未整改该事件，因为此处需要返回值
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 处理需要等待初始化的消息
    if (message.type === 'reconnect-web-agent') {
      initPromise.then(() => {
        forceWebAgentReconnect().then((sessionId) => {
           sendResponse({ success: true, sessionId })
        }).catch((error) => {
           console.error('手动重连 Web Agent 失败:', error)
           sendResponse({ success: false, error: error.message })
        })
      }).catch((err) => {
        sendResponse({ success: false, error: `初始化失败，无法重连: ${err.message}` })
      })
      return true
    }

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
      browser.storage.local.get(['mcp-sessionId', 'mcp-connection-status']).then((res) => {
        sendResponse({ 
          sessionId: res['mcp-sessionId'] || '',
          status: res['mcp-connection-status'] || 'connecting'
        })
      }).catch((err) => {
        console.error('获取 session ID 失败:', err)
        sendResponse({ sessionId: '', status: 'error' })
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

  // 让 extension 图标点击显示 popup，不再直接打开侧边栏
  // 因为现在将连接信息移至了 Popup 界面
})

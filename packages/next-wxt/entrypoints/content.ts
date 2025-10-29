import { allowWindowMessaging, onMessage, sendMessage } from 'webext-bridge/content-script'

export default defineContentScript({
  matches: ['*://*/*'],
  runAt: 'document_end',
  async main() {
    // 1、 内容脚本初始化，若匹配
    const initWebMCP = async () => {
      const originUrl = window.location.origin
      const replay = await sendMessage('initWebMCP', { originUrl }, 'background')

      contentLog(replay.msg)()
    }

    await initWebMCP()

    onMessage('sidepanel-ready', ({ sender, data }) => {
      console.log('[main.js] 收到 Sidepanel 就绪消息', data)
      sendMessage('sidepanel-ready', data, 'window')
    })

    // 转发Sidepanel到window页面的消息
    onMessage('mcp-client-to-server', ({ sender, data }) => {
      console.log('[main.js] 收到 mcp-client-to-server 消息', data)
      sendMessage('mcp-client-to-server', data, 'window')
    })

    // 2、处理页面ExtensionServerTransport 发出 mcp-server-register消息
    allowWindowMessaging('ExtensionServerTransport-namespace')
    onMessage('mcp-server-register', ({ sender, data }) => {
      if (!data.serverInfo) {
        console.error('[main.js] 注册消息缺少 serverInfo 字段')
        return
      }

      // 转发注册消息到 Sidepanel
      contentLog('现在转发消息到 mcp-server-register 到 sidepanel', data)()
      sendMessage('mcp-server-register', data, 'popup')
    })

    // 3、处理页面ExtensionServerTransport 发出 mcp-server-to-client
    onMessage('mcp-server-to-client', ({ sender, data }) => {
      if (!data.mcpMessage) {
        console.error('[main.js] 消息缺少 mcpMessage 字段')
        return
      }

      contentLog('现在转发消息到 client', data)()
      browser.runtime.sendMessage({
        type: 'mcp-server-to-client',
        data: {
          sessionId: data.sessionId,
          mcpMessage: data.mcpMessage
        }
      })
    })
  }
})

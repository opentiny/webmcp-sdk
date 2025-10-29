import { allowWindowMessaging, onMessage, sendMessage } from 'webext-bridge/content-script'
import { createApp } from 'vue'
import PageUI from '@/components/pageUI.vue'
export default defineContentScript({
  matches: ['*://*/*'],
  runAt: 'document_end',
  async main(ctx) {
    // 1、 内容脚本初始化，若匹配
    const initWebMCP = async () => {
      const originUrl = window.location.origin
      return await sendMessage('initWebMCP', { originUrl }, 'background')
    }

    const res = await initWebMCP()

    if (!res.success) {
      return
    }

    onMessage('sidepanel-ready', ({ sender, data }) => {
      console.log('[main.js] 收到 Sidepanel 就绪消息', data)
      sendMessage('sidepanel-ready', data, 'window')
    })

    // 转发Sidepanel到window页面的消息
    onMessage('mcp-client-to-server', ({ data }) => {
      console.log('[main.js] 收到 mcp-client-to-server 消息', data)
      sendMessage('mcp-client-to-server', data, 'window')
      // 下发命令，可能为工具调用
      if (data.mcpMessage.params?.name) {
        // 先切换到当前页签
        sendMessage('focus-tab', {}, 'background')

        sendMessage(
          'page-app-message',
          { status: 'run', message: `正在调用 ${data.mcpMessage.params?.name}` },
          'content-script'
        )
      }
    })

    // 2、处理页面ExtensionServerTransport 发出 mcp-server-register消息
    allowWindowMessaging('ExtensionServerTransport-namespace')
    onMessage('mcp-server-register', ({ sender, data }) => {
      if (!data.serverInfo) {
        console.error('[main.js] 注册消息缺少 serverInfo 字段')
        return
      }

      // 转发注册消息到 Sidepanel
      sendMessage('mcp-server-register', data, 'popup')
    })

    // 3、处理页面ExtensionServerTransport 发出 mcp-server-to-client
    onMessage('mcp-server-to-client', ({ sender, data }) => {
      if (!data.mcpMessage) {
        console.error('[main.js] 消息缺少 mcpMessage 字段')
        return
      }
      browser.runtime.sendMessage({
        type: 'mcp-server-to-client',
        data: {
          sessionId: data.sessionId,
          mcpMessage: data.mcpMessage
        }
      })

      // 返回命令执行结果给 sidePanel， 如果有content, 默认是工具调用成功了!
      if (data.mcpMessage.result?.content) {
        sendMessage('page-app-message', { status: 'ready', message: '' }, 'content-script')
      }
    })

    // 4、页面添加UI
    const pageApp = createIntegratedUi(ctx, {
      position: 'inline',
      anchor: 'body',
      onMount: (container) => {
        const app = createApp(PageUI)
        app.mount(container)
      }
    })

    pageApp.mount()
  }
})

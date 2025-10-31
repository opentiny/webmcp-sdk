import { allowWindowMessaging, onMessage, sendMessage } from 'webext-bridge/content-script'
import { createApp } from 'vue'
import PageUI from '@/components/pageUI.vue'
export default defineContentScript({
  matches: ['*://*/*'],
  runAt: 'document_end',
  async main(ctx) {
    window.printLog = printLog
    window.initLog = initLog

    let sessionId = ''
    let tabId = '' // TODO 当前页大概不需要自己知道自己的tabId  ✅  ❌️  ⭐

    // 1、 内容脚本初始化，若匹配
    const initWebMCP = async () => {
      const originUrl = window.location.origin

      await insertLog('content-script', `initWebMCP请求bg插入脚本, originUrl=${originUrl}`)
      const replay = await sendMessage('initWebMCP', { originUrl }, 'background')
      await insertLog('content-script', `${replay.msg}`)
      await insertLog('event-end', '⭐ initWebMCP') //  流程结束

      return replay.success
    }

    const initSuccess = await initWebMCP()
    if (!initSuccess) {
      return
    }

    // 2、处理页面ExtensionServerTransport 发出 mcp-server-register消息
    allowWindowMessaging('ExtensionServerTransport-namespace')
    onMessage('mcp-server-register', async ({ sender, data }) => {
      if (!data.serverInfo) {
        await insertLog('content-script', `❌️ server注册消息缺少 serverInfo 字段`)
        return
      }
      sessionId = data.sessionId

      await insertLog('content-script', `再将 server 注册消息转发给 side-panel`)
      await sendMessage('mcp-server-register-to-side', data, 'popup')
    })

    // 3、处理页面ExtensionServerTransport 发出 mcp-server-to-client
    onMessage('mcp-server-to-client', async ({ sender, data }) => {
      insertLog('content-script', `window 页面mcp-server-to-client消息转发给 side-panel`)
      if (!data.mcpMessage) {
        await insertLog('content-script', `❌️ mcp-server-to-client消息缺少 mcpMessage 字段`)
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
        await sendMessage('page-app-message', { status: 'ready', message: '' }, 'content-script')
      }
    })

    // 4、转发Sidepanel到window页面的消息
    onMessage('mcp-client-to-server', async ({ data }) => {
      await insertLog(
        'content-script',
        `收到 mcp-client-to-server 消息, 即将转发给 window: ${data.mcpMessage?.method}`,
        data
      )
      await sendMessage('mcp-client-to-server', data, 'window') // TODO 这里需要 tabId ??

      // 下发命令，可能为工具调用
      if (data.mcpMessage.params?.name) {
        // 先切换到当前页签
        await sendMessage('focus-tab', {}, 'background')

        await sendMessage(
          'page-app-message',
          { status: 'run', message: `正在调用 ${data.mcpMessage.params?.name}` },
          'content-script'
        )
      }
    })

    // 5、sidePanel 刚打开，转发消息给window,重新注册
    onMessage('sidepanel-ready', async ({ sender, data }) => {
      await insertLog('content-script', '收到 Sidepanel 就绪消息, 即将转发给 window 重新注册', data)
      await sendMessage('sidepanel-ready-to-page', data, 'window')
    })

    // 6、转发网页上的log到这里，以便记录到日志
    onMessage('server-transport-log-event', async ({ data }) => {
      await insertLog('server-transport', data.message, data.extra)
    })
    onMessage('client-transport-log-event', async ({ data }) => {
      await insertLog('client-transport', data.message, data.extra)
    })

    // 7、页面添加UI
    const pageApp = createIntegratedUi(ctx, {
      position: 'inline',
      anchor: 'body',
      onMount: async (container) => {
        const app = createApp(PageUI)
        app.mount(container)
        await insertLog('content-script', `pageApp UI 插入页面成功 `)
        await insertLog('event-end', 'pageApp-ui-mount')
      }
    })

    pageApp.mount()
  }
})

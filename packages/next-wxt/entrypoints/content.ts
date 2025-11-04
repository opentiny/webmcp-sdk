import PageUI from '@/components/pageUI.vue'
import { WebMcpServer, ContentScriptServerTransport, z } from '@opentiny/next-sdk'
import getMcpToolByHostname from '../mcp-servers'

export default defineContentScript({
  matches: ['*://*/*'],
  runAt: 'document_end',
  async main(ctx) {
    // 全局变量
    let self: Browser.runtime.MessageSender
    let tabId: number
    let sessionId: string

    // 页面可见之后，才启动整个流程
    if (document.visibilityState === 'hidden') {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          startAll()
          document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
      }
      document.addEventListener('visibilitychange', handleVisibilityChange)
    } else {
      startAll()
    }

    async function startAll() {
      await getTabId()
      await createMcpServer()
      mountPageApp()

      console.log('页面初始化完成', { self, tabId, sessionId })
    }

    async function createMcpServer() {
      const cookie = document.cookie
      const cookieData = cookie.split('; ').reduce(
        (acc, cookie) => {
          const [key, value] = cookie.split('=')
          acc[key] = value
          return acc
        },
        {} as Record<string, string>
      )
      const serverInfo = {
        name: 'demo-server',
        version: '1.0.0'
      }

      const server = new WebMcpServer(serverInfo)

      // 获取当前页面域名
      const hostname = window.location.hostname
      const mcpTool = getMcpToolByHostname(hostname)

      // 如果找到匹配的工具配置，则注册
      if (mcpTool) {
        console.log('找到匹配的 MCP 工具配置，正在注册...')
        mcpTool({ server, z, cookie: cookieData })
      } else {
        console.log('当前域名没有配置 MCP 工具')
      }

      const _sessionId = localStorage.getItem('mcp-sessionId')
      const serverTransport = new ContentScriptServerTransport(_sessionId)
      sessionId = serverTransport.sessionId
      localStorage.setItem('mcp-sessionId', sessionId)

      await server.connect(serverTransport)

      // 向插件注册server
      serverTransport.notifyRegistration(serverInfo)
    }

    async function getTabId() {
      self = (await sendRuntimeMessage('who-am-i', {}, 'content->bg')) as any
      tabId = self.tab?.id!
    }

    function mountPageApp() {
      const pageApp = createIntegratedUi(ctx, {
        position: 'inline',
        anchor: 'body',
        onMount: async (container) => {
          const app = createApp(PageUI)
          app.mount(container)
        }
      })

      pageApp.mount()
    }
  }
})

// import { createApp } from 'vue'
import PageUI from '@/components/pageUI.vue'
import { WebMcpServer, ContentScriptServerTransport, z } from '@opentiny/next-sdk'
import getMcpToolByHostname from '../mcp-servers'

export default defineContentScript({
  matches: ['*://*/*'],
  runAt: 'document_end',
  async main(ctx) {
    async function connect() {
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

      // Create an MCP server
      const server = new WebMcpServer(serverInfo)

      // 获取当前页面域名
      const hostname = window.location.hostname
      console.log('当前页面域名:', hostname)

      // 根据域名获取对应的工具配置
      const mcpTool = getMcpToolByHostname(hostname)

      // 如果找到匹配的工具配置，则注册
      if (mcpTool) {
        console.log('找到匹配的 MCP 工具配置，正在注册...')
        mcpTool({ server, z, cookie: cookieData })
      } else {
        console.log('当前域名没有配置 MCP 工具')
      }

      const sessionId = localStorage.getItem('mcp-sessionId')

      // Create pair MCP transports
      const serverTransport = new ContentScriptServerTransport(sessionId)
      localStorage.setItem('mcp-sessionId', serverTransport.sessionId)

      console.log(serverTransport.sessionId)

      // Connect the client and server
      await server.connect(serverTransport)
      serverTransport.notifyRegistration(serverInfo)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        connect()
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }

    if (document.visibilityState === 'hidden') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    } else {
      connect()
    }

    // 7、页面添加UI
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
})

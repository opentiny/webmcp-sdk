import PageUI from '@/components/pageUI.vue'
import { createMcpServer } from '@/utils/createMcpServer'
import { createContentProxy } from '@/utils/contentProxy'
import { getMcpMetaInfo } from '@/mcp-servers'

export default defineContentScript({
  matches: ['*://*/*'],
  runAt: 'document_idle',
  async main(ctx) {
    // 全局变量
    let self: Browser.runtime.MessageSender
    let tabId: number

    // 1、判定启动条件：页面可见之后
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

    // 2、启动流程
    async function startAll() {
      await getTabId()

      // 获取当前页面的 hostname 和对应的 MCP 配置
      const hostname = window.location.hostname
      const mcpMeta = getMcpMetaInfo(hostname)

      // 根据配置类型选择不同的 MCP 加载方式
      if (mcpMeta) {
        console.log('【Content Script】找到 MCP 配置:', mcpMeta)
        if (mcpMeta.type === 'pageMcpServer') {
          createContentProxy(tabId)
          // 运行时插入 user-script，直接在页面中申明 mcp-server 和 tools
          await initWebMCP()
        } else if (mcpMeta.type === 'contentScriptMcpServer') {
          // 编译态在 content-script 中申明 mcp-server 和 tools
          await createMcpServer(tabId)
        } else {
          console.warn('【Content Script】未知的 MCP 服务器类型:', mcpMeta.type)
        }
      } else {
        console.log('【Content Script】当前域名未配置 MCP 服务器:', hostname)
      }

      mountPageApp()
      console.log('【Content Script】页面初始化完成', { self, tabId, hostname, mcpMeta })
    }

    async function getTabId() {
      self = await sendRuntimeMessage('who-am-i', {}, 'content->bg')
      tabId = self.tab?.id!
    }

    const initWebMCP = async () => {
      const hostname = window.location.hostname
      const reply = await browser.runtime.sendMessage({ type: 'inject-mcp-scripts', hostname })
      console.log('【Content Script】 initWebMCP 插入脚本结果：', reply)
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

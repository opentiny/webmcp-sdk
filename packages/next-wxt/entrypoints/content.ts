import PageUI from '@/components/pageUI.vue'
import { createMcpServer } from '@/utils/createMcpServer'
import { createContentProxy } from '@/utils/contentProxy'

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
      createContentProxy(tabId)
      // 编译态在content-script中申明mcp-server和tools
      // sessionId = await createMcpServer(tabId)
      // 运行时插入user-script，直接在页面中申明mcp-server和tools
      await initWebMCP()
      mountPageApp()

      console.log('【Content Script】页面初始化完成', { self, tabId })
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

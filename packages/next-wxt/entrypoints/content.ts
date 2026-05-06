import PageUI from '@/components/pageUI.vue'
import { getMcpMetaInfo } from '@/mcp-servers'
import { sendRuntimeMessage } from '@/utils/messages'

export default defineContentScript({
  matches: ['*://*/*'],
  runAt: 'document_idle',
  async main(ctx) {
    let tabId: number

    // 1. 等待页面可见后再初始化（避免后台标签浪费资源）
    if (document.visibilityState === 'hidden') {
      await new Promise<void>((resolve) => {
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            resolve()
          }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
      })
    }

    // 2. 获取当前 Tab ID
    const self = await sendRuntimeMessage('who-am-i', {}, 'content->bg')
    tabId = self.tab?.id!

    // 3. 建立 WebMCP <-> background 双向消息桥接 (已废弃)
    // 根据最新架构，Sidepanel 直接通过 background.ts 的 executeScript(world: MAIN) 查询和调用页面 WebMCP
    // 因此 content script 不再需要负责桥接 WebMCP 消息。

    // 4. 【场景B：存量第三方网页】检测当前域名
    //    若在 mcp-servers/ 中有对应配置，则通过 scripting.executeScript 注入工具脚本
    //    注入的脚本在页面真实 JS 上下文中运行，可直接访问 DOM
    const hostname = window.location.hostname
    const meta = getMcpMetaInfo(hostname)
    if (meta) {
      await injectMcpServerTools(hostname, tabId)
    }

    // 5. 挂载页面浮层 UI（工具调用动效等）
    mountPageApp(ctx, tabId)
  }
})

/**
 * 为第三方网页（场景B）注入 WebMCP 工具
 *
 * Content Script 没有 scripting API 权限，
 * 因此发送 'inject-mcp-tools' 消息委托 background.ts 代为注入。
 */
async function injectMcpServerTools(hostname: string, tabId: number): Promise<void> {
  try {
    const res = await browser.runtime.sendMessage({
      type: 'inject-mcp-tools',
      tabId,
      hostname
    })

    if (res?.success) {
      console.log(`[next-wxt] 已为 ${hostname} 注入 WebMCP 工具`)
    } else {
      console.warn(`[next-wxt] 注入 mcp-servers 工具失败 (${hostname}):`, res?.error)
    }
  } catch (error) {
    console.warn(`[next-wxt] 注入 mcp-servers 工具通信失败 (${hostname}):`, error)
  }
}

/**
 * 挂载页面浮层 UI（工具调用提示动效等）
 */
function mountPageApp(ctx: any, tabId: number): void {
  const pageApp = createIntegratedUi(ctx, {
    position: 'inline',
    anchor: 'body',
    onMount: async (container: HTMLElement) => {
      const app = createApp(PageUI, { tabId })
      container.dataset.wxtIntegrated = ''
      app.mount(container)
    }
  })
  pageApp.mount()
}

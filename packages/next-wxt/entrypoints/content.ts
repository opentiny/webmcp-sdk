import PageUI from '@/components/pageUI.vue'
import { getMcpMetaInfo } from '@/mcp-servers'
import { sendRuntimeMessage } from '@/utils/messages'
import { PageController } from '@page-agent/page-controller'

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

    // 3. 在 ISOLATED world 里初始化 PageController（不受 CSP 限制）
    //    background 通过 sendMessage({ type: 'PAGE_CONTROL' }) 调用页面 DOM 操作
    initPageController()

    // 4. 注入域名专属工具（mcp-servers/ 目录下的 WebMCP 工具脚本，只对配置了的域名生效）
    const hostname = window.location.hostname
    const meta = getMcpMetaInfo(hostname)
    if (meta) {
      await injectMcpServerTools(hostname, tabId)
    } else {
      // 无域名专属工具时，仍通知侧边栏刷新（page-agent-tool 是内置工具，不依赖此消息）
      browser.runtime.sendMessage({ type: 'page-tools-updated', tabId }).catch(() => {})
    }

    // 5. 挂载页面浮层 UI（工具调用动效等）
    mountPageApp(ctx, tabId)
  }
})

/**
 * 在 content script（ISOLATED world）里初始化 PageController。
 * 监听来自 background 的 PAGE_CONTROL 消息，执行 DOM 操作后返回结果。
 * 完全不受页面 CSP 限制，适用于百度等严格 CSP 页面。
 */
function initPageController() {
  let pageController: PageController | null = null

  function getPC(): PageController {
    if (!pageController) {
      pageController = new PageController({ enableMask: true, viewportExpansion: -1 })
    }
    return pageController
  }

  browser.runtime.onMessage.addListener((message, _sender, sendResponse): true | undefined => {
    if (message.type !== 'PAGE_CONTROL') return

    const { action, payload } = message
    const pc = getPC() as any

    const actionMap: Record<string, string> = {
      get_browser_state: 'getBrowserState',
      update_tree: 'updateTree',
      click_element: 'clickElement',
      input_text: 'inputText',
      select_option: 'selectOption',
      scroll: 'scroll',
      scroll_horizontally: 'scrollHorizontally',
      execute_javascript: 'executeJavascript',
      show_mask: 'showMask',
      hide_mask: 'hideMask',
      clean_up_highlights: 'cleanUpHighlights'
    }

    const methodName = actionMap[action]
    if (!methodName || typeof pc[methodName] !== 'function') {
      sendResponse({ success: false, error: `Unknown PAGE_CONTROL action: ${action}` })
      return true
    }

    Promise.resolve(pc[methodName](...(payload || [])))
      .then((result: any) => sendResponse({ success: true, result }))
      .catch((error: any) =>
        sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) })
      )

    return true // 异步响应
  })
}


/**
 * 从 ISOLATED world 注入单个脚本文件（<script src="chrome-extension://...">）。
 * 适用于 mcp-servers 域名专属工具脚本的注入，这类脚本需要在 MAIN world 运行。
 * 注意：此方式依赖 web_accessible_resources 声明，vendor/next-sdk.js 也是通过此方式注入的。
 */
function injectScript(path: string): Promise<void> {
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = browser.runtime.getURL(path)
    script.onload = () => {
      script.remove()
      resolve()
    }
    script.onerror = () => {
      script.remove()
      console.warn(`[next-wxt] 脚本加载失败: ${path}`)
      resolve()
    }
    ;(document.head || document.documentElement).appendChild(script)
  })
}

/** vendor 基础脚本幂等注入（只注入一次） */
let vendorInjected: Promise<void> | null = null
function injectVendorScripts(): Promise<void> {
  if (!vendorInjected) {
    vendorInjected = (async () => {
      await injectScript('vendor/next-sdk.js')
      await injectScript('vendor/init-webmcp.js')
    })()
  }
  return vendorInjected
}

/**
 * 为有 mcp-servers 配置的域名注入 WebMCP 专属工具脚本（MAIN world）。
 * page-agent-tool 已作为 sidepanel 内置工具注册，此函数只处理域名专属工具。
 */
async function injectMcpServerTools(hostname: string, tabId: number): Promise<void> {
  try {
    await injectVendorScripts()
    await injectScript(`mcp-servers/${hostname}/index.js`)

    console.log(`[next-wxt] 已为 ${hostname} 注入 WebMCP 工具`)

    browser.runtime.sendMessage({ type: 'page-tools-updated', tabId }).catch(() => {})
  } catch (error) {
    console.warn(`[next-wxt] 注入 mcp-servers 工具失败 (${hostname}):`, error)
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


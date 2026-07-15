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

    // 4. 注入 vendor/runtime.js（仅暴露 API），再在 MAIN world 按域名配置调用 registerPageAgentTool
    await injectRuntimeAndRegister(tabId)

    // 5. 如有域名专属工具，额外注入 mcp-servers 脚本
    const hostname = window.location.hostname
    const meta = getMcpMetaInfo(hostname)
    if (meta) {
      if (meta.runInContext) {
        await injectMcpServerToolsInContext(hostname)
      } else {
        await injectMcpServerTools(hostname, tabId)
      }
    }

    // 6. 挂载页面浮层 UI（工具调用动效等）
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
      ping: 'ping',
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
    if (!methodName) {
      sendResponse({ success: false, error: `Unknown PAGE_CONTROL action: ${action}` })
      return true
    }

    // ping 动作特殊处理：直接返回成功，不调用 PageController
    if (action === 'ping') {
      sendResponse({ success: true, result: 'pong' })
      return true
    }

    if (typeof pc[methodName] !== 'function') {
      sendResponse({ success: false, error: `Method ${methodName} is not a function on PageController` })
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
 * 脚本在 MAIN world 运行，可访问页面的 window 对象。
 * 依赖 web_accessible_resources 声明（vendor/runtime.js、mcp-servers 等）。
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

/**
 * 注入 vendor/runtime.js 到页面 MAIN world，再显式调用 registerPageAgentTool(options)。
 * runtime 不再自动注册，以便传入无障碍 / 高亮等配置。
 * 幂等：只注入一次（registerPageAgentTool/initializeBuiltinWebMCP 内部有守卫）。
 */
let runtimeInjected: Promise<void> | null = null
async function injectRuntimeAndRegister(tabId: number): Promise<void> {
  if (!runtimeInjected) {
    runtimeInjected = (async () => {
      await injectScript('vendor/runtime.js')
      await browser.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: () => {
          const api = (window as any).WebMCP || window
          const register = api.registerPageAgentTool
          if (typeof register !== 'function') return

          const isConsoleCloud =
            typeof api.isConsoleCloudHost === 'function' && api.isConsoleCloudHost(location.hostname)
          const options = isConsoleCloud
            ? api.consoleCloudPageAgentToolOptions || { enableHighlight: false }
            : { a11yConfig: { exposedAttributes: ['cf-uba'] } }
          register(options)
        },
      })
    })()
  }
  await runtimeInjected
  browser.runtime.sendMessage({ type: 'page-tools-injected', tabId }).catch(() => {})
}

/**
 * 为有 mcp-servers 配置的域名额外注入 WebMCP 专属工具脚本（MAIN world）。
 * vendor/runtime.js 已由 injectRuntimeAndRegister 注入，此函数只追加域名工具。
 */
async function injectMcpServerTools(hostname: string, tabId: number): Promise<void> {
  try {
    await injectScript(`mcp-servers/${hostname}/index.js`)
    console.log(`[next-wxt] 已为 ${hostname} 注入 WebMCP 工具`)
    browser.runtime.sendMessage({ type: 'page-tools-injected', tabId }).catch(() => {})
  } catch (error) {
    console.warn(`[next-wxt] 注入 mcp-servers 工具失败 (${hostname}):`, error)
  }
}

async function injectMcpServerToolsInContext(hostname: string): Promise<void> {
  try {
    // 内部版本，在此手动执行各自的函数
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

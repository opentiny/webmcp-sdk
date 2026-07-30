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

    // 3. 轻量握手：供 waitForPageToolsReady 探测 content script 是否已就绪
    //    页面操作已由 MAIN world 的 registerPageAgentTool（内置 WebMCP）承担
    initContentReadyPing()

    // 4. 注入 vendor/runtime.js + 注册 page-agent-tool
    //    → 用户 MCP 脚本（background MAIN）→（可选）内置 mcp-servers
    //    全部完成后再发一次 page-tools-injected，避免侧边栏过早同步拿到不完整工具列表
    await injectRuntimeAndRegister()

    const skipBuiltIn = await requestInjectUserMcpScripts(tabId)

    const hostname = window.location.hostname
    const meta = getMcpMetaInfo(hostname)
    if (meta && !skipBuiltIn) {
      await injectMcpServerTools(hostname)
    }

    browser.runtime.sendMessage({ type: 'page-tools-injected', tabId }).catch(() => {})

    // 5. 挂载页面浮层 UI（工具调用提示动效等）
    mountPageApp(ctx, tabId)
  }
})

/**
 * 响应 PAGE_CONTROL/ping，供 sidepanel waitForPageToolsReady 探测 content script 就绪。
 * 页面 DOM 操作不再走此路径。
 */
function initContentReadyPing() {
  browser.runtime.onMessage.addListener((message, _sender, sendResponse): true | undefined => {
    if (message.type !== 'PAGE_CONTROL' || message.action !== 'ping') return
    sendResponse({ success: true, result: 'pong' })
    return true
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
 * 注入 vendor/runtime.js，再注入 register-page-agent-tool.js 与用户脚本执行桥。
 * 全部走 <script src="chrome-extension://...">，与百度/京东等严格 CSP 页面兼容。
 *
 * 硬约束顺序（能力令牌桥）：
 *   runtime → register-page-agent-tool → user-mcp-exec（仅 bind 入口）
 *   → background bind(token) → exec(code, token)
 * 注意：勿在 content script 调用 browser.scripting（该 API 仅 background/扩展页可用）。
 */
let runtimeInjected: Promise<void> | null = null
async function injectRuntimeAndRegister(): Promise<void> {
  if (!runtimeInjected) {
    runtimeInjected = (async () => {
      await injectScript('vendor/runtime.js')
      await injectScript('vendor/register-page-agent-tool.js')
      // 须在 background scripting.executeScript(bind/exec) 之前就绪
      await injectScript('vendor/user-mcp-exec.js')
    })()
  }
  await runtimeInjected
}

/**
 * 请求 background 注入匹配当前 URL 的用户 MCP 脚本。
 * 返回是否应跳过内置 mcp-servers（replacesBuiltIn）。
 * 匹配/存储逻辑在 user-mcp-scripts；content 只做薄钩子。
 */
async function requestInjectUserMcpScripts(tabId: number): Promise<boolean> {
  try {
    const res = await browser.runtime.sendMessage({
      type: 'inject-user-mcp-scripts',
      tabId,
      url: location.href
    })
    if (res?.injectedCount > 0) {
      console.log(`[next-wxt] 已注入 ${res.injectedCount} 条用户 MCP 脚本`)
    }
    if (res?.error) {
      console.warn('[next-wxt] 用户 MCP 脚本执行异常:', res.error)
    }
    return Boolean(res?.shouldSkipBuiltIn)
  } catch (error) {
    console.warn('[next-wxt] 请求注入用户 MCP 脚本失败:', error)
    return false
  }
}

/**
 * 为有 mcp-servers 配置的域名额外注入 WebMCP 专属工具脚本（MAIN world）。
 * vendor/runtime.js 已由 injectRuntimeAndRegister 注入，此函数只追加域名工具。
 */
async function injectMcpServerTools(hostname: string): Promise<void> {
  try {
    await injectScript(`mcp-servers/${hostname}/index.js`)
    console.log(`[next-wxt] 已为 ${hostname} 注入 WebMCP 工具`)
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

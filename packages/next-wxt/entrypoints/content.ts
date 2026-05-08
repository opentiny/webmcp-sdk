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
    //    若在 mcp-servers/ 中有对应配置，则通过 DOM 注入工具脚本
    //    关键：从 ISOLATED world (content script) 创建 <script> 标签，
    //    Chrome 对 web_accessible_resources 的 chrome-extension:// URL 给予特殊信任，
    //    可绕过页面的 CSP 限制（page-agent 同款方案）
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
 * 从 ISOLATED world 注入单个脚本文件。
 *
 * 原理：content script（ISOLATED world）是 Chrome 信任的扩展上下文。
 * 由它创建的指向 web_accessible_resources 的 <script src="chrome-extension://..."> 标签，
 * Chrome 会绕过页面 CSP 直接执行，适用于百度等有严格 CSP 的页面。
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
      resolve() // 不 reject，让注入链继续
    }
    ;(document.head || document.documentElement).appendChild(script)
  })
}

/**
 * 为第三方网页（场景B）注入 WebMCP 工具
 *
 * 注入链（全部从 ISOLATED world 发起，绕过页面 CSP）：
 * 1. vendor/next-sdk.js    → 加载完整 WebMCP polyfill（设置 window.WebMCP）
 * 2. vendor/init-webmcp.js → 调用 initializeBuiltinWebMCP()，建立 navigator.modelContext；
 *                            若 SDK 被 CSP 阻断则启用内联 minimal polyfill
 * 3. mcp-servers/{host}/index.js → 注册页面专属工具
 */
async function injectMcpServerTools(hostname: string, tabId: number): Promise<void> {
  try {
    await injectScript('vendor/next-sdk.js')
    await injectScript('vendor/init-webmcp.js')
    await injectScript(`mcp-servers/${hostname}/index.js`)

    console.log(`[next-wxt] 已为 ${hostname} 注入 WebMCP 工具`)

    // 注入成功后，主动通知 Sidepanel 刷新工具列表
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

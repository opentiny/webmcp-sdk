import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill'
import { registerPageAgentTool } from '@opentiny/next-sdk'

declare global {
  interface Window {
    __webmcpcli_init?: boolean
    __webmcpcli_tools?: Array<{
      name: string
      description?: string
      inputSchema?: string | object
    }>
    __webmcpcli_interactiveWhitelist: Array<Element>
    __webmcpcli_interactiveBlacklist: Array<Element>
    __webmcpcli_exposedAttributes?: Array<string>
    __webmcpcli_beforeGetBrowserState: () => void
  }
}

async function syncTools(): Promise<void> {
  const ctx = (document as any).modelContext
  if (ctx?.getTools) {
    window.__webmcpcli_tools = (await ctx.getTools()) as Window['__webmcpcli_tools']
  }
}

function initWebMcpCliPage(): void {
  if (window.__webmcpcli_init) {
    return
  }

  initializeWebMCPPolyfill()
  registerPageAgentTool({ exposedAttributes: ['cf-uba'] })

  window.__webmcpcli_tools = []

  const ctx = (document as any).modelContext

  if (ctx?.addEventListener) {
    ctx.addEventListener('toolchange', () => {
      void syncTools()
    })
  } else if (ctx?.registerToolsChangedCallback) {
    ctx.registerToolsChangedCallback(() => {
      void syncTools()
    })
  }

  void syncTools()
  window.__webmcpcli_init = true
}

initWebMcpCliPage()

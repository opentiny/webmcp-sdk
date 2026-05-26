import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill'
import { PageController } from '@page-agent/page-controller'

declare global {
  interface Window {
    __webmcpcli_init?: boolean
    __webmcpcli_pageController?: PageController
    __webmcpcli_tools?: Array<{
      name: string
      description?: string
      inputSchema?: string | object
    }>
  }
}

async function syncTools(): Promise<void> {
  const ctx = (navigator as Navigator & { modelContextTesting?: { listTools?: () => Promise<unknown[]> } })
    .modelContextTesting
  if (ctx?.listTools) {
    window.__webmcpcli_tools = (await ctx.listTools()) as Window['__webmcpcli_tools']
  }
}

function initWebMcpCliPage(): void {
  if (window.__webmcpcli_init) {
    return
  }

  initializeWebMCPPolyfill()

  window.__webmcpcli_pageController = new PageController({
    enableMask: true,
    viewportExpansion: -1
  })

  window.__webmcpcli_tools = []

  const ctx = (navigator as Navigator & {
    modelContextTesting?: {
      registerToolsChangedCallback?: (cb: () => void) => void
    }
  }).modelContextTesting

  if (ctx?.registerToolsChangedCallback) {
    ctx.registerToolsChangedCallback(() => {
      void syncTools()
    })
  }

  void syncTools()
  window.__webmcpcli_init = true
}

initWebMcpCliPage()

import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill'
import {
  registerPageAgentTool,
  consoleCloudPageAgentToolOptions,
  isConsoleCloudHost,
  enableInspectAssist,
  type PageAgentToolOptions,
} from '@opentiny/next-sdk'

declare global {
  interface Window {
    __webmcpcli_init?: boolean
    __webmcpcli_tools?: Array<{
      name: string
      description?: string
      inputSchema?: string | object
    }>
    __webmcpcli_beforeGetBrowserState: () => void
  }
}

async function syncTools(): Promise<void> {
  const ctx = (document as any).modelContext
  if (ctx?.getTools) {
    window.__webmcpcli_tools = (await ctx.getTools()) as Window['__webmcpcli_tools']
  }
}

/** 按域名选择 page-agent-tool 配置（云控制台使用 consoleCloud 无障碍补齐规则） */
function resolvePageAgentToolOptions(): PageAgentToolOptions {
  if (isConsoleCloudHost(location.hostname)) {
    return consoleCloudPageAgentToolOptions
  }
  return { a11yConfig: { exposedAttributes: ['cf-uba'] } }
}

function initWebMcpCliPage(): void {
  if (window.__webmcpcli_init) {
    return
  }

  initializeWebMCPPolyfill()
  registerPageAgentTool(resolvePageAgentToolOptions())
  // Inspect Assist：点选即复制 Cursor 元素卡片（辅助定位改样式/逻辑）
  enableInspectAssist({ brandLabel: 'WebMCP' })

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

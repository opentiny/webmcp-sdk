import { connectBrowser, getTargetPage, getPageTargetId, injectIntoPage } from '../browser'

export async function stateCommand({ tabid }: { tabid?: string }) {
  const browser = await connectBrowser()
  try {
    const page = await getTargetPage(browser, tabid)

    // 1. 每一次 state 都重新注入一次 page-agent-tool，确保手动打开的页面也能使用工具
    await injectIntoPage(page)

    // 2. 在页面上下文中获取导航元数据和已注册的工具列表
    //    不获取 DOM content（由调用方按需通过 browserState 拉取）
    const state = await page.evaluate(async () => {
      const url = document.URL
      const title = document.title

      const mcp = (navigator as any).modelContextTesting || (navigator as any).modelContext
      let webmcpTools: any[] = []

      if (mcp && typeof mcp.listTools === 'function') {
        const toolsResult = await mcp.listTools()
        webmcpTools = toolsResult?.tools || toolsResult || []
      }

      return { url, title, webmcpTools }
    })

    const activeTabid = await getPageTargetId(page).catch(() => undefined)

    // 3. 获取所有标签页信息（排除 devtools:// 内部页面）
    const pages = await browser.pages()
    const tabs = await Promise.all(
      pages.map(async (p) => {
        const pUrl = p.url()
        if (pUrl.startsWith('devtools://')) return null

        const pTitle = await Promise.race([
          p.title().catch(() => 'Unknown'),
          new Promise<string>((resolve) => setTimeout(() => resolve('Unknown'), 500))
        ])

        return {
          // 使用真实的 Chrome target ID，而非数组下标
          tabid: await getPageTargetId(p).catch(() => pUrl),
          title: pTitle,
          url: pUrl
        }
      })
    )

    return {
      ...state,
      activeTabid,
      tabs: tabs.filter(Boolean)
    }
  } finally {
    await browser.disconnect()
  }
}

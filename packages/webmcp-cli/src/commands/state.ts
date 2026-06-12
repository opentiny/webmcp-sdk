import { connectBrowser, getTargetPage, getPageTargetId, injectIntoPage } from '../browser'

export async function stateCommand({ tabid, resMode }: { tabid?: string; resMode?: string }) {
  const browser = await connectBrowser()
  try {
    const page = await getTargetPage(browser, tabid)

    // 1. 每一次state都重新注入一次page-agent-tool。  这样用户即使手动打开的网页也会有相应的工具。
    await injectIntoPage(page)

    // 2. 在页面上下文中执行，获取当前状态和可用工具
    const state = await page.evaluate(async (responseMode) => {
      const url = document.URL
      const title = document.title

      // 尝试获取内置工具
      const mcp = (navigator as any).modelContextTesting || (navigator as any).modelContext
      let webmcpTools: any[] = []
      let contentData: any = `页面已准备好: ${title}`

      if (mcp) {
        if (typeof mcp.listTools === 'function') {
          const toolsResult = await mcp.listTools()
          webmcpTools = toolsResult?.tools || toolsResult || []
        }

        if (typeof mcp.executeTool === 'function') {
          try {
            const argsString = JSON.stringify({ action: 'browserState', responseMode: responseMode || 'diff' })
            let stateRes = await mcp.executeTool('page-agent-tool', argsString)

            if (typeof stateRes === 'string') {
              try {
                stateRes = JSON.parse(stateRes)
              } catch (e) {
                // ignore
              }
            }
            if (stateRes && stateRes.content && stateRes.content.length > 0) {
              const textContent = stateRes.content.map((c: any) => c.text).join('\\n')

              // page-agent-tool 返回的格式通常官方是 "浏览器状态: {\"url\":..., \"content\":\"[0]...\"}"
              // 我们尝试把这个 JSON 提取出来，让外层更容易解析
              const prefix = '浏览器状态: '
              if (textContent.startsWith(prefix)) {
                try {
                  const jsonStr = textContent.substring(prefix.length)
                  const parsedState = JSON.parse(jsonStr)
                  // 提取出带有索引的 DOM 树数据作为 content
                  contentData = parsedState.content
                } catch (e) {
                  contentData = textContent
                }
              } else {
                contentData = textContent
              }
            }
          } catch (e: any) {
            console.error('Snapshot error:', e.message)
          }
        }
      }

      return {
        content: contentData,
        url,
        title,
        webmcpTools
      }
    }, resMode)

    // 3. 获取所有的 tab 信息（排除 devtools:// 内部页面）
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
      tabs: tabs.filter(Boolean)
    }
  } finally {
    await browser.disconnect()
  }
}

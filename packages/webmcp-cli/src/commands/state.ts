import { connectBrowser, getTargetPage } from '../browser'
import pc from 'picocolors'

export async function stateCommand({ tabid }: { tabid?: number }) {
  const browser = await connectBrowser()
  try {
    const page = await getTargetPage(browser, tabid)

    // 在页面上下文中执行，获取当前状态和可用工具
    const state = await page.evaluate(async () => {
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
            const argsString = JSON.stringify({ action: 'browserState' })
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
              
              // page-agent-tool 返回的格式通常是 "浏览器状态: {\"url\":..., \"content\":\"[0]...\"}"
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
    })

    // 获取所有的 tab 信息
    const pages = await browser.pages()
    const tabs = []
    for (const p of pages) {
      const pUrl = p.url()
      if (pUrl.startsWith('devtools://')) continue // 忽略 devtools
      const pTitle = await p.title().catch(() => 'Unknown')
      const target = p.target()
      // @ts-ignore
      const targetId = target._targetId || 'unknown'
      // 简单数字 hash，或直接返回 targetId
      let numId = 0
      for (let i = 0; i < targetId.length; i++) {
        numId = (numId << 5) - numId + targetId.charCodeAt(i)
        numId |= 0
      }
      numId = Math.abs(numId) % 10000

      tabs.push({
        tabid: numId,
        title: pTitle,
        url: pUrl
      })
    }

    return {
      ...state,
      tabs
    }
  } finally {
    await browser.disconnect()
  }
}

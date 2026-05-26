import { connectToActivePageWithTarget } from '../cdp/targets.js'
import { ensurePageInjected, evaluateOnPage, getTabsContext } from '../cdp/page-session.js'

export interface ListResult {
  currTab: {
    url: string
    content: unknown
    tabId: string
    tools: unknown[]
  }
  otherTabs: Array<{ url: string; title: string; tabId: string }>
}

/**
 * list 命令：注入脚本并返回当前页面状态 JSON
 */
export async function runListCommand(): Promise<void> {
  let { client, target: activeTarget } = await connectToActivePageWithTarget()
  try {
    client = await ensurePageInjected(client)
    const { currentTabId, currentUrl, otherTabs } = await getTabsContext(activeTarget.id)

    const expression = `(async () => {
      const pc = window.__webmcpcli_pageController
      if (!pc) throw new Error('PageController 未初始化')
      const content = await pc.getBrowserState()
      await pc.hideMask()
      await pc.cleanUpHighlights()
      return {
        content,
        tools: window.__webmcpcli_tools || []
      }
    })()`

    const { content, tools } = await evaluateOnPage<{ content: unknown; tools: unknown[] }>(
      client,
      expression,
      true
    )

    const result: ListResult = {
      currTab: {
        url: currentUrl,
        content,
        tabId: currentTabId,
        tools
      },
      otherTabs
    }

    console.log(JSON.stringify(result, null, 2))
  } finally {
    await client.close()
  }
}

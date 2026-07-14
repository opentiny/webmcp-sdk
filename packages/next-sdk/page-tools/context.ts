import type { PageController } from '@page-agent/page-controller'
import type { PageStateCache } from './page-state-cache'
import type { RefMap } from './a11y-tree'

export type PageAgentToolContentResult = {
  content: Array<{ type: 'text'; text: string }>
}

export type PageAgentToolErrorResult = PageAgentToolContentResult & {
  isError: true
  error: string
}

export async function createActionErrorResult(
  message: string,
  buildBrowserStateResponse: ActionContext['buildBrowserStateResponse']
): Promise<PageAgentToolErrorResult> {
  try {
    const browserState = await buildBrowserStateResponse('full')
    return {
      isError: true,
      error: message,
      content: [{ type: 'text', text: `${message}\n\n${browserState.content[0].text}` }]
    }
  } catch (error) {
    return {
      isError: true,
      error: message,
      content: [
        {
          type: 'text',
          text: `${message}\n\n获取最新浏览器状态失败: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    }
  }
}

export interface ActionContext {
  pageController: PageController
  stateCache: PageStateCache
  getRefMap: () => RefMap
  setRefMap: (map: RefMap) => void
  buildBrowserStateResponse: (
    mode?: 'full' | 'diff' | 'both'
  ) => Promise<{ content: Array<{ type: 'text'; text: string }> }>
  refreshOnStaleRef: (action: string, index: number) => Promise<{ content: Array<{ type: 'text'; text: string }> }>
  errContent: (msg: string) => Promise<{ content: Array<{ type: 'text'; text: string }> }>
  actionError: (msg: string) => Promise<PageAgentToolErrorResult>
}

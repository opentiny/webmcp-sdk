import type { PageController } from '@page-agent/page-controller'
import type { PageStateCache } from './page-state-cache'
import type { RefMap, RefAllocator } from './a11y-tree'

export const REF_NOT_PRESENTED_ERROR_CODE = 'REF_NOT_PRESENTED' as const

export type PageAgentToolContentResult = {
  content: Array<{ type: 'text'; text: string }>
}

export type PageAgentToolErrorResult = PageAgentToolContentResult & {
  isError: true
  error: string
  errorCode?: string
}

/** 将额外字段合并进 browserState JSON，保持整段可反序列化 */
export function withStateFields(stateText: string, extra: Record<string, unknown>): string {
  try {
    const state = JSON.parse(stateText) as Record<string, unknown>
    return JSON.stringify({ ...state, ...extra })
  } catch {
    return JSON.stringify({ ...extra, raw: stateText })
  }
}

/**
 * 解析最新页面快照中的活跃目标元素：
 * 编号必须出现在最新快照 refMap 中，且元素仍挂载在文档内（isConnected），否则视为失效编号。
 */
export function resolveActiveRefElement(ctx: ActionContext, index: number): HTMLElement | null {
  const el = ctx.getRefMap().get(index)
  if (!el || !el.isConnected) return null
  return el
}

/**
 * 构建统一的过期/不存在 #ref 错误响应（不自动附带整页树，交由调用方按需拉取 full）
 */
export function createStaleRefErrorResult(
  actionLabel: string,
  index: number,
  url: string,
  rev: number
): PageAgentToolErrorResult {
  const message = `${actionLabel}失败 [${REF_NOT_PRESENTED_ERROR_CODE}]: ref 索引 #${index} 不在最新页面快照中（元素可能已移除或尚未获取最新快照），请先调用 browserState 获取最新状态后重试。`
  return {
    isError: true,
    errorCode: REF_NOT_PRESENTED_ERROR_CODE,
    error: message,
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          errorCode: REF_NOT_PRESENTED_ERROR_CODE,
          error: message,
          index,
          url,
          rev
        })
      }
    ]
  }
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
      content: [{ type: 'text', text: withStateFields(browserState.content[0].text, { error: message }) }]
    }
  } catch (error) {
    return {
      isError: true,
      error: message,
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: message,
            stateError: error instanceof Error ? error.message : String(error)
          })
        }
      ]
    }
  }
}

export interface ActionContext {
  pageController: PageController
  stateCache: PageStateCache
  refAllocator: RefAllocator
  getRefMap: () => RefMap
  setRefMap: (map: RefMap) => void
  buildBrowserStateResponse: (
    mode?: 'full' | 'diff' | 'both'
  ) => Promise<{ content: Array<{ type: 'text'; text: string }> }>
  staleRefError: (actionLabel: string, index: number) => Promise<PageAgentToolErrorResult>
  /** @deprecated 统一委托给 staleRefError，保留签名兼容旧内部调用 */
  refreshOnStaleRef: (action: string, index: number) => Promise<PageAgentToolErrorResult>
  resetSession: () => void
  errContent: (msg: string) => Promise<{ content: Array<{ type: 'text'; text: string }> }>
  actionError: (msg: string) => Promise<PageAgentToolErrorResult>
}

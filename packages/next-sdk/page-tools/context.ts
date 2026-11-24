import type { PageController } from '@page-agent/page-controller'
import type { SnapshotKind } from './page-state-cache'
import type { RefMap, RefAllocator } from './a11y-tree'
import type { DetectedDialog } from './utils/dom'

export const REF_NOT_PRESENTED_ERROR_CODE = 'REF_NOT_PRESENTED' as const
export const SESSION_RESET_ERROR_CODE = 'SESSION_RESET' as const

export type PageAgentToolErrorCode =
  | typeof REF_NOT_PRESENTED_ERROR_CODE
  | typeof SESSION_RESET_ERROR_CODE

export type BrowserStateResponseMode = 'full' | 'diff' | 'both'

/** 依赖 #ref 索引的交互动作中文名称映射（统一供失效编号报错与异常兜底复用） */
export const REF_ACTION_LABELS = {
  click: '点击',
  fill: '填写',
  select: '选择',
  hover: '悬浮',
  scroll: '滚动'
} as const

export type RefActionName = keyof typeof REF_ACTION_LABELS

export type ResolvedRefElement =
  | { ok: true; el: HTMLElement }
  | { ok: false; error: PageAgentToolErrorResult }

export type PageAgentToolContentResult = {
  content: Array<{ type: 'text'; text: string }>
}

export type PageAgentToolErrorResult = PageAgentToolContentResult & {
  isError: true
  error: string
  errorCode?: PageAgentToolErrorCode
}

/** browserState / 交互动作返回的状态 JSON 结构（供宿主上下文管理与工具层反序列化使用） */
export interface BrowserStateSnapshot {
  kind: SnapshotKind
  url: string
  title: string
  rev: number
  baseRev?: number
  content: string
  dialogs?: DetectedDialog[]
  validationErrors?: string[]
  tooltips?: string[]
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

/** 按错误码构建统一的轻量结构化错误响应（不附带整页树） */
export function createCodedErrorResult(
  errorCode: PageAgentToolErrorCode,
  message: string,
  extraPayload: Record<string, unknown> = {}
): PageAgentToolErrorResult {
  return {
    isError: true,
    errorCode,
    error: message,
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          errorCode,
          error: message,
          ...extraPayload
        })
      }
    ]
  }
}

/** 构建统一的过期/不存在 #ref 错误响应（不自动附带整页树，交由调用方按需拉取 full） */
export function createStaleRefErrorResult(
  actionLabel: string,
  index: number,
  url: string,
  rev: number
): PageAgentToolErrorResult {
  const message = `${actionLabel}失败 [${REF_NOT_PRESENTED_ERROR_CODE}]: ref 索引 #${index} 不在最新页面快照中（元素可能已移除或尚未获取最新快照），请先调用 browserState 获取最新状态后重试。`
  return createCodedErrorResult(REF_NOT_PRESENTED_ERROR_CODE, message, { index, url, rev })
}

/** 构建单轮结束/会话重置拦截过期续体的错误响应 */
export function createSessionResetErrorResult(url: string): PageAgentToolErrorResult {
  const message = `当前对话轮次已结束或会话已重置 [${SESSION_RESET_ERROR_CODE}]: 前序未完成操作的状态回写已忽略（若 DOM 操作已触发可能已生效），请重新调用 browserState 获取最新页面状态。`
  return createCodedErrorResult(SESSION_RESET_ERROR_CODE, message, { url })
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
  refAllocator: RefAllocator
  getRefMap: () => RefMap
  setRefMap: (map: RefMap) => void
  buildBrowserStateResponse: (
    mode?: BrowserStateResponseMode
  ) => Promise<{ content: Array<{ type: 'text'; text: string }> }>
  /** 解析活跃目标元素，若编号不在最新快照或元素已脱离文档则统一返回 REF_NOT_PRESENTED 错误 */
  resolveRefOrError: (action: RefActionName, index: number) => Promise<ResolvedRefElement>
  errContent: (msg: string) => Promise<{ content: Array<{ type: 'text'; text: string }> }>
  actionError: (msg: string) => Promise<PageAgentToolErrorResult>
}

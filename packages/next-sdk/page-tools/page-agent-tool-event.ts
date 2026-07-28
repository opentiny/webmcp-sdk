import { ActionContext } from './context'
import { inputSchema, type PageAgentToolInput, type PageAgentToolRawInput } from './schema'
import { PageController } from '@page-agent/page-controller'

export const PAGE_AGENT_TOOL_CALL_EVENT = 'page-agent-tool-call'
export const PAGE_AGENT_TOOL_RESULT_EVENT = 'page-agent-tool-result'
export const PAGE_AGENT_CHAT_END_EVENT = 'page-agent-chat-end'
export const PAGE_AGENT_USER_DO_ACTION_EVENT = 'page-agent-user-do-action' // 用户执行click 等操作事件

export type PageAgentToolCallEventDetail = {
  data?: PageAgentToolRawInput
  requestId: string
}

export type PageAgentToolResultEventDetail = {
  data: {
    success: boolean
    result?: unknown
    error?: string
  }
  requestId: string
}

type ExecutePageAgentTool = (data: PageAgentToolInput) => Promise<unknown>

function isPageAgentToolErrorResult(result: unknown): result is { isError: true; error: string } {
  return (
    typeof result === 'object' &&
    result !== null &&
    'isError' in result &&
    result.isError === true &&
    'error' in result &&
    typeof result.error === 'string'
  )
}

declare global {
  interface Window {
    __nextSdkPageAgentToolEventCleanup?: () => void
  }
}

function dispatchPageAgentToolResult(detail: PageAgentToolResultEventDetail) {
  window.dispatchEvent(new CustomEvent(PAGE_AGENT_TOOL_RESULT_EVENT, { detail }))
}

export function setupPageAgentToolEventBridge(
  executePageAgentTool: ExecutePageAgentTool,
  pageController: PageController,
  actionContext: ActionContext
) {
  window.__nextSdkPageAgentToolEventCleanup?.()

  const handleToolCall = async (event: Event) => {
    const detail = (event as CustomEvent<PageAgentToolCallEventDetail>).detail
    const requestId = detail?.requestId

    if (!requestId) {
      dispatchPageAgentToolResult({
        requestId: '',
        data: {
          success: false,
          error: '缺少 requestId'
        }
      })
      return
    }

    try {
      const data = inputSchema.parse(detail.data)
      const result = await executePageAgentTool(data)
      if (isPageAgentToolErrorResult(result)) {
        dispatchPageAgentToolResult({
          requestId,
          data: {
            success: false,
            error: result.error,
            result
          }
        })
        return
      }
      dispatchPageAgentToolResult({
        requestId,
        data: {
          success: true,
          result
        }
      })
    } catch (error) {
      dispatchPageAgentToolResult({
        requestId,
        data: {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      })
    }
  }

  // 聊天结束事件，用于在聊天结束时移除遮罩
  const handleChatEnd = async () => {
    try {
      await pageController.hideMask()
    } catch (error) {}
  }

  const handleUserDoAction = async (ev: MouseEvent) => {
    // @ts-ignore
    if (ev.isTrusted && pageController.mask.shown) {
      // 通过ev.target找到 refMap 对应的元素
      const target = ev.target as HTMLElement
      const refMap = actionContext.getRefMap()
      const targetParent = Array.from(refMap.values()).find((el) => el.contains(target)) as HTMLElement | undefined

      if (targetParent) {
        window.dispatchEvent(
          new CustomEvent(PAGE_AGENT_USER_DO_ACTION_EVENT, { detail: { action: 'click', dom: targetParent } })
        )
      }
    }
  }

  window.addEventListener(PAGE_AGENT_TOOL_CALL_EVENT, handleToolCall)
  window.addEventListener(PAGE_AGENT_CHAT_END_EVENT, handleChatEnd)
  window.addEventListener('click', handleUserDoAction, true)

  window.__nextSdkPageAgentToolEventCleanup = () => {
    window.removeEventListener(PAGE_AGENT_TOOL_CALL_EVENT, handleToolCall)
    window.removeEventListener(PAGE_AGENT_CHAT_END_EVENT, handleChatEnd)
    window.removeEventListener('click', handleUserDoAction, true)
    window.__nextSdkPageAgentToolEventCleanup = undefined
  }
}

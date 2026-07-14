export const PAGE_AGENT_TOOL_CALL_EVENT = 'page-agent-tool-call'
export const PAGE_AGENT_TOOL_RESULT_EVENT = 'page-agent-tool-result'

export type PageAgentToolCallEventDetail = {
  data?: Record<string, unknown>
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

type ExecutePageAgentTool = (data: Record<string, unknown>) => Promise<unknown>

declare global {
  interface Window {
    __nextSdkPageAgentToolEventCleanup?: () => void
  }
}

function dispatchPageAgentToolResult(detail: PageAgentToolResultEventDetail) {
  window.dispatchEvent(new CustomEvent(PAGE_AGENT_TOOL_RESULT_EVENT, { detail }))
}

export function setupPageAgentToolEventBridge(executePageAgentTool: ExecutePageAgentTool) {
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
      const result = await executePageAgentTool(detail.data ?? {})
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

  window.addEventListener(PAGE_AGENT_TOOL_CALL_EVENT, handleToolCall)
  window.__nextSdkPageAgentToolEventCleanup = () => {
    window.removeEventListener(PAGE_AGENT_TOOL_CALL_EVENT, handleToolCall)
    window.__nextSdkPageAgentToolEventCleanup = undefined
  }
}

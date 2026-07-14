import { inputSchema, type PageAgentToolInput, type PageAgentToolRawInput } from './schema'

export const PAGE_AGENT_TOOL_CALL_EVENT = 'page-agent-tool-call'
export const PAGE_AGENT_TOOL_RESULT_EVENT = 'page-agent-tool-result'

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

  window.addEventListener(PAGE_AGENT_TOOL_CALL_EVENT, handleToolCall)
  window.__nextSdkPageAgentToolEventCleanup = () => {
    window.removeEventListener(PAGE_AGENT_TOOL_CALL_EVENT, handleToolCall)
    window.__nextSdkPageAgentToolEventCleanup = undefined
  }
}

/**
 * Recorder WebMCP 工具类型与存储键（独立于 user-mcp-scripts / skills）
 */

export const RECORDER_WEBMCP_KEY = 'local:recorder-webmcp-tools'

/** 执行时从工具 args 取值 */
export type ParamRef = { $param: string }

export function isParamRef(value: unknown): value is ParamRef {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as ParamRef).$param === 'string' &&
    !!(value as ParamRef).$param
  )
}

export type RecorderStep =
  | { op: 'setViewport'; width: number; height: number }
  | { op: 'goto'; url: string | ParamRef; timeout?: number }
  | {
      op: 'click'
      selectors: string[]
      offset?: { x: number; y: number }
      timeout?: number
    }
  | { op: 'hover'; selectors: string[]; timeout?: number }
  | {
      op: 'scroll'
      selectors?: string[]
      direction?: 'up' | 'down'
      timeout?: number
    }
  | {
      op: 'type' | 'fill'
      selectors: string[]
      text: string | ParamRef
      timeout?: number
    }

export interface RecorderWebmcpTool {
  id: string
  /** Agent 调用名，建议 recorder_ 前缀 */
  name: string
  title: string
  description: string
  matches: string[]
  enabled: boolean
  inputSchema: Record<string, unknown>
  steps: RecorderStep[]
  /** 原始 Recorder 源码备份（可选） */
  sourceBackup?: string
  updatedAt: number
}

export type RecorderWebmcpStore = Record<string, RecorderWebmcpTool>

export type RecorderWebmcpToolInput = Omit<RecorderWebmcpTool, 'id' | 'updatedAt'> & {
  id?: string
}

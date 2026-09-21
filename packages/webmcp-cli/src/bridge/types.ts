/**
 * 统一领域模型与核心类型定义
 */

export interface TabItem {
  tabId: number
  title?: string
  url?: string
  active?: boolean
}

export interface WebmcpToolSummary {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export interface BrowserStateResult {
  url?: string
  title?: string
  activeTabId?: number
  tabs: TabItem[]
  webmcpTools: WebmcpToolSummary[]
}

export interface SubAgentRunOptions {
  tabId?: number
  maxSteps?: number
  timeoutMs?: number
}

export interface SubAgentRunResult {
  success: boolean
  status?: string
  data?: string
  history?: unknown[]
  error?: string
}

export interface SkillSummary {
  name: string
  description: string
  resourceCount?: number
  source?: 'builtin' | 'user'
  metadata?: Record<string, unknown>
}

export interface SkillDetail {
  name: string
  description: string
  instructions: string
  metadata?: Record<string, unknown>
  resources?: Array<{
    path: string
    kind: string
    size?: number
    mimeType?: string
  }>
}

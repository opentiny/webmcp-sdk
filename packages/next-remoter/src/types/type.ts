import { IAgentModelProviderLlmConfig } from '@opentiny/next-sdk'
import { PluginInfo } from '@opentiny/tiny-robot'

// 类型定义
export interface StreamPart {
  type: string
  text?: string
  delta?: string
  id?: string
  toolName?: string
  toolCallId?: string
}

export type ICustomAgentModelProviderLlmConfig = IAgentModelProviderLlmConfig & {
  model: string
  maxSteps?: number
  providerOptions?: Record<string, any>
  extraTools?: Record<string, any>
}

export type ICustomMarketMcpServers = PluginInfo[]

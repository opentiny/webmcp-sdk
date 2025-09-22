import { IAgentModelProviderLlmConfig } from '@opentiny/next-sdk'

// 类型定义
export interface StreamPart {
  type: string
  text?: string
  delta?: string
  id?: string
  toolName?: string
  toolCallId?: string
}

export interface ICustomAgentModelProviderLlmConfig extends IAgentModelProviderLlmConfig {
  model: string
  maxSteps: number
}

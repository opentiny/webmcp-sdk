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
  error?: {
    message: string
  }
}

export type ICustomAgentModelProviderLlmConfig = IAgentModelProviderLlmConfig & {
  model: string
  maxSteps?: number
  providerOptions?: Record<string, any>
  extraTools?: Record<string, any>
  /**
   * 自定义请求 Header，会在创建 Provider 实例时透传给 ai-sdk
   * 适用于需要在每次请求时携带特定 Header 的场景（如鉴权、链路追踪等）
   */
  headers?: Record<string, string>
  /**
   * 在 chatStream 调用前执行的钩子函数
   * 可用于修改消息内容，例如自动添加截图
   * @param lastUserMsg 最后一条用户消息
   * @param systemPrompt 当前系统提示词
   * @returns 修改后的用户消息（可以是多模态消息）
   */
  beforeChatStream?: (lastUserMsg: any, systemPrompt: string) => Promise<any> | any
}

export type ICustomMarketMcpServers = PluginInfo[]

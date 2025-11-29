export type { experimental_MCPClient as MCPClient } from 'ai'
import type { ProviderV2 } from '@ai-sdk/provider'
import type { MCPTransport } from 'ai'

type ProviderFactory = 'openai' | 'deepseek' | ((options: any) => ProviderV2)

type LlmFactoryConfig = {
  /** API密钥 */
  apiKey: string
  /** API基础URL */
  baseURL: string
  /** 内置或自定义 Provider 工厂函数 */
  providerType: ProviderFactory
  /** 互斥：当使用 providerType 分支时不允许传入 llm */
  llm?: never
}

type LlmInstanceConfig = {
  /** 自定义 Provider 实例，优先级最高 */
  llm: ProviderV2
  /** 互斥：当传入 llm 实例时不需要 apiKey/baseURL/providerType */
  apiKey?: never
  baseURL?: never
  providerType?: never
}

/** 代理模型提供器的大语言配置对象, 通过 XOR 表达二选一 */
export type IAgentModelProviderLlmConfig = LlmFactoryConfig | LlmInstanceConfig

/** Mcp Server的配置对象 */
export type McpServerConfig =
  | { type: 'streamableHttp'; url: string; useAISdkClient?: boolean }
  | { type: 'sse'; url: string; useAISdkClient?: boolean }
  | { type: 'extension'; url: string; sessionId: string; useAISdkClient?: boolean }
  | { transport: MCPTransport; useAISdkClient?: boolean }

/** */
export interface IAgentModelProviderOption {
  /** 代理模型提供器的大语言配置对象 */
  llmConfig: IAgentModelProviderLlmConfig
  /** Mcp Server的配置对象的集合，键为服务器名称，值为配置对象 */
  mcpServers?: Record<string, McpServerConfig>
}

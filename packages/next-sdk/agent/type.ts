import type { ProviderV2 } from '@ai-sdk/provider'
import type { MCPClientConfig } from '@ai-sdk/mcp'

// 从 MCPClientConfig 中提取 transport 类型
export type MCPTransport = MCPClientConfig['transport']

/**
 * 浏览器内置 WebMCP 测试 API 接口 (如 document.modelContext)
 */
export interface BuiltinMcpClient {
  listTools?: () => Promise<any[]>
  getTools?: () => Promise<any[]>
  executeTool: (tool: any, input: string) => Promise<any>
  registerTool?: (config: { name: string; execute: (input: any) => Promise<any> | any; [key: string]: any }) => void
  unregisterTool?: (name: string) => void
}

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
  /** 是否使用 ReAct 模式（通过提示词而非 function calling 进行工具调用），默认为 false */
  useReActMode?: boolean
}

type LlmInstanceConfig = {
  /** 自定义 Provider 实例，优先级最高 */
  llm: ProviderV2
  /** 互斥：当传入 llm 实例时不需要 apiKey/baseURL/providerType */
  apiKey?: never
  baseURL?: never
  providerType?: never
  /** 是否使用 ReAct 模式（通过提示词而非 function calling 进行工具调用），默认为 false */
  useReActMode?: boolean
}

/** 代理模型提供器的大语言配置对象, 通过 XOR 表达二选一 */
export type IAgentModelProviderLlmConfig = LlmFactoryConfig | LlmInstanceConfig

/** Mcp Server的配置对象 */
export type McpServerConfig =
  | {
      type: 'streamableHttp'
      url: string
      useAISdkClient?: boolean
      headers?: Record<string, string>
      name?: string
      description?: string
    }
  | {
      type: 'sse'
      url: string
      useAISdkClient?: boolean
      headers?: Record<string, string>
      name?: string
      description?: string
    }
  | {
      type: 'extension'
      url: string
      sessionId: string
      useAISdkClient?: boolean
      headers?: Record<string, string>
      name?: string
      description?: string
    }
  | { type: 'local'; transport: MCPTransport; useAISdkClient?: boolean; name?: string; description?: string }
  | {
      /**
       * 浏览器内置 WebMCP 类型。
       * 将 `document.modelContext` 作为 MCP 工具数据源，
       * 通过 `getBuiltinMcpTools` 适配为 ai-sdk 可调用的 ToolSet。
       */
      type: 'builtin'
      /** 传入 `document.modelContext` 对象 */
      client: BuiltinMcpClient
      name?: string
      description?: string
    }

/** */
export interface IAgentModelProviderOption {
  /** 代理模型提供器的大语言配置对象 */
  llmConfig: IAgentModelProviderLlmConfig
  /** Mcp Server的配置对象的集合，键为服务器名称，值为配置对象 */
  mcpServers?: Record<string, McpServerConfig>
}

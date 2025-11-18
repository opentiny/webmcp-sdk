import type { ChatCompletionResponse } from '@opentiny/tiny-robot-kit'
import type { ChatCompletionRequest } from '@opentiny/tiny-robot-kit'
import type { StreamHandler } from '@opentiny/tiny-robot-kit'
import { BaseModelProvider } from '@opentiny/tiny-robot-kit'
import type { AIModelConfig } from '@opentiny/tiny-robot-kit'
import { type Ref } from 'vue'
import { AgentModelProvider, McpServerConfig, IAgentModelProviderOption } from '@opentiny/next-sdk'
import { getToday } from './tools'
import type { ICustomAgentModelProviderLlmConfig, StreamPart } from '../types/type'

// 配置常量
const DEFAULT_CONFIG: ICustomAgentModelProviderLlmConfig = {
  apiKey: 'sk-trial',
  baseURL: 'https://agent.opentiny.design/api/v1/ai',
  providerType: 'deepseek',
  model: 'deepseek-ai/DeepSeek-V3',
  maxSteps: 15,
  extraTools: {}
}

/** Tiny-robot 所需要的自定义大语言的Provider */
export class CustomAgentModelProvider extends BaseModelProvider {
  transport: any
  /** 一个 ai-sdk agent 封装 */
  agent: AgentModelProvider
  systemPrompt: string
  llmConfig: ICustomAgentModelProviderLlmConfig = DEFAULT_CONFIG

  constructor(
    config: AIModelConfig,
    sessionId: Ref<string>,
    agentRoot: Ref<string>,
    systemPrompt: string,
    llmConfig?: ICustomAgentModelProviderLlmConfig
  ) {
    super(config)

    const mergedConfig: ICustomAgentModelProviderLlmConfig = {
      ...DEFAULT_CONFIG,
      ...(llmConfig || {})
    }

    this.llmConfig = mergedConfig

    const options: IAgentModelProviderOption = {
      mcpServers: this.createMcpServers(sessionId.value, agentRoot.value),
      llmConfig: {
        apiKey: mergedConfig.apiKey,
        baseURL: mergedConfig.baseURL,
        providerType: mergedConfig.providerType,
        llm: mergedConfig.llm
      }
    }

    this.agent = new AgentModelProvider(options)
    this.systemPrompt = systemPrompt
  }

  /**
   * 创建MCP服务器配置
   * @param sessionId 会话ID，支持逗号分隔的多个ID
   * @param agentRoot 代理根路径
   * @returns MCP服务器配置对象，键为服务器名称，值为配置对象
   */
  private createMcpServers(sessionId: string, agentRoot: string): Record<string, McpServerConfig> {
    if (!sessionId) return {}

    const sessionIds = sessionId.includes(',') ? sessionId.split(',').map((id) => id.trim()) : [sessionId]

    const servers: Record<string, McpServerConfig> = {}
    sessionIds.forEach((id) => {
      servers[`mcp-server-${id}`] = {
        type: 'streamableHttp' as const,
        url: `${agentRoot}mcp?sessionId=${id}`
      }
    })
    return servers
  }

  /**
   * 处理文本流数据
   * @param part 流数据部分
   * @param handler 流处理器
   * @param textId 文本ID
   * @returns 更新后的文本ID
   */
  private handleTextStream(part: StreamPart, handler: StreamHandler, textId: number): number {
    if (part.type === 'text-start') {
      handler.onData({ type: 'text-start' } as any)
      textId++
      handler.onData({
        type: 'markdown',
        content: '',
        delta: '',
        textId
      } as any)
    } else if (part.type === 'text-delta') {
      handler.onData({
        type: 'markdown',
        delta: part.text,
        textId
      } as any)
    } else if (part.type === 'text-end') {
      handler.onData({
        type: 'markdown',
        delta: '\n\n ',
        textId
      } as any)

      handler.onData({ type: 'text-end' } as any)
    }
    return textId
  }

  /**
   * 处理工具流数据
   * @param part 流数据部分
   * @param handler 流处理器
   */
  private handleToolStream(part: StreamPart, handler: StreamHandler): void {
    const toolHandlers = {
      'tool-input-start': () =>
        handler.onData({
          type: 'tool',
          id: part.id,
          name: part.toolName,
          status: 'running',
          content: ''
        } as any),

      'tool-input-delta': () =>
        handler.onData({
          type: 'tool',
          id: part.id,
          status: 'running',
          delta: part.delta
        } as any),

      'tool-result': () =>
        handler.onData({
          type: 'tool',
          id: part.toolCallId,
          status: 'success',
          delta: ''
        } as any)
    }

    const handlerFn = toolHandlers[part.type as keyof typeof toolHandlers]
    if (handlerFn) {
      handlerFn()
    }
  }

  /**
   * 处理文本流数据
   * @param part 流数据部分
   * @param handler 流处理器
   * @param textId 文本ID
   * @returns 更新后的文本ID
   */
  private handleReasonStream(part: StreamPart, handler: StreamHandler, thinkId: number): number {
    if (part.type === 'reasoning-start') {
      thinkId++
      handler.onData({
        type: 'collapsible-text',
        title: '思考过程',
        content: '',
        delta: '',
        thinkId
      } as any)
    } else if (part.type === 'reasoning-delta') {
      handler.onData({
        type: 'collapsible-text',
        delta: part.text,
        thinkId
      } as any)
    } else if (part.type === 'reasoning-end') {
      handler.onData({
        type: 'collapsible-text',
        delta: ' ',
        thinkId
      } as any)
    }
    return thinkId
  }

  async chatStream(request: ChatCompletionRequest, handler: StreamHandler): Promise<void> {
    // 读取用户最新的请求
    const lastUserMsg = request.messages[request.messages.length - 1]
    if (!lastUserMsg) return

    // @ts-ignore
    const result = await this.agent.chatStream({
      message: lastUserMsg.content as string,
      model: this.llmConfig.model,
      system: this.systemPrompt,
      abortSignal: request.options?.signal,
      tools: { ['get-today']: getToday, ...(this.llmConfig.extraTools || {}) },
      maxSteps: this.llmConfig.maxSteps,
      providerOptions: this.llmConfig.providerOptions,
      onFinish: async () => {
        await this.agent.closeAll()
        handler.onDone()
      }
    })

    // 标识每一个markdown块
    let textId = 1
    let thinkId = 1
    for await (const part of result.fullStream) {
      // 开始节点处理
      if (part.type === 'start') {
        handler.onData({ type: 'start' } as any)
      }
      // 处理文本流数据
      if (part.type.startsWith('text-')) {
        textId = this.handleTextStream(part, handler, textId)
      }

      // 处理工具流数据
      else if (part.type.startsWith('tool-')) {
        this.handleToolStream(part, handler)
      }

      // 处理推理数据
      else if (part.type.startsWith('reasoning-')) {
        thinkId = this.handleReasonStream(part, handler, thinkId)
      }
    }
  }

  /** 同步请求不需要实现 */
  chat(_request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    throw new Error('Method not implemented.')
  }
}

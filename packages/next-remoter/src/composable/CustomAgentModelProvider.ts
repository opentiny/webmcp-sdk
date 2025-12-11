import type { ChatCompletionResponse } from '@opentiny/tiny-robot-kit'
import type { ChatCompletionRequest } from '@opentiny/tiny-robot-kit'
import type { StreamHandler } from '@opentiny/tiny-robot-kit'
import { BaseModelProvider } from '@opentiny/tiny-robot-kit'
import type { AIModelConfig } from '@opentiny/tiny-robot-kit'
import { type Ref } from 'vue'
import { AgentModelProvider, McpServerConfig, IAgentModelProviderOption } from '@opentiny/next-sdk'
import { getToday } from './tools'
import type { ICustomAgentModelProviderLlmConfig, StreamPart } from '../types/type'

const DEFAULT_SHARED_CONFIG = {
  model: 'deepseek-ai/DeepSeek-V3',
  maxSteps: 15,
  extraTools: {}
}

const DEFAULT_FACTORY_CONFIG = {
  apiKey: 'sk-trial',
  baseURL: 'https://agent.opentiny.design/api/v1/ai',
  providerType: 'deepseek' as const
}

/** Tiny-robot 所需要的自定义大语言的Provider */
export class CustomAgentModelProvider extends BaseModelProvider {
  transport: any
  /** 一个 ai-sdk agent 封装 */
  agent: AgentModelProvider
  systemPrompt: string
  llmConfig: ICustomAgentModelProviderLlmConfig = { ...DEFAULT_SHARED_CONFIG, ...DEFAULT_FACTORY_CONFIG }

  constructor(
    config: AIModelConfig,
    sessionId: Ref<string>,
    agentRoot: Ref<string>,
    systemPrompt: string,
    llmConfig?: ICustomAgentModelProviderLlmConfig
  ) {
    super(config)

    let mergedConfig: ICustomAgentModelProviderLlmConfig
    if (llmConfig && 'llm' in llmConfig) {
      mergedConfig = {
        ...DEFAULT_SHARED_CONFIG,
        ...llmConfig
      }
    } else {
      mergedConfig = {
        ...DEFAULT_SHARED_CONFIG,
        ...DEFAULT_FACTORY_CONFIG,
        ...(llmConfig || {})
      }
    }

    this.llmConfig = mergedConfig

    const llmConfigOption = mergedConfig.llm
      ? { llm: mergedConfig.llm }
      : {
          apiKey: mergedConfig.apiKey!,
          baseURL: mergedConfig.baseURL!,
          providerType: mergedConfig.providerType!
        }

    const options: IAgentModelProviderOption = {
      mcpServers: this.createMcpServers(sessionId.value, agentRoot.value),
      llmConfig: llmConfigOption
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

  /**
   * 清理消息数组中的旧快照消息，只保留最新的快照
   * @param messages 消息数组
   * @returns 清理后的消息数组
   */
  private cleanupOldSnapshotsInMessages(messages: any[]): any[] {
    if (!messages || messages.length === 0) return messages

    // 检查最后一项是否是 tool 角色且包含快照信息
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'tool') {
      return messages
    }

    // 判断最后一项是否包含快照信息
    if (!this.isSnapshotContent(lastMessage.content)) {
      return messages
    }

    // 创建消息数组的副本，避免直接修改原数组
    const cleanedMessages = [...messages]

    // 从倒数第二项开始往前查找，找到最后一次 tool 调用（除了最后一项）
    // 因为最后一项是当前步骤的新快照，需要保留
    for (let i = cleanedMessages.length - 2; i >= 0; i--) {
      const msg = cleanedMessages[i] as any
      if (msg.role === 'tool' && this.isSnapshotContent(msg.content)) {
        // 找到旧的快照消息，替换为占位符
        this.replaceSnapshotWithPlaceholder(msg)
        break // 只清理最后一次快照，找到后退出
      }
    }

    return cleanedMessages
  }

  /**
   * 将快照消息替换为占位符
   * @param msg 消息对象
   */
  private replaceSnapshotWithPlaceholder(msg: any): void {
    if (Array.isArray(msg.content)) {
      // 如果是数组格式，替换所有文本内容为占位符
      // 检查是否是 MCP 工具返回格式（有 output.value.content）
      const firstItem = msg.content[0]
      if (firstItem?.output?.value?.content) {
        // MCP 工具返回格式，替换 content
        msg.content = [
          {
            ...firstItem,
            output: {
              ...firstItem.output,
              value: {
                ...firstItem.output.value,
                content: [
                  {
                    type: 'text',
                    text: '历史快照不予保留'
                  }
                ]
              }
            }
          }
        ]
      } else {
        // 普通数组格式
        msg.content = [
          {
            type: 'text',
            text: '历史快照不予保留'
          }
        ]
      }
    } else if (typeof msg.content === 'string') {
      // 如果是字符串格式，直接替换
      msg.content = '历史快照不予保留'
    }
  }

  /**
   * 判断内容是否包含快照信息
   * @param content 消息内容（可能是字符串或数组）
   * @returns 是否包含快照信息
   */
  private isSnapshotContent(content: any): boolean {
    if (!content) return false

    // 快照相关的关键词
    const snapshotKeywords = [
      '无障碍树快照',
      'takeSnapshot',
      'snapshotId_counter',
      'UID 格式',
      '快照 ID',
      '操作后的页面快照',
      '已成功获取页面无障碍树快照',
      '快照内容：'
    ]

    // 如果是字符串格式
    if (typeof content === 'string') {
      return snapshotKeywords.some((keyword) => content.includes(keyword))
    }

    // 如果是数组格式（MCP 工具返回格式）
    if (Array.isArray(content)) {
      for (const item of content) {
        const text = item?.output?.value?.content?.[0]?.text
        if (text) {
          if (snapshotKeywords.some((keyword) => text.includes(keyword))) {
            return true
          }
        }
      }
    }

    return false
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
      prepareStep: ({ messages }) => {
        // 在步骤开始前清理旧的快照消息
        // prepareStep 会在每次步骤开始前被调用，可以修改即将用于请求的 messages
        const cleanedMessages = this.cleanupOldSnapshotsInMessages(messages)
        return {
          messages: cleanedMessages
        }
      },
      onFinish: async () => {
        await this.agent.closeAll()
        handler.onDone()
      }
    })

    // 标识每一个markdown块
    let textId = 1
    let thinkId = 1
    for await (const part of result.fullStream) {
      // 处理错误， 暂时模拟 AI 回复消息。 TODO: robot 设计出错效果
      if (part.type === 'error') {
        const message = part.error?.data?.error?.message || part.error?.message || '访问大模型出错'
        handler.onData({
          type: 'markdown',
          content: '',
          delta: '',
          textId
        } as any)

        handler.onData({
          type: 'markdown',
          delta: message,
          textId
        } as any)
        handler.onError(message)
      }

      // 开始节点处理
      if (part.type.includes('start-') || part.type.includes('-start')) {
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

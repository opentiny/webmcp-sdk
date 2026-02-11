import type { ChatCompletionResponse } from '@opentiny/tiny-robot-kit'
import type { ChatCompletionRequest } from '@opentiny/tiny-robot-kit'
import type { StreamHandler } from '@opentiny/tiny-robot-kit'
import { BaseModelProvider } from '@opentiny/tiny-robot-kit'
import type { AIModelConfig } from '@opentiny/tiny-robot-kit'
import { nextTick, watch, type Ref } from 'vue'
import { AgentModelProvider, IAgentModelProviderOption } from '@opentiny/next-sdk'
import { getToday } from './tools'
import type { ICustomAgentModelProviderLlmConfig } from '../types/type'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { createOpenAI } from '@ai-sdk/openai'
import type { ProviderV2 } from '@ai-sdk/provider'
import type { OpenAIProvider } from '@ai-sdk/openai'
import { GENUI_CONFIG } from '../config/genui-config'
import { StreamVisitor } from './streamVisitor'
import { extractTextAndJson } from './handleSchema'
import { DelayedPromise } from '@ai-sdk/provider-utils'

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
  /** 生成式UI启用状态 */
  isGenuiEnabled?: Ref<boolean>

  constructor(config: AIModelConfig, systemPrompt: string, llmConfig?: ICustomAgentModelProviderLlmConfig) {
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

    const llmConfigOption = mergedConfig.llm ? { llm: mergedConfig.llm } : { ...mergedConfig }

    const options: IAgentModelProviderOption = {
      llmConfig: llmConfigOption
    }

    this.agent = new AgentModelProvider(options)
    this.systemPrompt = systemPrompt
  }

  /**
   * 更新大语言模型配置
   * Update LLM configuration
   * @param modelId 模型ID
   * @param apiUrl API地址
   * @param apiKey API密钥
   * @param providerType 提供商类型
   * @param useReActMode 是否使用 ReAct 模式
   */
  updateLLMConfig({
    modelId,
    baseURL,
    apiKey,
    providerType,
    useReActMode,
    llm
  }: {
    modelId: string
    baseURL?: string
    apiKey?: string
    providerType?: 'deepseek' | 'openai' | ((options: any) => ProviderV2)
    useReActMode?: boolean
    llm?: ProviderV2
  }) {
    if (llm) {
      this.agent.llm = llm
      this.llmConfig.model = modelId
      this.llmConfig.useReActMode = useReActMode || false
      this.agent.useReActMode = useReActMode || false
    } else if (providerType && baseURL && apiKey) {
      // 如果启用了生成式UI，在 baseURL 后面加上 '/prompt'
      if (this.isGenuiEnabled?.value) {
        // 如果 baseURL 还没有包含 '/prompt'，则添加
        if (!baseURL.includes('/prompt')) {
          baseURL = baseURL + '/prompt'
        }
      } else {
        // 如果关闭了生成式UI，移除 '/prompt' 后缀
        baseURL = baseURL.replace('/prompt', '')
      }

      // 更新本地配置
      this.llmConfig.model = modelId
      this.llmConfig.apiKey = apiKey
      this.llmConfig.baseURL = baseURL
      this.llmConfig.providerType = providerType
      this.llmConfig.useReActMode = useReActMode || false
      this.agent.useReActMode = useReActMode || false

      // 根据 providerType 创建新的 llm 实例
      let providerFn: (options: { apiKey: string; baseURL: string }) => ProviderV2 | OpenAIProvider

      if (providerType === 'deepseek') {
        providerFn = createDeepSeek
      } else if (providerType === 'openai') {
        providerFn = createOpenAI
      } else if (typeof providerType === 'function') {
        providerFn = providerType
      } else {
        throw new Error(`Unsupported providerType: ${providerType}`)
      }

      this.agent.llm = providerFn({ apiKey, baseURL })
    }
  }

  /**
   * 清理消息数组中的旧快照消息，只保留最新的快照
   * @param messages 消息数组
   * @returns 清理后的消息数组
   */
  private cleanupOldSnapshotsInMessages(messages: any[]): any[] {
    if (!messages || messages.length === 0) return messages

    // 检查是否启用 ReAct 模式（统一使用 agent.useReActMode 来判断）
    // Check if ReAct mode is enabled (use agent.useReActMode for unified judgment)
    const isReActMode = this.agent.useReActMode === true

    // 在 ReAct 模式下，工具结果作为 user 消息添加；否则作为 tool 消息添加
    const expectedRole = isReActMode ? 'user' : 'tool'

    // 检查最后一项是否是预期角色且包含快照信息
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== expectedRole) {
      return messages
    }

    // 判断最后一项是否包含快照信息
    if (!this.isSnapshotContent(lastMessage.content)) {
      return messages
    }

    // 创建消息数组的副本，避免直接修改原数组
    const cleanedMessages = [...messages]

    // 从倒数第二项开始往前查找，找到最后一次快照消息（除了最后一项）
    // 因为最后一项是当前步骤的新快照，需要保留
    for (let i = cleanedMessages.length - 2; i >= 0; i--) {
      const msg = cleanedMessages[i] as any
      // 在 ReAct 模式下检查 user 角色，否则检查 tool 角色
      if (msg.role === expectedRole && this.isSnapshotContent(msg.content)) {
        // 找到旧的快照消息，仅保留其文本并移除图片
        this.replaceSnapshotWithPlaceholder(msg)
      }
    }

    return cleanedMessages
  }

  /**
   * 从文本中移除快照数据，保留操作信息
   * @param text 原始文本
   * @returns 清理后的文本
   */
  private removeSnapshotData(text: string): string {
    if (!text) return text

    // 快照开始的标记词
    const snapshotMarkers = [
      '无障碍树快照:',
      '无障碍树快照：',
      '快照内容:',
      '快照内容：',
      '页面无障碍树快照:',
      '页面无障碍树快照：',
      '操作后的页面快照:',
      '操作后的页面快照：'
    ]

    // 查找快照标记的位置
    let snapshotStartIndex = -1
    for (const marker of snapshotMarkers) {
      const index = text.indexOf(marker)
      if (index !== -1) {
        snapshotStartIndex = index
        break
      }
    }

    // 如果找到快照标记，删除从标记开始到结尾的内容
    if (snapshotStartIndex !== -1) {
      // 保留标记之前的内容，并添加占位符
      const beforeSnapshot = text.substring(0, snapshotStartIndex).trim()
      return beforeSnapshot ? `${beforeSnapshot} 📸 [历史快照已清理]` : '📸 历史快照已清理'
    }

    // 如果没有明确的标记，但包含快照关键词，可能整个文本都是快照
    // 检查是否是纯快照内容（以快照关键词开头）
    const pureSnapshotStarts = ['已成功获取页面无障碍树快照', 'takeSnapshot', 'snapshotId_counter']

    for (const start of pureSnapshotStarts) {
      if (text.startsWith(start)) {
        return '📸 历史快照已清理'
      }
    }

    // 没有找到快照标记，返回原文本
    return text
  }

  /**
   * 清理消息中的快照信息，旨在保留文本但移除图片以节省 token
   * @param msg 消息对象
   */
  private replaceSnapshotWithPlaceholder(msg: any): void {
    if (Array.isArray(msg.content)) {
      // 检查是否是 MCP 工具返回格式 (Tiny Robot Kit 包装后的格式)
      const firstItem = msg.content[0]
      if (firstItem?.output?.value?.content) {
        const innerContent = firstItem.output.value.content
        if (Array.isArray(innerContent)) {
          // 处理内容：移除图片，检查文本是否包含快照并替换
          firstItem.output.value.content = innerContent
            .map((item: any) => {
              // 移除图片类型
              if (item.type === 'image' || item.type === 'image_url') {
                return null
              }
              // 检查文本类型是否包含快照信息
              if (item.type === 'text' && item.text && this.isSnapshotContent(item.text)) {
                // 移除快照数据，保留操作信息
                const cleanedText = this.removeSnapshotData(item.text)
                return { type: 'text', text: cleanedText }
              }
              // 保留其他内容
              return item
            })
            .filter((item: any) => item !== null) // 移除被标记为 null 的项
        }
        // 如果 MCP 返回结果中包含单独的 screenshot 字段，也予以移除
        if (firstItem.output.value.screenshot) {
          delete firstItem.output.value.screenshot
        }
      } else {
        // 普通多模态数组格式 (AI SDK 风格)
        // 过滤掉所有图片部分，只保留文本部分
        msg.content = msg.content.filter((item: any) => item.type !== 'image' && item.type !== 'image_url')
      }
    } else if (typeof msg.content === 'string') {
      // 字符串格式：检查是否包含无障碍树快照
      // 如果包含快照信息，移除快照数据但保留操作信息
      if (this.isSnapshotContent(msg.content)) {
        msg.content = this.removeSnapshotData(msg.content)
      }
      // 如果是纯文本（不含快照），保持不变
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

    // 如果是数组格式（MCP 工具返回格式 或 多模态消息）
    if (Array.isArray(content)) {
      for (const item of content) {
        // 1. 检查 MCP 工具返回格式
        const textMcp = item?.output?.value?.content?.[0]?.text
        if (textMcp && snapshotKeywords.some((keyword) => textMcp.includes(keyword))) {
          return true
        }

        // 2. 检查多模态文本消息
        if (item.type === 'text' && item.text) {
          if (snapshotKeywords.some((keyword) => item.text.includes(keyword))) {
            return true
          }
        }

        // 3. 检查是否有图片内容
        if (item.type === 'image' || item.type === 'image_url') {
          return true
        }
      }
    }

    return false
  }

  async chatStream(request: ChatCompletionRequest, handler: StreamHandler): Promise<void> {
    // 读取用户最新的请求
    let lastUserMsg = request.messages[request.messages.length - 1]
    if (!lastUserMsg) return

    // 执行 beforeChatStream 钩子（如果存在）
    // 注意：钩子返回的修改后的消息用于传递给 AI SDK，不影响 UI 显示
    if (this.llmConfig.beforeChatStream) {
      try {
        const modifiedMsg = await this.llmConfig.beforeChatStream(lastUserMsg, this.systemPrompt)
        if (modifiedMsg) {
          lastUserMsg = modifiedMsg
        }
      } catch (error) {
        console.error('[beforeChatStream] 钩子执行失败:', error)
      }
    }

    const chatStreamOptions: any = {
      model: this.llmConfig.model,
      system: this.systemPrompt,
      abortSignal: request.options?.signal,
      // toolChoice: 'auto' | 'none' | 'required'
      toolChoice: 'auto',
      tools: { ['get-today']: getToday, ...(this.llmConfig.extraTools || {}) },
      maxSteps: this.llmConfig.maxSteps,
      providerOptions: this.llmConfig.providerOptions || GENUI_CONFIG,
      prepareStep: ({ messages }: { messages: any[] }) => {
        // 在步骤开始前清理旧的快照消息
        // prepareStep 会在每次步骤开始前被调用，可以修改即将用于请求的 messages
        const cleanedMessages = this.cleanupOldSnapshotsInMessages(messages)
        return {
          messages: cleanedMessages
        }
      },
      onFinish: async () => {
        await this.agent.closeAll()
      }
    }

    // 构建完整的消息数组，包含历史消息和当前用户消息
    const userMessage = {
      role: 'user' as const,
      content: lastUserMsg.content // 多模态消息：Array<TextPart | ImagePart> 或 string
    }

    // 清理消息：只保留 AI SDK 需要的字段（role 和 content）
    // 这样可以确保即使 responseMessages 中包含额外字段（如 uiContent），也不会传递给 AI SDK
    const cleanMessages = (messages: any[]) => {
      return messages.map((msg) => ({
        role: msg.role,
        content: msg.content
      }))
    }

    // 始终使用 messages 参数，确保包含所有历史消息上下文
    const allMessages = [...cleanMessages(this.agent.responseMessages), userMessage]
    chatStreamOptions.messages = allMessages

    const result = await this.agent.chatStream(chatStreamOptions)

    // 待返回的promise对象，用户阻塞住函数立即返回。
    const dp = new DelayedPromise<void>()
    const visitor = new StreamVisitor({
      debug: false,
      onFinish: () => {
        nextTick(() => {
          dp.resolve()
          handler.onDone()
        })
      }
    })
    const streamContent = await visitor.traverse(result)

    const defaultMessage = {
      role: 'assistant',
      content: '',
      uiContent: []
    }
    watch(
      streamContent,
      (value) => {
        if (!value) {
          handler.onData(defaultMessage)
        } else {
          let contents = value.steps.map((step) => step.contents).flat()
          const uiContent = contents.map((content) => {
            if (content.type === 'text') {
              return extractTextAndJson(content.text)
            } else if (content.type === 'reasoning') {
              return {
                type: 'collapsible-text',
                title: '思考过程',
                content: content.text,
                thinkId: content.id
              }
            } else if (content.type === 'tool') {
              return {
                type: 'tool',
                id: content.id,
                name: content.toolName,
                content: JSON.stringify({ input: content.inputStr, output: content.output }),
                status: content.error ? 'failed' : content.running ? 'running' : 'success'
              }
            }
          })

          if (value?.error) {
            const errorMsg = {
              type: 'markdown',
              content: `**错误**：${value.error.message || '未知错误'}`
            }
            uiContent.push(errorMsg)
          }

          // 有确定消息时，才返回onData， 避免白块的出现和loading太快，看不到
          if (value.steps.length >= 1) {
            handler.onData({
              ...defaultMessage,
              uiContent: uiContent.flat(),
              usage: value.totalUsage || null
            })
          }
        }
      },
      { deep: true }
    )

    return dp.promise
  }

  /** 同步请求不需要实现 */
  chat(_request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    throw new Error('Method not implemented.')
  }
}

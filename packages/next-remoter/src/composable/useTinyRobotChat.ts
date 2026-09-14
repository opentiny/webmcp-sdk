import { onMounted, onUnmounted, ref, reactive, computed, getCurrentInstance, type Ref } from 'vue'
import { CustomAgentModelProvider } from './CustomAgentModelProvider'
import { TrSender } from '@opentiny/tiny-robot'
import type { ICustomAgentModelProviderLlmConfig } from '../types/type'
import type {
  ChatRuntime,
  ChatSendPayload,
  ChatConversationInfo,
  ChatModelRuntime,
  ChatMcpRuntime,
  ChatMcpToolInfo,
  ChatModelOption
} from '@opentiny/tiny-robot-chat'
import type { PluginInfo } from '@opentiny/tiny-robot'
import type { UnifiedModelConfig } from '../types/model-config'
import { STATUS, GeneratingStatus } from '../const'

interface useTinyRobotOption {
  systemPrompt: string
  llmConfig?: ICustomAgentModelProviderLlmConfig
  emit: (e: string, ...args: any[]) => void
  modelOptions?: {
    llmConfigs?: Ref<UnifiedModelConfig[] | undefined>
    selectedModelId?: Ref<string | undefined>
  }
  mcpOptions?: {
    installedPlugins?: Ref<PluginInfo[]>
    enabledTools?: Ref<Record<string, boolean> | undefined>
    onToggleTool?: (data: { serverName: string; toolName: string; enabled: boolean }) => void
  }
}

/**
 * 消息内容类型（AI SDK 标准格式）
 */
type MessageContent = string | Array<{ type: 'text'; text: string } | { type: 'image'; image: string }>

/**
 * UI 消息类型（包含 uiContent 字段用于界面显示）
 */
export interface UIMessage {
  role: 'user' | 'assistant'
  content: MessageContent
  reasoning_content?: string
  tool_calls?: any[]
  state?: {
    open?: boolean
    thinking?: boolean
  }
  uiContent?: Array<{ type: 'text'; text?: string; content?: string } | { type: 'image'; url?: string; content?: string } | any>
}

interface ConversationItem extends ChatConversationInfo {
  id: string
  title: string
  createdAt?: number
  updatedAt?: number
  messages: UIMessage[]
  aiSdkMessages: any[]
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

export const useTinyRobotChat = ({
  systemPrompt,
  llmConfig,
  emit,
  modelOptions,
  mcpOptions
}: useTinyRobotOption) => {
  const customAgentProvider = new CustomAgentModelProvider({ provider: 'custom' }, systemPrompt, llmConfig, emit)

  // 消息列表与状态
  const messages = ref<UIMessage[]>([])
  const messageState = reactive({
    status: STATUS.IDLE as string
  })
  const inputMessage = ref<string>('')
  const senderRef = ref<InstanceType<typeof TrSender>>()

  // 会话状态管理
  const conversationState = reactive<{
    currentId: string
    conversations: ConversationItem[]
  }>({
    currentId: '',
    conversations: []
  })

  // 获取当前激活会话
  const getCurrentConversation = (): ConversationItem | undefined => {
    return conversationState.conversations.find((c) => c.id === conversationState.currentId)
  }

  // 保存当前消息到当前会话
  const syncCurrentConversationMessages = () => {
    const current = getCurrentConversation()
    if (current) {
      current.messages = [...messages.value]
      current.updatedAt = Date.now()
    }
  }

  // 创建新会话
  const createConversation = (title = '新会话'): ConversationItem => {
    syncCurrentConversationMessages()
    const id = generateId()
    const newConv: ConversationItem = {
      id,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      aiSdkMessages: []
    }
    conversationState.conversations.unshift(newConv)
    conversationState.currentId = id
    messages.value = []
    customAgentProvider.agent.responseMessages = newConv.aiSdkMessages
    return newConv
  }

  // 切换会话
  const switchConversation = (id: string): ConversationItem | null => {
    if (!id || id === conversationState.currentId) {
      return getCurrentConversation() || null
    }
    syncCurrentConversationMessages()
    const target = conversationState.conversations.find((c) => c.id === id)
    if (!target) return null

    conversationState.currentId = id
    messages.value = [...target.messages]
    customAgentProvider.agent.responseMessages = target.aiSdkMessages || []
    return target
  }

  // 删除会话
  const deleteConversation = (id: string): void => {
    const index = conversationState.conversations.findIndex((c) => c.id === id)
    if (index === -1) return

    conversationState.conversations.splice(index, 1)
    if (conversationState.currentId === id) {
      if (conversationState.conversations.length > 0) {
        switchConversation(conversationState.conversations[0].id)
      } else {
        createConversation('新会话')
      }
    }
  }

  // 更新会话标题
  const updateTitle = (id: string, title?: string): void => {
    const conv = conversationState.conversations.find((c) => c.id === id)
    if (conv && title) {
      conv.title = title
      conv.updatedAt = Date.now()
    }
  }

  // 取消当前请求
  const abortRequest = async (): Promise<void> => {
    await customAgentProvider.agent.closeAll()
    messageState.status = STATUS.IDLE
  }

  // 手动添加消息
  const addMessage = (msg: UIMessage) => {
    messages.value.push(msg)
    syncCurrentConversationMessages()
  }

  // 核心发送请求逻辑
  const send = async () => {
    if (messageState.status === STATUS.PROCESSING) {
      console.warn('Cannot send message while processing')
      return
    }

    messageState.status = STATUS.PROCESSING

    const assistantMsg = reactive<UIMessage & { id: string }>({
      id: generateId(),
      role: 'assistant',
      content: '',
      uiContent: []
    })
    messages.value.push(assistantMsg as any)

    try {
      await customAgentProvider.chatStream(
        {
          messages: messages.value.filter((m: any) => m !== assistantMsg) as any
        },
        {
          onData: (data: any) => {
            emit('before-ai-render', data)
            if (data.uiContent !== undefined) {
              assistantMsg.uiContent = data.uiContent

              const uiItems = Array.isArray(data.uiContent) ? data.uiContent : [data.uiContent]
              const textParts: string[] = []
              const cardParts: any[] = []
              const reasoningParts: string[] = []

              for (const item of uiItems) {
                if (!item) continue
                if (item.type === 'markdown' || item.type === 'text') {
                  const text = item.content ?? item.text ?? ''
                  if (text) textParts.push(text)
                } else if (item.type === 'schema-card' || item.type === 'genui') {
                  cardParts.push(item)
                } else if (item.type === 'collapsible-text' || item.type === 'reasoning') {
                  if (item.content) {
                    reasoningParts.push(item.content)
                  }
                } else if (item.type === 'tool') {
                  // 工具调用不作为手写文本硬编码拼入正文，避免污染和割裂 Markdown 回复排版
                  // 保持正文输出流畅自然、纯净连贯
                } else if (typeof item === 'string') {
                  textParts.push(item)
                } else {
                  cardParts.push(item)
                }
              }

              if (reasoningParts.length > 0) {
                // 清理首尾空白和多余换行，确保思维链第一行文字与时间线圆点平齐对齐，排版整洁
                const combinedReasoning = reasoningParts
                  .map((p) => (typeof p === 'string' ? p.trim() : ''))
                  .filter(Boolean)
                  .join('\n\n')
                  .trim()
                if (combinedReasoning) {
                  assistantMsg.reasoning_content = combinedReasoning
                  assistantMsg.state = {
                    open: true,
                    thinking: GeneratingStatus.includes(messageState.status)
                  }
                }
              }

              const fullText = textParts.join('')
              if (cardParts.length > 0) {
                assistantMsg.content = [
                  ...(fullText ? [{ type: 'text', text: fullText }] : []),
                  ...cardParts
                ]
              } else {
                assistantMsg.content = fullText
              }
            } else if (data.content !== undefined) {
              assistantMsg.content = data.content
            }
          },
          onDone: () => {
            messageState.status = STATUS.IDLE
            if (assistantMsg.state) {
              assistantMsg.state.thinking = false
            }
            syncCurrentConversationMessages()
          },
          onError: (err: any) => {
            console.error('[useTinyRobotChat] Stream error:', err)
            messageState.status = STATUS.ERROR
            syncCurrentConversationMessages()
          }
        }
      )
    } catch (error) {
      console.error('[useTinyRobotChat] Send failed:', error)
      messageState.status = STATUS.ERROR
    } finally {
      if (messageState.status === STATUS.PROCESSING) {
        messageState.status = STATUS.IDLE
      }
      syncCurrentConversationMessages()
    }
  }

  // 发送消息入口（包装 skills 和附件）
  const handleSendMessage = async (
    _inputValue: string,
    attachmentsContent?: any[],
    skillProcessor?: (inputValue: string) => Promise<{ shouldBlock: boolean }>
  ): Promise<boolean> => {
    if (skillProcessor) {
      const { shouldBlock } = await skillProcessor(_inputValue)
      if (shouldBlock) {
        return false
      }
    }

    inputMessage.value = _inputValue

    // 第一次发送时，修改会话标题
    const conv = getCurrentConversation()
    if (conv && conv.title === '新会话' && inputMessage.value.trim()) {
      updateTitle(conv.id, inputMessage.value.trim().slice(0, 15))
    }

    if (attachmentsContent && attachmentsContent.length > 0) {
      const messageContent = [{ type: 'text', text: inputMessage.value }, ...attachmentsContent]
      const uiContent: any[] = []

      if (inputMessage.value) {
        uiContent.push({
          type: 'text',
          content: inputMessage.value
        })
      }

      for (const item of attachmentsContent) {
        if (item.type === 'image' && item.image) {
          uiContent.push({
            type: 'image',
            content: item.image
          })
        }
      }

      const message: UIMessage & { id: string } = {
        id: generateId(),
        role: 'user',
        content: messageContent,
        uiContent
      }
      messages.value.push(message as any)
      inputMessage.value = ''
      await send()
    } else {
      const message: UIMessage & { id: string } = {
        id: generateId(),
        role: 'user',
        content: inputMessage.value,
        uiContent: [
          {
            type: 'text',
            content: inputMessage.value
          }
        ]
      }
      messages.value.push(message as any)
      inputMessage.value = ''
      await send()
    }

    return true
  }

  const sendMessage = async (content: string) => {
    return await handleSendMessage(content)
  }

  // 1. 模型选择运行时适配器 (ChatModelRuntime)
  const modelRuntime = computed<ChatModelRuntime | undefined>(() => {
    if (!modelOptions?.llmConfigs?.value?.length) return undefined
    return {
      options: computed<readonly ChatModelOption[]>(() => {
        return (modelOptions.llmConfigs?.value || []).map((cfg) => ({
          id: cfg.id,
          label: cfg.label || (cfg as any).name || cfg.id,
          icon: cfg.icon as any
        }))
      }),
      selectedId: computed(() => modelOptions.selectedModelId?.value ?? null),
      features: computed(() => ({})),
      select: (id: string | null) => {
        if (modelOptions.selectedModelId) {
          modelOptions.selectedModelId.value = id ?? undefined
        }
      },
      setFeature: () => {},
      setReasoningEffort: () => {}
    }
  })

  // 2. WebMCP 插件/工具运行时适配器 (ChatMcpRuntime)
  const mcpRuntime = computed<ChatMcpRuntime | undefined>(() => {
    if (!mcpOptions?.installedPlugins?.value) return undefined
    return {
      servers: computed(() => {
        return (mcpOptions.installedPlugins?.value || []).map((p) => ({
          id: p.name,
          name: p.name,
          description: p.description,
          installed: true,
          enabled: p.enabled ?? true
        }))
      }),
      tools: computed(() => {
        const result: Record<string, ChatMcpToolInfo[]> = {}
        for (const p of mcpOptions.installedPlugins?.value || []) {
          result[p.name] = (p.tools || []).map((t) => ({
            id: t.name,
            name: t.name,
            description: t.description,
            enabled: mcpOptions.enabledTools?.value
              ? (mcpOptions.enabledTools.value[t.name] ?? (t.enabled ?? true))
              : (t.enabled ?? true)
          }))
        }
        return result
      }),
      addServer: async () => {},
      removeServer: async () => {},
      setServerEnabled: async (id: string, enabled: boolean) => {
        const p = mcpOptions.installedPlugins?.value?.find((item) => item.name === id)
        if (p) p.enabled = enabled
      },
      setToolEnabled: async (serverId: string, toolId: string, enabled: boolean) => {
        if (mcpOptions.enabledTools?.value) {
          mcpOptions.enabledTools.value[toolId] = enabled
        }
        mcpOptions.onToggleTool?.({ serverName: serverId, toolName: toolId, enabled })
      }
    }
  })

  // 构建符合 ChatRuntime 协议的标准对象
  const chatRuntime = computed<ChatRuntime>(() => ({
    conversations: computed(() => conversationState.conversations),
    activeConversation: computed(() => {
      const current = getCurrentConversation()
      if (!current) return null
      return {
        id: current.id,
        title: current.title,
        createdAt: current.createdAt,
        updatedAt: current.updatedAt,
        messages: messages.value as any,
        requestState: messageState.status === STATUS.PROCESSING ? 'processing' : 'idle',
        lastError: null
      }
    }),
    composer: {
      disabled: computed(() => messageState.status === STATUS.PROCESSING),
      submitDisabled: computed(() => messageState.status === STATUS.PROCESSING),
      model: modelRuntime.value,
      mcp: mcpRuntime.value
    },
    actions: {
      send: async (payload: ChatSendPayload) => {
        return await handleSendMessage(payload.text)
      },
      abort: async () => {
        await abortRequest()
      },
      createConversation: async (params) => {
        createConversation(params?.title)
      },
      switchConversation: async (id: string) => {
        switchConversation(id)
      },
      renameConversation: async (id: string, title: string) => {
        updateTitle(id, title)
      },
      deleteConversation: async (id: string) => {
        deleteConversation(id)
      }
    }
  }))

  if (getCurrentInstance()) {
    onMounted(() => {
      if (conversationState.conversations.length === 0) {
        createConversation('新会话')
      }
      senderRef.value?.focus?.()
    })

    onUnmounted(() => {
      customAgentProvider.agent.closeAll()
    })
  } else {
    if (conversationState.conversations.length === 0) {
      createConversation('新会话')
    }
  }

  // 虚拟的 messageManager，保持向后兼容
  const messageManager = {
    messageState,
    inputMessage,
    sendMessage,
    abortRequest,
    messages,
    addMessage,
    send
  }

  return {
    agent: customAgentProvider.agent,
    customAgentProvider,
    chatRuntime,
    messageManager,
    addMessage,
    send,
    conversationState,
    messages,
    messageState,
    inputMessage,
    sendMessage,
    abortRequest,
    senderRef,
    handleSendMessage,
    createConversation,
    switchConversation,
    deleteConversation,
    getCurrentConversation,
    updateTitle
  }
}

import { AIClient, GeneratingStatus, useConversation } from '@opentiny/tiny-robot-kit'
import { IconCopy, IconRefresh, IconUser } from '@opentiny/tiny-robot-svgs'
import { computed, h, nextTick, onMounted, onUnmounted, Ref, ref, watch } from 'vue'
import { CustomAgentModelProvider } from './CustomAgentModelProvider'
import { IconButton, TrSender } from '@opentiny/tiny-robot'
import logo from '../../public/svgs/logo-next-no-bg-right.svg'
import type { ICustomAgentModelProviderLlmConfig } from '../types/type'
import { extractTextAndJson } from './handleSchema'

interface useTinyRobotOption {
  agentRoot: Ref<string>
  systemPrompt: string
  llmConfig?: ICustomAgentModelProviderLlmConfig
  skills?: PropsSkill[] // 添加 skills 参数，tools 字段用于指定该 skill 需要的工具列表
}

/** 事件中返回的Skill 结构体 */
interface EventSkill {
  type: 'mention'
  /** xx专家 */
  content: string
  /** 你是xx专家 */
  value: string
}

/** 属性中传入的Skill 结构体 */
interface PropsSkill {
  /** xx专家 */
  label: string
  /** 你是xx专家 */
  value: string
  tools?: string[]
}

let accmulateText = ''
let summaryText = ''
let accmulateMessagesLength: number = 0

export const useTinyRobotChat = ({ agentRoot, systemPrompt, llmConfig, skills = [] }: useTinyRobotOption) => {
  const customAgentProvider = new CustomAgentModelProvider(
    { provider: 'custom' },
    ref(''),
    agentRoot,
    systemPrompt,
    llmConfig
  )

  const client = new AIClient({
    providerImplementation: customAgentProvider,
    provider: 'custom'
  })

  const showHistory = ref(false)

  const aiAvatar = h(logo, { style: { fontSize: '32px' } })
  const userAvatar = h(IconUser, { style: { fontSize: '32px' } })
  const welcomeIcon = h(logo, { style: { width: '48px', height: '48px' } })

  const {
    messageManager,
    createConversation,
    getCurrentConversation,
    switchConversation,
    deleteConversation,
    updateTitle,
    state: conversationState // 记录着所有的会话和 currentId
  } = useConversation({
    client,
    events: {
      onLoaded() {
        handleCreateConversation() // 每次刷新，都是新会话
      },
      onReceiveData(data, messages, preventDefault) {
        preventDefault()

        let lastMessage = messages.value[messages.value.length - 1]

        if (data.type === 'start') {
          accmulateText = ''
          summaryText = ''
          accmulateMessagesLength = 0
        }

        if (['text-start', 'tool'].includes(data.type)) {
          accmulateText = ''
          accmulateMessagesLength = 0
        }

        if (data.type === 'text-end') {
          summaryText += accmulateText
        }

        if (lastMessage.role !== 'assistant') {
          const message = {
            role: 'assistant',
            content: '',
            uiContent: []
          }

          messages.value.push(message)
          lastMessage = message
        }

        if (data.type === 'tool') {
          const toolContent = lastMessage.uiContent.find((item) => item.id === data.id)
          if (!toolContent) {
            lastMessage.uiContent.push(data)
          } else {
            toolContent.content += data.delta
            toolContent.status = data.status
          }
        } else if (data.type === 'markdown') {
          accmulateText += data.delta
          const accmulateMessages = extractTextAndJson(accmulateText)
          const arrLength = accmulateMessages.length
          if (arrLength === 0) {
            return
          }
          if (arrLength > accmulateMessagesLength) {
            lastMessage.uiContent.push(accmulateMessages[arrLength - 1])
          } else {
            lastMessage.uiContent[lastMessage.uiContent.length - 1] = accmulateMessages[arrLength - 1]
          }
          lastMessage.content = accmulateText

          accmulateMessagesLength = arrLength
        } else if (data.type === 'collapsible-text') {
          const thinkContent = lastMessage.uiContent.find(
            (item) => item.type === data.type && item.thinkId === data.thinkId
          )
          if (!thinkContent) {
            lastMessage.uiContent.push(data)
          } else {
            thinkContent.content += data.delta
            lastMessage.content += data.delta
          }
        }
      }
    }
  })
  const { messageState, inputMessage, sendMessage, abortRequest, messages, addMessage, send } = messageManager

  const isProcessing = computed(() => GeneratingStatus.includes(messageState.status))
  // 获取最新助手消息的索引，用于判断按钮显示状态
  const latestAssistantMessageIndex = computed(() => {
    return messages.value.findLastIndex((message) => message.role === 'assistant')
  })

  // 提示复制成功
  const copyingStates = ref<Record<string, boolean>>({})
  const copyTooltipContent = (messageIndex?: number) => {
    if (messageIndex === undefined) {
      return '复制'
    }
    return copyingStates.value[messageIndex] ? '复制成功' : '复制'
  }
  const roles = {
    assistant: {
      type: 'markdown',
      placement: 'start',
      avatar: aiAvatar,
      maxWidth: '80%',
      customContentField: 'uiContent',
      slots: {
        footer: ({ index }) => {
          const isLatestAssistant = latestAssistantMessageIndex.value === index
          // 正在回复消息不显示；
          if (isProcessing.value && isLatestAssistant) {
            return ''
          }

          return h(
            'div',
            {
              class: [
                'assistant-actions',
                {
                  'latest-assistant': isLatestAssistant,
                  'historical-assistant': !isLatestAssistant
                }
              ],
              style: {
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'center',
                gap: '4px'
              }
            },
            [
              h(IconButton, {
                icon: IconRefresh,
                size: 24,
                onClick: async () => {
                  await regenerateAssistantMessageByIndex(index)
                }
              }),
              h(
                TinyTooltip,
                {
                  effect: 'light',
                  content: copyTooltipContent(index),
                  placement: 'right',
                  visibleArrow: false
                },
                () =>
                  h(IconButton, {
                    icon: IconCopy,
                    size: 24,
                    onClick: async () => {
                      const message = messages.value[index]
                      const textContent =
                        typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
                      await navigator.clipboard.writeText(textContent)

                      // 提示复制成功
                      if (index) {
                        copyingStates.value[index] = true

                        setTimeout(() => {
                          copyingStates.value[index] = false
                        }, 3000)
                      }
                    }
                  })
              )
            ]
          )
        }
      }
    },
    user: {
      placement: 'end',
      avatar: userAvatar,
      maxWidth: '80%'
    }
  }
  const senderRef = ref<InstanceType<typeof TrSender>>()

  /**
   * 检查工具是否已加载和启用
   * @param toolName 工具名称
   * @returns 工具是否可用（已加载且已启用）
   */
  const isToolAvailable = (toolName: string): boolean => {
    // 检查工具是否存在于任何 mcpTools 中
    for (const serverName in customAgentProvider.agent.mcpTools) {
      const serverTools = customAgentProvider.agent.mcpTools[serverName]
      if (serverTools && serverTools[toolName]) {
        // 检查工具是否被禁用（在 ignoreToolnames 中）
        return !customAgentProvider.agent.ignoreToolnames.includes(toolName)
      }
    }
    return false
  }

  /**
   * 检查 skill 对应的工具是否已加载和启用
   * @param skillItems skill 项列表  content 对应 label(xxx专家) ， value对应value（我是xxx专家,......)
   * @returns Promise<boolean> 如果有缺失的工具，返回用户的选择：true 表示阻止发送，false 表示仍然发送；如果没有缺失工具，返回 false
   */
  const checkSkillToolsAvailability = async (skillItems: EventSkill[]): Promise<boolean> => {
    if (skillItems.length === 0) return false

    const missingTools: Array<{ skillLabel: string; toolNames: string[] }> = []

    for (const skillItem of skillItems) {
      // 从 skills 列表中查找完整的 skill 信息
      const fullSkill = skills.find((s) => s.label === skillItem.content)

      // 如果 skill 定义了需要的工具列表
      if (fullSkill?.tools && fullSkill.tools.length > 0) {
        const unavailableTools: string[] = []

        // 检查每个工具是否已加载和启用
        for (const toolName of fullSkill.tools) {
          if (!isToolAvailable(toolName)) {
            unavailableTools.push(toolName)
          }
        }

        // 如果有不可用的工具，记录到 missingTools
        if (unavailableTools.length > 0) {
          missingTools.push({
            skillLabel: skillItem.content || fullSkill.label,
            toolNames: unavailableTools
          })
        }
      }
    }

    // 如果有缺失的工具，显示确认对话框
    if (missingTools.length > 0) {
      const toolMessages = missingTools
        .map((item) => {
          return `${item.skillLabel} 需要以下工具：${item.toolNames.join('、')}`
        })
        .join('\n')

      try {
        await showConfirmDialog({
          title: '工具未准备好',
          message: `无法发送消息：\n${toolMessages}\n\n请先加载或启用对应的工具。\n\n是否仍然发送？`,
          confirmButtonText: '仍然发送',
          cancelButtonText: '确定',
          showCancelButton: true
        })
        // 用户点击了"仍然发送"，返回 false 表示不阻止发送
        return false
      } catch {
        // 用户点击了"确定"或关闭对话框，返回 true 表示阻止发送
        return true
      }
    }

    return false
  }

  /**
   * 从 templateDataParam 构建输入消息
   * @param templateDataParam 模板数据参数
   * @returns 构建好的输入消息字符串
   */
  const buildInputMessage = (templateDataParam: any[]): string => {
    return templateDataParam
      .map((data) => {
        if (data.type === 'mention') return `@${data.content}`
        if (data.type === 'text') return data.content
      })
      .join(' ')
  }

  /**
   * 从 skillItems 中提取提示词数组
   * @param skillItems skill 项列表
   * @returns 提示词字符串数组
   */
  const extractSkillPrompts = (skillItems: EventSkill[]): string[] => {
    return skillItems
      .map((item) => item.value)
      .filter((prompt) => prompt && typeof prompt === 'string' && prompt.length > 0)
  }

  /**
   * 组合基础提示词和 skill 提示词,然后设置到customAgentProvider.systemPrompt
   * @param skillPrompts skill 提示词数组
   * @param skillItems skill 项列表（用于获取 label）
   */
  const combineSystemPrompt = (skillPrompts: string[], skillItems: EventSkill[]): void => {
    if (skillPrompts.length > 0) {
      // 组合多个 skill 的提示词
      let combinedSkillPrompt = ''
      if (skillPrompts.length === 1) {
        // 单个 skill，直接使用其提示词
        combinedSkillPrompt = skillPrompts[0]
      } else {
        // 多个 skill，组合为多专家协作模式
        const skillLabels = skillItems.map((item) => item.content)
        combinedSkillPrompt = `# 多专家协作模式\n\n你同时具备以下 ${skillPrompts.length} 位专家的能力，请根据用户需求选择合适的专家视角来回答问题：\n\n`
        skillPrompts.forEach((prompt, index) => {
          combinedSkillPrompt += `## ${skillLabels[index]}（专家 ${index + 1}）\n\n${prompt}\n\n---\n\n`
        })
      }

      // 组合基础提示词和 skill 提示词
      const finalPrompt = systemPrompt ? `${systemPrompt}\n\n${combinedSkillPrompt}` : combinedSkillPrompt
      customAgentProvider.systemPrompt = finalPrompt
    } else {
      // 没有有效的 skill 提示词，使用基础提示词
      customAgentProvider.systemPrompt = systemPrompt
    }
  }

  // 发送消息。 第一次发送，修改会话title
  // 返回值：Promise<boolean> true 表示成功发送，false 表示被阻止（工具未准备好）
  // images: 图片数组，支持 base64 data URL 或 http(s) URL
  // 参考: https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text#messages.user-model-message.content.text-part.type
  const handleSendMessage = async (
    _inputValue: string,
    templateDataParam?: any[],
    images?: string[]
  ): Promise<boolean> => {
    // 增加 @ 功能， 如果有指定角色，则在这里进行处理， 生成正确的： inputMessage.value 和 最终的系统提示词
    if (templateDataParam && templateDataParam.length > 0) {
      const skillItems = templateDataParam.filter((data) => data.type === 'mention')

      // 检查 skill 对应的工具是否已加载和启用，如果有缺失则显示确认对话框
      const shouldBlock = await checkSkillToolsAvailability(skillItems)
      if (shouldBlock) {
        return false // 用户选择取消，阻止发送消息
      }

      // 构建输入消息
      inputMessage.value = buildInputMessage(templateDataParam)

      // 提取并组合 skill 提示词
      const skillPrompts = extractSkillPrompts(skillItems)
      combineSystemPrompt(skillPrompts, skillItems)
    }

    // 第一次发送时，修改会话标题
    const conv = getCurrentConversation()
    if (conv && conv.title === '新会话') {
      updateTitle(conv.id, inputMessage.value.slice(0, 15))
    }

    // 构建消息内容，支持多模态（文本+图片）
    // 根据 AI SDK 文档，UserModelMessage 的 content 可以是：
    // - string: 纯文本消息
    // - Array<TextPart | ImagePart>: 多模态消息
    if (images && images.length > 0) {
      // 多模态消息：包含文本和图片
      const messageContent: Array<{ type: 'text'; text: string } | { type: 'image'; image: string }> = [
        { type: 'text', text: inputMessage.value },
        ...images.map((img) => ({ type: 'image' as const, image: img }))
      ]

      // 使用 addMessage 添加多模态消息，然后调用 send() 发送
      addMessage({
        role: 'user',
        content: messageContent
      })
      send()
    } else {
      // 纯文本消息：使用原有的 sendMessage 方法
      sendMessage(inputMessage.value)
    }

    return true // 成功发送
  }

  const handleCreateConversation = () => {
    abortRequest()
    const aiSdkMessages: any[] = []
    customAgentProvider.agent.messages = aiSdkMessages
    createConversation()
    const conv = getCurrentConversation()!
    conv.aiSdkMessages = aiSdkMessages // 保存同一个引用到会话中
  }

  const handleHistorySelect = (item: { id: string }) => {
    abortRequest()
    switchConversation(item.id)

    const conv = getCurrentConversation()!
    customAgentProvider.agent.messages = conv.aiSdkMessages // 切换历史对话到当前代理上
    showHistory.value = false

    scrollToBottom()
  }

  const handleHistoryUpdateTitle = (title: string, item: any) => {
    item.title = title
  }

  const handleHistoryDelete = (action: any, item: { id: string }) => {
    if (action.id === 'delete') {
      if (conversationState.currentId === item.id) {
        showToast('不允许删除当前会话')
        return
      }
      deleteConversation(item.id)
    }
  }

  // 最新消息滚动到底部
  const scrollToBottom = () => {
    nextTick(() => {
      const containerBody = document.querySelector('div.tr-bubble-list')
      if (containerBody) {
        containerBody.scrollTo({
          top: containerBody.scrollHeight,
          behavior: 'smooth'
        })
      }
    })
  }

  watch(() => messages.value[messages.value.length - 1]?.content, scrollToBottom)

  // 页面加载完成后自动聚焦输入框
  onMounted(() => {
    senderRef.value?.focus()
  })

  onUnmounted(() => {
    customAgentProvider.agent.closeAll()
  })

  return {
    /**  一个 ai-sdk agent 封装,详见： next-sdk/AgentModelProvider 类 */
    agent: customAgentProvider.agent,
    /** CustomAgentModelProvider 实例，用于调用 updateLLMConfig */
    customAgentProvider,
    client,
    showHistory,
    aiAvatar,
    userAvatar,
    welcomeIcon,

    messageManager,
    addMessage,
    send,
    conversationState,
    messages,
    messageState,
    inputMessage,
    sendMessage,
    abortRequest,
    roles,
    senderRef,
    handleSendMessage,
    createConversation,
    handleHistorySelect,
    handleCreateConversation,
    handleHistoryUpdateTitle,
    handleHistoryDelete
  }
}

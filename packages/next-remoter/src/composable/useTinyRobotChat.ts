import { AIClient, GeneratingStatus, useConversation } from '@opentiny/tiny-robot-kit'
import { IconCopy, IconRefresh, IconUser } from '@opentiny/tiny-robot-svgs'
import { computed, h, nextTick, onMounted, onUnmounted, Ref, ref, watch } from 'vue'
import { CustomAgentModelProvider } from './CustomAgentModelProvider'
import { IconButton, TrSender } from '@opentiny/tiny-robot'
import logo from '../../public/svgs/logo-next-no-bg-right.svg'
import type { ICustomAgentModelProviderLlmConfig } from '../types/type'
import { extractTextAndJson } from './handleSchema'
import tokenUsageVue from '../components/tokenUsage.vue'

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

/**
 * 消息内容类型（AI SDK 标准格式）
 */
type MessageContent = string | Array<{ type: 'text'; text: string } | { type: 'image'; image: string }>

/**
 * UI 消息类型（包含 uiContent 字段用于界面显示）
 */
interface UIMessage {
  role: 'user' | 'assistant'
  content: MessageContent
  uiContent?: Array<{ type: 'text'; text: string } | { type: 'image'; url: string }>
}

export const useTinyRobotChat = ({ systemPrompt, llmConfig, skills = [] }: useTinyRobotOption) => {
  const customAgentProvider = new CustomAgentModelProvider({ provider: 'custom' }, systemPrompt, llmConfig)

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
    autoSave: false,
    events: {
      onLoaded() {
        handleCreateConversation() // 每次刷新，都是新会话
      },
      onReceiveData(data, messages, preventDefault) {
        preventDefault()
        messages.value.push(data)
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
                  // 向上找最后一次 user 消息
                  const lastUserIndex = messages.value.findLastIndex((m, idx) => m.role === 'user' && idx <= index)
                  const lastUserMsg = messages.value[lastUserIndex]

                  // 从上个user消息截断， 只保留上半断。  last user消息也截掉。
                  messages.value = messages.value.slice(0, lastUserIndex)

                  // 处理多模态消息（包含图片的消息）
                  if (Array.isArray(lastUserMsg.content)) {
                    // content 是数组，说明是多模态消息
                    // 提取文本内容
                    const textPart = lastUserMsg.content.find((item: any) => item.type === 'text')
                    const textContent = textPart?.text || ''

                    // 提取附件内容（图片等）
                    const attachmentParts = lastUserMsg.content.filter((item: any) => item.type !== 'text')

                    // 设置输入框内容
                    inputMessage.value = textContent

                    // 重新发送（包含附件内容）
                    handleSendMessage(textContent, attachmentParts.length > 0 ? attachmentParts : undefined)
                  } else {
                    // 纯文本消息
                    inputMessage.value = lastUserMsg.content
                    handleSendMessage(lastUserMsg.content)
                  }
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
              ),
              messages.value[index].usage ? h(tokenUsageVue, { usage: messages.value[index].usage }) : null
            ]
          )
        }
      }
    },
    user: {
      placement: 'end',
      avatar: userAvatar,
      maxWidth: '80%',
      customContentField: 'uiContent' // 使用 uiContent 字段渲染消息内容
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
  // attachmentsContent: 附件内容数组，支持多模态消息（图片、文档等）
  // 参考: https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text#messages.user-model-message.content.text-part.type
  const handleSendMessage = async (_inputValue: string, attachmentsContent?: any[]): Promise<boolean> => {
    // 增加 @ 功能， 如果有指定角色，则在这里进行处理， 生成正确的： inputMessage.value 和 最终的系统提示词
    const matchedSkills = skills.filter((s) => _inputValue.includes('@' + s.label))
    if (matchedSkills.length > 0) {
      const skillItems = matchedSkills.map((s) => {
        return {
          type: 'mention',
          content: s.label,
          value: s.value
        }
      })
      // 检查 skill 对应的工具是否已加载和启用，如果有缺失则显示确认对话框
      const shouldBlock = await checkSkillToolsAvailability(skillItems)
      if (shouldBlock) {
        return false // 用户选择取消，阻止发送消息
      }

      inputMessage.value = _inputValue

      // 提取并组合 skill 提示词
      const skillPrompts = extractSkillPrompts(skillItems)
      combineSystemPrompt(skillPrompts, skillItems)
    }

    // 第一次发送时，修改会话标题
    const conv = getCurrentConversation()
    if (conv && conv.title === '新会话') {
      updateTitle(conv.id, inputMessage.value.slice(0, 15))
    }

    if (attachmentsContent && attachmentsContent.length > 0) {
      // 使用 AI SDK 标准格式：{ type: 'text' } 和 { type: 'image', image: base64 }
      const messageContent = [{ type: 'text', text: inputMessage.value }, ...attachmentsContent]

      // 2. 构建 UI 显示格式的消息内容
      const uiContent: any[] = []

      // 添加文本部分（使用 content 字段以匹配 BubbleProvider 的 text 渲染器）
      if (inputMessage.value) {
        uiContent.push({
          type: 'text',
          content: inputMessage.value // ✅ 使用 content 字段
        })
      }

      // 添加图片部分（用于UI显示）
      // 将 AI SDK 格式 { type: 'image', image: '...' } 转换为 UI 格式 { type: 'image', content: '...' }
      for (const item of attachmentsContent) {
        if (item.type === 'image' && item.image) {
          uiContent.push({
            type: 'image',
            content: item.image // ✅ 使用 content 字段（统一格式）
          })
        }
      }

      // 3. 添加消息到 messages（会被自动同步到 responseMessages）
      const message: UIMessage = {
        role: 'user',
        content: messageContent, // API 格式：AI SDK 标准多模态数组
        uiContent: uiContent // UI 格式：用于界面显示
      }
      messages.value.push(message)

      // 4. 清空输入框并发送消息
      inputMessage.value = ''
      send()
    } else {
      // 纯文本消息：也需要构建 uiContent 来保证渲染一致性
      const message: UIMessage = {
        role: 'user',
        content: inputMessage.value, // API 格式：纯字符串
        uiContent: [
          {
            // UI 格式：用于界面显示
            type: 'text',
            content: inputMessage.value // ✅ 使用 content 字段（与 BubbleProvider 渲染器一致）
          }
        ]
      }
      messages.value.push(message)

      // 清空输入框并发送消息
      inputMessage.value = ''
      send()
    }

    return true // 成功发送
  }

  const handleCreateConversation = () => {
    abortRequest()
    const aiSdkMessages: any[] = []
    customAgentProvider.agent.responseMessages = aiSdkMessages
    createConversation()
    const conv = getCurrentConversation()!
    conv.aiSdkMessages = aiSdkMessages // 保存同一个引用到会话中
  }

  const handleHistorySelect = (item: { id: string }) => {
    abortRequest()
    switchConversation(item.id)

    const conv = getCurrentConversation()!
    customAgentProvider.agent.responseMessages = conv.aiSdkMessages // 切换历史对话到当前代理上
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

  // 获取token, 并保存到最后一条消息上
  customAgentProvider.agent.onUsage = (usage) => {
    let lastMessage = messages.value[messages.value.length - 1]
    lastMessage.usage = usage
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

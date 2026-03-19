import { AIClient, useConversation } from '@opentiny/tiny-robot-kit'
import { onMounted, onUnmounted, ref } from 'vue'
import { CustomAgentModelProvider } from './CustomAgentModelProvider'
import { TrSender } from '@opentiny/tiny-robot'
import type { ICustomAgentModelProviderLlmConfig } from '../types/type'

interface useTinyRobotOption {
  systemPrompt: string
  llmConfig?: ICustomAgentModelProviderLlmConfig
  emit: (e: string, ...args: any[]) => void
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

export const useTinyRobotChat = ({ systemPrompt, llmConfig, emit }: useTinyRobotOption) => {
  const customAgentProvider = new CustomAgentModelProvider({ provider: 'custom' }, systemPrompt, llmConfig)

  const client = new AIClient({
    providerImplementation: customAgentProvider,
    provider: 'custom'
  })

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
        // 会话加载完成（初始化将在组件的 onMounted 中调用）
      },
      onReceiveData(data, messages, preventDefault) {
        preventDefault()
        // 此处是接收 agent 返回消息时，所以 assistant 一定是在底部的
        if (messages.value[messages.value.length - 1].role === 'assistant') {
          messages.value.pop()
        }
        emit('before-ai-render', data)
        messages.value.push(data)
      }
    }
  })
  const { messageState, inputMessage, sendMessage, abortRequest, messages, addMessage, send } = messageManager

  const senderRef = ref<InstanceType<typeof TrSender>>()

  // 发送消息的核心逻辑
  // skillProcessor: 可选的 skills 处理器函数，用于在发送前处理技能相关逻辑
  // 返回值: { shouldBlock: boolean } - true 表示阻止发送
  const handleSendMessage = async (
    _inputValue: string,
    attachmentsContent?: any[],
    skillProcessor?: (inputValue: string) => Promise<{ shouldBlock: boolean }>
  ): Promise<boolean> => {
    // 如果提供了 skillProcessor，则先处理 skills 相关逻辑
    if (skillProcessor) {
      const { shouldBlock } = await skillProcessor(_inputValue)
      if (shouldBlock) {
        return false // 用户选择取消，阻止发送消息
      }
    }

    // 设置输入消息值
    inputMessage.value = _inputValue

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

    // 基础会话方法（供 useConversationHistory 使用）
    createConversation,
    switchConversation,
    deleteConversation,
    getCurrentConversation
  }
}

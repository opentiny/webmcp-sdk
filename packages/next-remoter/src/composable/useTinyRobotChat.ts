import { AIClient, useConversation } from '@opentiny/tiny-robot-kit'
import { IconUser } from '@opentiny/tiny-robot-svgs'
import { h, nextTick, onMounted, onUnmounted, Ref, ref, watch } from 'vue'
import { CustomAgentModelProvider } from './CustomAgentModelProvider'
import { TrSender } from '@opentiny/tiny-robot'
import logo from '../../public/svgs/logo-next-no-bg-right.svg'
import type { ICustomAgentModelProviderLlmConfig } from '../types/type'
import { extractTextAndJson } from './handleSchema'

interface useTinyRobotOption {
  sessionId: Ref<string>
  agentRoot: Ref<string>
  systemPrompt: string
  llmConfig?: ICustomAgentModelProviderLlmConfig
}

let accmulateText = ''
let summaryText = ''
let accmulateMessagesLength: number = 0

export const useTinyRobotChat = ({ sessionId, agentRoot, systemPrompt, llmConfig }: useTinyRobotOption) => {
  const customAgentProvider = new CustomAgentModelProvider(
    { provider: 'custom' },
    sessionId,
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
        // console.log('onReceiveData=', data)

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
          accmulateMessagesLength = arrLength
          // console.log('accmulateMessages', accmulateMessages)
          // const markdownContent = lastMessage.uiContent.find(
          //   (item) => item.type === data.type && item.textId === data.textId
          // )
          // if (!markdownContent) {
          //   lastMessage.uiContent.push(data)
          // } else {
          //   markdownContent.content += data.delta
          //   lastMessage.content += data.delta
          // }
          // const extractedBlocks = extractTextAndJson(lastMessage.content || data.delta)
          // console.log('extractedBlocks', extractedBlocks)
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

  const roles = {
    assistant: {
      type: 'markdown',
      placement: 'start',
      avatar: aiAvatar,
      maxWidth: '80%',
      customContentField: 'uiContent'
    },
    user: {
      placement: 'end',
      avatar: userAvatar,
      maxWidth: '80%'
    }
  }
  const senderRef = ref<InstanceType<typeof TrSender>>()

  // 发送消息。 第一次发送，修改会话title
  const handleSendMessage = () => {
    const conv = getCurrentConversation()
    if (conv && conv.title === '新会话') {
      updateTitle(conv.id, inputMessage.value.slice(0, 15))
    }
    sendMessage(inputMessage.value)
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

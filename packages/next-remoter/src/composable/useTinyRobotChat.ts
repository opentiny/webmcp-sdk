import { AIClient, useConversation } from '@opentiny/tiny-robot-kit'
import { IconUser } from '@opentiny/tiny-robot-svgs'
import { h, onMounted, onUnmounted, Ref, ref } from 'vue'
import { CustomAgentModelProvider } from './CustomAgentModelProvider'
import { TrSender } from '@opentiny/tiny-robot'
import logo from '../../public/svgs/logo-next-no-bg-right.svg'

interface useTinyRobotOption {
  sessionId: Ref<string>
  agentRoot: Ref<string>
  systemPrompt: string
}

export const useTinyRobotChat = ({ sessionId, agentRoot, systemPrompt }: useTinyRobotOption) => {
  const customAgentProvider = new CustomAgentModelProvider({ provider: 'custom' }, sessionId, agentRoot, systemPrompt)
  const client = new AIClient({
    providerImplementation: customAgentProvider,
    provider: 'custom'
  })

  const fullscreen = ref(false)
  const show = ref(true)

  const aiAvatar = h(logo, { style: { fontSize: '32px' } })
  const userAvatar = h(IconUser, { style: { fontSize: '32px' } })
  const welcomeIcon = h(logo, { style: { width: '48px', height: '48px' } })

  const { messageManager, createConversation } = useConversation({
    client,
    events: {
      onReceiveData(data, messages, preventDefault) {
        preventDefault()
        // console.log('onReceiveData=', data)

        let lastMessage = messages.value[messages.value.length - 1]

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
          const markdownContent = lastMessage.uiContent.find(
            (item) => item.type === data.type && item.textId === data.textId
          )
          if (!markdownContent) {
            lastMessage.uiContent.push(data)
          } else {
            markdownContent.content += data.delta
            lastMessage.content += data.delta
          }
        }
      }
    }
  })
  const { messageState, inputMessage, sendMessage, abortRequest, messages } = messageManager

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

  // 发送消息
  const handleSendMessage = () => {
    sendMessage(inputMessage.value)
  }

  // 页面加载完成后自动聚焦输入框
  onMounted(() => {
    setTimeout(() => {
      senderRef.value?.focus()
    }, 500)
  })

  onUnmounted(() => {
    customAgentProvider.agent.closeAll()
  })

  return {
    /**  一个 ai-sdk agent 封装,详见： next-sdk/AgentModelProvider 类 */
    agent: customAgentProvider.agent,
    client,
    fullscreen,
    show,
    aiAvatar,
    userAvatar,
    welcomeIcon,

    messageManager,
    messages,
    messageState,
    inputMessage,
    sendMessage,
    abortRequest,
    roles,
    senderRef,
    handleSendMessage,
    createConversation: () => {
      abortRequest()
      createConversation()
    }
  }
}

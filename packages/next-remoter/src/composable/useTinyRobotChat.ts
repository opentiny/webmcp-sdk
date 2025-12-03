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
  skills?: Array<{ label: string; value: string; prompt?: string }> // 添加 skills 参数
}

let accmulateText = ''
let summaryText = ''
let accmulateMessagesLength: number = 0

export const useTinyRobotChat = ({
  sessionId,
  agentRoot,
  systemPrompt,
  llmConfig,
  skills = []
}: useTinyRobotOption) => {
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
  const handleSendMessage = (inputValue: string, templateDataParam?: any[]) => {
    // 增加 @ 功能， 如果有指定角色，则在这里进行处理， 生成正确的： inputMessage.value 和 最终的系统提示词
    if (templateDataParam && templateDataParam.length > 0) {
      const skillItems = templateDataParam.filter((data) => data.type === 'skill')

      inputMessage.value = templateDataParam
        .map((data) => {
          if (data.type === 'skill') return `@${data.label}`
          if (data.type === 'text') return data.content
        })
        .join(' ')

      // 组合提示词：基础提示词 + skill 提示词
      // skill 对象通过 props 传递，包含 label、value（skill name）和 prompt（提示词内容）
      // 注意：tr-sender 组件可能只传递了部分字段，所以需要从 skills 列表中查找完整的 skill 信息
      const skillPrompts = skillItems
        .map((item) => {
          // 优先使用 item 中的 prompt 字段
          if ((item as any).prompt) {
            return (item as any).prompt
          }
          // 如果没有 prompt，从 skills 列表中根据 value（skill name）查找完整的 skill 对象
          const fullSkill = skills.find((s) => s.value === item.value)
          if (fullSkill?.prompt) {
            return fullSkill.prompt
          }
          // 如果都没有，返回 value（兼容旧格式，但这种情况不应该发生）
          console.warn(`[useTinyRobotChat] Skill "${item.value}" 没有找到 prompt，使用 value 作为 fallback`)
          return item.value
        })
        .filter((prompt) => prompt && typeof prompt === 'string' && prompt.length > 0)

      if (skillPrompts.length > 0) {
        // 组合多个 skill 的提示词
        let combinedSkillPrompt = ''
        if (skillPrompts.length === 1) {
          // 单个 skill，直接使用其提示词
          combinedSkillPrompt = skillPrompts[0]
        } else {
          // 多个 skill，组合为多专家协作模式
          const skillLabels = skillItems.map((item) => item.label)
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
    } else {
      customAgentProvider.systemPrompt = systemPrompt
    }

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

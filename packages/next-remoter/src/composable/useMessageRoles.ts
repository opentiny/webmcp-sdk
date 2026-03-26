import { computed, h, ref, Ref, VNode } from 'vue'
import { IconButton } from '@opentiny/tiny-robot'
import { IconCopy, IconRefresh } from '@opentiny/tiny-robot-svgs'
import { GeneratingStatus } from '@opentiny/tiny-robot-kit'
import TinyTooltip from '@opentiny/vue-tooltip'
import tokenUsageVue from '../components/TokenUsage.vue'
import logo from '../../public/svgs/logo-next-no-bg-right.svg'

/**
 * 消息角色 UI 配置 Composable
 * 用于定义消息气泡的外观、头像、操作按钮等 UI 配置
 */
export function useMessageRoles(options: {
  props: { roleAvatar: { user: VNode; assistant: VNode } }
  messages: Ref<any[]>
  messageState: any
  inputMessage: Ref<string>
  handleSendMessage: (inputValue: string, attachmentsContent?: any[]) => Promise<boolean>
}) {
  const { messages, messageState, inputMessage, handleSendMessage } = options

  // ===== 头像配置 =====
  const welcomeIcon = h(logo, { style: { width: '48px', height: '48px' } })

  // ===== 状态管理 =====
  // 复制状态：记录每条消息的复制状态
  const copyingStates = ref<Record<string, boolean>>({})

  // 是否正在处理消息
  const isProcessing = computed(() => GeneratingStatus.includes(messageState.status))

  // 获取最新助手消息的索引，用于判断按钮显示状态
  const latestAssistantMessageIndex = computed(() => {
    return messages.value.findLastIndex((message) => message.role === 'assistant')
  })

  // ===== 工具函数 =====
  /**
   * 获取复制按钮的提示内容
   * @param messageIndex 消息索引
   * @returns 提示文本
   */
  const copyTooltipContent = (messageIndex?: number) => {
    if (messageIndex === undefined) {
      return '复制'
    }
    return copyingStates.value[messageIndex] ? '复制成功' : '复制'
  }

  /**
   * 复制消息内容到剪贴板
   * @param index 消息索引
   */
  const copyMessageToClipboard = async (index: number) => {
    debugger
    const message = messages.value[index]
    const textContent = typeof message.content === 'string' ? message.content : JSON.stringify(message.content)

    // 添加错误处理：剪贴板 API 可能因权限、安全上下文或浏览器支持而失败
    try {
      await navigator.clipboard.writeText(textContent)

      // 提示复制成功
      if (index !== undefined) {
        copyingStates.value[index] = true

        setTimeout(() => {
          copyingStates.value[index] = false
        }, 3000)
      }
    } catch (error) {
      console.error('复制失败:', error)
      showToast('复制失败，请重试')
    }
  }

  /**
   * 重新生成消息
   * @param index 当前消息索引
   */
  const regenerateMessage = async (index: number) => {
    // 向上找最后一次 user 消息
    const lastUserIndex = messages.value.findLastIndex((m, idx) => m.role === 'user' && idx <= index)

    // 添加守卫：如果没找到用户消息，则不执行重新生成操作
    if (lastUserIndex === -1) {
      console.warn('未找到可重新生成的用户消息')
      showToast('无法重新生成消息')
      return
    }

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
      await handleSendMessage(textContent, attachmentParts.length > 0 ? attachmentParts : undefined)
    } else {
      // 纯文本消息
      inputMessage.value = lastUserMsg.content
      await handleSendMessage(lastUserMsg.content)
    }
  }

  // ===== 角色配置 =====
  /**
   * 消息气泡的角色配置
   * 定义了 assistant（助手）和 user（用户）两种角色的外观和行为
   */
  const roles = {
    assistant: {
      type: 'markdown',
      placement: 'start',
      avatar: options.props.roleAvatar.assistant,
      maxWidth: '80%',
      customContentField: 'uiContent',
      slots: {
        footer: ({ index }: { index: number }) => {
          const isLatestAssistant = latestAssistantMessageIndex.value === index
          // 正在回复消息不显示操作按钮
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
              // 重新生成按钮
              h(IconButton, {
                icon: IconRefresh,
                size: 24,
                onClick: () => regenerateMessage(index)
              }),
              // 复制按钮
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
                    onClick: () => copyMessageToClipboard(index)
                  })
              ),
              // Token 使用统计（如果存在）
              messages.value[index].usage ? h(tokenUsageVue, { usage: messages.value[index].usage }) : null
            ]
          )
        }
      }
    },
    user: {
      placement: 'end',
      avatar: options.props.roleAvatar.user,
      maxWidth: '80%',
      customContentField: 'uiContent' // 使用 uiContent 字段渲染消息内容
    }
  }

  return {
    // 欢迎logo
    welcomeIcon,

    // 角色配置
    roles,

    // 状态和计算属性
    copyingStates,
    isProcessing,
    latestAssistantMessageIndex,

    // 工具函数
    copyTooltipContent,
    copyMessageToClipboard,
    regenerateMessage
  }
}

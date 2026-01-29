import { ref, nextTick } from 'vue'

/**
 * 会话历史管理 Composable
 * 用于管理历史会话的创建、切换、更新、删除等操作
 */
export function useConversationHistory(options: {
  createConversation: () => void
  switchConversation: (id: string) => void
  deleteConversation: (id: string) => void
  getCurrentConversation: () => any
  abortRequest: () => void
  conversationState: any
  customAgentProvider: any
}) {
  const {
    createConversation,
    switchConversation,
    deleteConversation,
    getCurrentConversation,
    abortRequest,
    conversationState,
    customAgentProvider
  } = options

  // ===== 状态管理 =====
  // 是否显示历史面板
  const showHistory = ref(false)

  // ===== 工具函数 =====
  /**
   * 滚动到消息底部
   */
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

  // ===== 历史会话操作 =====
  /**
   * 创建新会话
   */
  const handleCreateConversation = () => {
    // 中止当前请求
    abortRequest()

    // 创建新的消息数组引用
    const aiSdkMessages: any[] = []
    customAgentProvider.agent.responseMessages = aiSdkMessages

    // 创建新会话
    createConversation()

    // 保存消息数组引用到会话对象中
    const conv = getCurrentConversation()!
    conv.aiSdkMessages = aiSdkMessages
  }

  /**
   * 选择历史会话
   * @param item 会话项
   */
  const handleHistorySelect = (item: { id: string }) => {
    // 中止当前请求
    abortRequest()

    // 切换到选中的会话
    switchConversation(item.id)

    // 恢复该会话的消息历史到当前代理
    const conv = getCurrentConversation()!
    customAgentProvider.agent.responseMessages = conv.aiSdkMessages

    // 关闭历史面板
    showHistory.value = false

    // 滚动到底部
    scrollToBottom()
  }

  /**
   * 更新会话标题
   * @param title 新标题
   * @param item 会话项
   */
  const handleHistoryUpdateTitle = (title: string, item: any) => {
    item.title = title
  }

  /**
   * 删除会话
   * @param action 操作对象
   * @param item 会话项
   */
  const handleHistoryDelete = (action: any, item: { id: string }) => {
    // 只处理删除操作
    if (action.id === 'delete') {
      // 不允许删除当前会话
      if (conversationState.currentId === item.id) {
        showToast('不允许删除当前会话')
        return
      }

      // 执行删除
      deleteConversation(item.id)
    }
  }

  return {
    // 状态
    showHistory,

    // 操作函数
    handleCreateConversation,
    handleHistorySelect,
    handleHistoryUpdateTitle,
    handleHistoryDelete,

    // 工具函数
    scrollToBottom
  }
}

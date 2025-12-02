import { sendRuntimeMessage } from '@/utils/messages'

/**
 * 工具动画管理器
 * 用于统一处理工具调用时的页面动画效果
 */

/**
 * 触发工具调用动画
 * 从 sidepanel 发送消息到 content script，复用 update-page-app-message 事件
 * @param tabId 目标标签页 ID
 * @param toolName 工具名称
 */
export const triggerToolAnimation = async (tabId: number, toolName: string): Promise<void> => {
  try {
    // 复用 update-page-app-message 事件，发送到 content script
    await sendRuntimeMessage('update-page-app-message', { tabId, status: 'run', message: toolName }, 'side->content')
  } catch (error) {
    // 动画触发失败不应该影响工具执行，只记录错误
    console.warn('【Tool Animation】触发动画失败:', error)
  }
}

/**
 * 恢复工具调用动画状态
 * 工具执行完成后，恢复页面动画状态，复用 update-page-app-message 事件
 * @param tabId 目标标签页 ID
 */
export const restoreToolAnimation = async (tabId: number): Promise<void> => {
  try {
    // 复用 update-page-app-message 事件，发送到 content script
    await sendRuntimeMessage('update-page-app-message', { tabId, status: 'ready', message: '' }, 'side->content')
  } catch (error) {
    // 动画恢复失败不应该影响工具执行，只记录错误
    console.warn('【Tool Animation】恢复动画失败:', error)
  }
}

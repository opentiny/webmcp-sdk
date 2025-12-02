import { triggerToolAnimation, restoreToolAnimation } from './toolAnimationManager'
import { getCurrentTabId } from './utils'

/**
 * 工具动画装饰器
 * 自动为工具回调函数添加动画效果
 *
 * @param toolName 工具名称，用于显示在动画中
 * @param toolCallback 原始工具回调函数
 * @param getTabId 获取目标 tabId 的函数（可选）
 *                 如果不提供，则尝试从工具参数中提取 tabId，如果参数中没有则使用当前活动标签页
 * @returns 包装后的工具回调函数
 */
export const withToolAnimation = <T extends (...args: any[]) => any>(
  toolName: string,
  toolCallback: T,
  getTabId?: (args?: Parameters<T>[0]) => Promise<number | undefined>
): T => {
  return (async (...args: Parameters<T>) => {
    let tabId: number | undefined

    try {
      // 获取目标 tabId
      if (getTabId) {
        // 如果提供了 getTabId 函数，调用它（可以传入工具参数）
        tabId = await getTabId(args[0])
      } else {
        // 尝试从工具参数中提取 tabId
        const params = args[0] as any
        if (params && typeof params === 'object' && 'tabId' in params && params.tabId) {
          tabId = params.tabId
        } else {
          // 如果参数中没有 tabId，使用当前活动标签页
          tabId = await getCurrentTabId()
        }
      }

      // 如果无法获取 tabId，仍然执行工具，但不显示动画
      if (tabId) {
        // 触发动画：显示工具调用状态
        await triggerToolAnimation(tabId, toolName)
      }

      // 执行原始工具函数
      const result = await toolCallback(...args)

      // 工具执行成功，恢复动画状态
      if (tabId) {
        await restoreToolAnimation(tabId)
      }

      return result
    } catch (error) {
      // 工具执行失败，也要恢复动画状态
      if (tabId) {
        await restoreToolAnimation(tabId)
      }
      // 重新抛出错误，保持原有错误处理逻辑
      throw error
    }
  }) as T
}

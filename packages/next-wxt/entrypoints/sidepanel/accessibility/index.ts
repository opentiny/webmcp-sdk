import type { SnapshotManager } from '../utils/snapshotManager'
import { getSnapshotManager, releaseSnapshotManager, type SnapshotActionParams } from './utils'
import { handleSnapshotAction } from './snapshot'
import { handleClickAction } from './click'
import { handleFillAction } from './fill'

/**
 * 执行 Snapshot 工具操作
 * @param params 操作参数
 * @returns 操作结果
 */
export async function executeSnapshotAction(params: SnapshotActionParams): Promise<{
  content: Array<{ type: 'text'; text: string }>
}> {
  const { action, tabId } = params

  // 获取快照管理器
  const { manager, currentTabId } = await getSnapshotManager(tabId)

  try {
    // 根据操作类型分发到不同的处理函数
    if (action === 'snapshot') {
      return await handleSnapshotAction(manager)
    } else if (action === 'click') {
      if (!params.uid) {
        throw new Error('点击操作需要提供 uid 参数')
      }
      return await handleClickAction(manager, params.uid, params.button, params.dblClick)
    } else if (action === 'fill') {
      if (!params.uid || !params.text) {
        throw new Error('输入操作需要提供 uid 和 text 参数')
      }
      return await handleFillAction(manager, params.uid, params.text, params.clearFirst)
    } else {
      throw new Error(`未知的操作类型: ${action}`)
    }
  } catch (error: any) {
    const errorMessage = error.message || '未知错误'
    const actionNames: Record<string, string> = {
      snapshot: '获取快照',
      click: '点击节点',
      fill: '输入文本'
    }
    const friendlyMessage = `${actionNames[action] || '操作'}失败：${errorMessage}`
    return { content: [{ type: 'text', text: friendlyMessage }] }
  } finally {
    // 释放连接引用（连接池会管理连接生命周期，不会立即断开）
    await releaseSnapshotManager(currentTabId)
  }
}

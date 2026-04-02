import { getSnapshotManager, releaseSnapshotManager, type SnapshotActionParams } from './utils'
import { handleSnapshotAction } from './snapshot'
import { handleClickAction } from './click'
import { handleFillAction } from './fill'
import { handleScrollAction } from './scroll'
import { handleCopyAction } from './copy'
import { handlePasteAction } from './paste'

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
      await handleSnapshotAction(manager)
      manager.highlightPage(true) // 每一次查询无障碍，都高亮一次页面。
      // manager.resetCursorInPage() // 重置光标到页面中心

      const result = await handleSnapshotAction(manager)
      return result
    } else if (action === 'click') {
      if (!params.uid) {
        throw new Error('点击操作需要提供 uid 参数')
      }

      // 移动光标
      // await manager.moveCursorInPage(params.uid)
      const result = await handleClickAction(manager, params.uid, params.button, params.dblClick)
      return result
    } else if (action === 'fill') {
      if (!params.uid || !params.text) {
        throw new Error('输入操作需要提供 uid 和 text 参数')
      }
      // 移动光标
      // await manager.moveCursorInPage(params.uid)
      const result = await handleFillAction(manager, params.uid, params.text, params.clearFirst)
      return result
    } else if (action === 'scroll') {
      // scroll 操作的 uid 是可选的（不提供则滚动页面）
      return await handleScrollAction(manager, params.uid, params.x, params.y, params.behavior)
    } else if (action === 'copy') {
      if (!params.uid) {
        throw new Error('复制操作需要提供 uid 参数')
      }
      return await handleCopyAction(manager, params.uid)
    } else if (action === 'paste') {
      if (!params.uid || !params.text) {
        throw new Error('粘贴操作需要提供 uid 和 text 参数')
      }
      return await handlePasteAction(manager, params.uid, params.text)
    } else {
      throw new Error(`未知的操作类型: ${action}`)
    }
  } catch (error: any) {
    const errorMessage = error.message || '未知错误'
    const actionNames: Record<string, string> = {
      snapshot: '获取快照',
      click: '点击节点',
      fill: '输入文本',
      scroll: '滚动',
      copy: '复制文本',
      paste: '粘贴文本'
    }
    const friendlyMessage = `${actionNames[action] || '操作'}失败：${errorMessage}`
    return { content: [{ type: 'text', text: friendlyMessage }] }
  } finally {
    // 释放连接引用（连接池会管理连接生命周期，不会立即断开）
    await releaseSnapshotManager(currentTabId)
  }
}

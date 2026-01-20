import type { SnapshotManager } from '../utils/snapshotManager'
import { scrollNodeByUid } from '../utils/snapshotOperations'
import { checkSnapshotExists, getLatestSnapshotAfterOperation } from '../utils/utils'

/**
 * 处理滚动操作
 * @param manager 快照管理器
 * @param uid 节点 UID（可选，不提供则滚动页面）
 * @param x 水平滚动位置
 * @param y 垂直滚动位置
 * @param behavior 滚动行为
 * @returns 操作结果
 */
export async function handleScrollAction(
  manager: SnapshotManager,
  uid?: string,
  x?: number,
  y?: number,
  behavior?: 'auto' | 'smooth'
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  // 检查是否有快照
  const snapshotCheck = checkSnapshotExists(manager)
  if (snapshotCheck) {
    return snapshotCheck
  }

  // 执行滚动操作
  await scrollNodeByUid(manager, uid, { x, y, behavior: behavior || 'auto' })

  // 构建成功消息
  let message = '成功滚动'
  if (uid) {
    if (x !== undefined || y !== undefined) {
      message = `成功在节点 (UID: ${uid}) 内滚动到位置 (x: ${x || 0}, y: ${y || 0})。`
    } else {
      message = `成功将节点 (UID: ${uid}) 滚动到视图中。`
    }
  } else {
    message = `成功滚动页面到位置 (x: ${x || 0}, y: ${y || 0})。`
  }

  // 获取操作后的最新快照并返回
  return await getLatestSnapshotAfterOperation(manager, message)
}

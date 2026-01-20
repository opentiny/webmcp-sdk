import type { SnapshotManager } from '../utils/snapshotManager'
import { pasteIntoNodeByUid } from '../utils/snapshotOperations'
import { checkSnapshotExists, getLatestSnapshotAfterOperation } from '../utils/utils'

/**
 * 处理粘贴操作
 * @param manager 快照管理器
 * @param uid 节点 UID
 * @param text 要粘贴的文本
 * @returns 操作结果
 */
export async function handlePasteAction(
  manager: SnapshotManager,
  uid: string,
  text: string
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  // 检查是否有快照
  const snapshotCheck = checkSnapshotExists(manager)
  if (snapshotCheck) {
    return snapshotCheck
  }

  // 执行粘贴操作
  await pasteIntoNodeByUid(manager, uid, text)

  // 获取操作后的最新快照并返回
  return await getLatestSnapshotAfterOperation(manager, `成功在节点 (UID: ${uid}) 中粘贴文本: "${text}"。`)
}

import type { SnapshotManager } from '../utils/snapshotManager'
import { typeIntoNodeByUid } from '../utils/snapshotOperations'
import { checkSnapshotExists, getLatestSnapshotAfterOperation } from '../utils/utils'

/**
 * 处理输入操作
 * @param manager 快照管理器
 * @param uid 节点 UID
 * @param text 要输入的文本
 * @param clearFirst 是否先清空输入框
 * @returns 操作结果
 */
export async function handleFillAction(
  manager: SnapshotManager,
  uid: string,
  text: string,
  clearFirst: boolean = true
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  // 检查是否有快照
  const snapshotCheck = checkSnapshotExists(manager)
  if (snapshotCheck) {
    return snapshotCheck
  }

  // 执行输入操作
  await typeIntoNodeByUid(manager, uid, text, { clearFirst })

  // 获取操作后的最新快照并返回
  return await getLatestSnapshotAfterOperation(manager, `成功在节点 (UID: ${uid}) 中输入文本: "${text}"。`)
}

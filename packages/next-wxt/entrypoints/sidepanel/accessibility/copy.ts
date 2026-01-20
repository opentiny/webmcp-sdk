import type { SnapshotManager } from '../utils/snapshotManager'
import { copyFromNodeByUid } from '../utils/snapshotOperations'
import { checkSnapshotExists } from '../utils/utils'

/**
 * 处理复制操作
 * @param manager 快照管理器
 * @param uid 节点 UID
 * @returns 操作结果，包含复制的文本内容
 */
export async function handleCopyAction(
  manager: SnapshotManager,
  uid: string
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  // 检查是否有快照
  const snapshotCheck = checkSnapshotExists(manager)
  if (snapshotCheck) {
    return snapshotCheck
  }

  // 执行复制操作
  const copiedText = await copyFromNodeByUid(manager, uid)

  // 返回复制的文本内容
  const message = `成功从节点 (UID: ${uid}) 复制文本内容。\n\n复制的内容：\n${copiedText}`
  
  return {
    content: [{ type: 'text', text: message }]
  }
}

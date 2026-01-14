import type { SnapshotManager } from '../utils/snapshotManager'
import { clickNodeByUid } from '../utils/snapshotOperations'
import { checkSnapshotExists, getLatestSnapshotAfterOperation } from '../utils/utils'

/**
 * 处理点击操作
 * @param manager 快照管理器
 * @param uid 节点 UID
 * @param button 鼠标按钮类型
 * @param dblClick 是否双击
 * @returns 操作结果
 */
export async function handleClickAction(
  manager: SnapshotManager,
  uid: string,
  button?: 'left' | 'right' | 'middle',
  dblClick?: boolean
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  // 检查是否有快照
  const snapshotCheck = checkSnapshotExists(manager)
  if (snapshotCheck) {
    return snapshotCheck
  }

  // 执行点击操作
  await clickNodeByUid(manager, uid, {
    button: button || 'left',
    clickCount: dblClick ? 2 : 1
  })

  // 获取操作后的最新快照并返回
  return await getLatestSnapshotAfterOperation(manager, `成功${dblClick ? '双击' : '点击'}节点 (UID: ${uid})。`)
}

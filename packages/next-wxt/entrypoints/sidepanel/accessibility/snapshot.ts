import type { SnapshotManager } from '../utils/snapshotManager'
import { formatSnapshot } from '../utils/snapshotFormatter'
import { formatSnapshotResult } from '../utils/utils'

/**
 * 处理快照获取操作
 * @param manager 快照管理器
 * @returns 格式化的快照结果
 */
export async function handleSnapshotAction(manager: SnapshotManager): Promise<{
  content: Array<{ type: 'text'; text: string }>
}> {
  // 创建快照
  const snapshot = await manager.createTextSnapshot(false)

  // 格式化快照为文本
  const formattedSnapshot = formatSnapshot(snapshot)

  // 使用公共函数格式化结果
  const resultText = formatSnapshotResult(snapshot, formattedSnapshot, {
    verbose: false,
    includeUidExample: true
  })

  return { content: [{ type: 'text', text: resultText }] }
}

import type { SnapshotManager } from '../utils/snapshotManager'
import { snapshotManagerPool } from '../utils/snapshotManagerPool'
import { getCurrentTabId } from '../utils/utils'

/**
 * Snapshot 工具的参数类型
 */
export interface SnapshotActionParams {
  tabId?: number // 目标标签页 ID，如果不提供则使用当前活动标签页
  action: 'snapshot' | 'click' | 'fill' | 'scroll' | 'copy' | 'paste' // 操作类型
  uid?: string // 节点 UID（用于 click、fill、scroll、copy、paste 操作）
  button?: 'left' | 'right' | 'middle' // 鼠标按钮类型（用于 click 操作）
  dblClick?: boolean // 是否双击（用于 click 操作）
  text?: string // 要输入的文本（用于 fill 和 paste 操作）
  clearFirst?: boolean // 是否先清空输入框（用于 fill 操作）
  x?: number // 水平滚动位置（用于 scroll 操作）
  y?: number // 垂直滚动位置（用于 scroll 操作）
  behavior?: 'auto' | 'smooth' // 滚动行为（用于 scroll 操作）
}

/**
 * 获取快照管理器
 */
export async function getSnapshotManager(tabId?: number): Promise<{
  manager: SnapshotManager
  currentTabId: number
}> {
  const currentTabId = tabId || (await getCurrentTabId())
  const manager = await snapshotManagerPool.getManager(currentTabId)
  return { manager, currentTabId }
}

/**
 * 释放快照管理器
 */
export async function releaseSnapshotManager(tabId: number): Promise<void> {
  await snapshotManagerPool.releaseManager(tabId)
}

import { SnapshotManager } from './snapshotManager'

/**
 * 通过 UID 高亮 / 取消高亮节点
 */
export async function highlightNodeByUid(manager: SnapshotManager, uid: string, isHighlight: boolean): Promise<void> {
  const page = manager.getPage()
  if (!page) {
    throw new Error('页面未连接')
  }

  const handle = await manager.getElementHandleByUid(uid)
  if (!handle) {
    throw new Error(`无法获取元素句柄，UID: ${uid}`)
  }

  try {
    if (isHighlight) {
      await handle.evaluate((el: Element) => {
        if (el && (el as HTMLElement).style) (el as HTMLElement).style.outline = '2px solid #f2e5f3'
      })
    } else {
      await handle.evaluate((el: Element) => {
        if (el && (el as HTMLElement).style) (el as HTMLElement).style.outline = 'none'
      })
    }
  } finally {
    if (handle && typeof (handle as any).dispose === 'function') {
      await (handle as any).dispose()
    }
  }
}

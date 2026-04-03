import { SnapshotManager } from './snapshotManager'
import { delay, waitForEventsAfterAction } from './utils'

/**
 * 通过 UID 点击节点
 * @param manager 快照管理器
 * @param uid 节点 UID
 * @param options 点击选项
 */
export async function clickNodeByUid(
  manager: SnapshotManager,
  uid: string,
  options: { button?: 'left' | 'right' | 'middle'; clickCount?: number } = {}
): Promise<void> {
  const { button = 'left', clickCount = 1 } = options

  const page = manager.getPage()
  if (!page) {
    throw new Error('页面未连接')
  }

  // 获取 ElementHandle
  const handle = await manager.getElementHandleByUid(uid)

  if (!handle) {
    throw new Error(`无法获取元素句柄，UID: ${uid}`)
  }

  try {
    // 执行点击操作
    await waitForEventsAfterAction(page, async () => {
      const hasAsLocator = typeof (handle as any).asLocator === 'function'

      if (hasAsLocator) {
        // 使用 Locator API（推荐）
        const locator = (handle as any).asLocator()
        // 根据 button 参数确定是左键、右键还是中键点击
        await locator.click({ count: clickCount, button })
      }
    })
  } finally {
    // 确保清理资源
    if (handle && typeof (handle as any).dispose === 'function') {
      await (handle as any).dispose()
    }
  }
}

/**
 * 通过 UID 在节点中输入文本
 * @param manager 快照管理器
 * @param uid 节点 UID
 * @param text 要输入的文本
 * @param options 输入选项
 */
export async function typeIntoNodeByUid(
  manager: SnapshotManager,
  uid: string,
  text: string,
  options: { clearFirst?: boolean } = {}
): Promise<void> {
  const { clearFirst = true } = options

  const page = manager.getPage()
  if (!page) {
    throw new Error('页面未连接')
  }
  // 获取 ElementHandle
  const handle = await manager.getElementHandleByUid(uid)
  if (!handle) {
    throw new Error(`无法获取元素句柄，UID: ${uid}`)
  }

  try {
    await waitForEventsAfterAction(page, async () => {
      const hasAsLocator = typeof (handle as any).asLocator === 'function'

      // 先点击以聚焦
      if (!hasAsLocator) {
        throw new Error('无法获取元素句柄，UID: ${uid}')
      }

      // 使用 Locator API（推荐）
      const locator = (handle as any).asLocator()
      await locator.click()

      await delay(100)

      // 如果需要，先清空内容
      if (clearFirst) {
        // 全选并删除
        await page.keyboard.down('Control')
        await page.keyboard.press('a')
        await page.keyboard.up('Control')
        await page.keyboard.press('Delete')
        await delay(50)
      }

      await locator.fill(text)
    })
  } finally {
    // 确保清理资源
    if (handle && typeof (handle as any).dispose === 'function') {
      await (handle as any).dispose()
    }
  }
}

/**
 * 通过 UID 在下拉框中选择选项
 * @param manager 快照管理器
 * @param uid 下拉框节点 UID
 * @param optionValue 选项值或文本
 */
export async function selectOptionByUid(
  manager: SnapshotManager,
  uid: string,
  optionValue: string | number
): Promise<void> {
  const page = manager.getPage()
  if (!page) {
    throw new Error('页面未连接')
  }

  // 先点击下拉框
  await clickNodeByUid(manager, uid)
  await delay(200)

  // 获取快照中的下拉框节点
  const selectNode = manager.getNodeByUid(uid)
  if (!selectNode) {
    throw new Error(`未找到下拉框节点，UID: ${uid}`)
  }

  // 查找匹配的选项节点
  const findOptionNode = (node: any): any => {
    if (!node.children || node.children.length === 0) {
      return null
    }

    for (const child of node.children) {
      const role = typeof child.role === 'string' ? child.role : child.role?.value
      const name = typeof child.name === 'string' ? child.name : child.name?.value
      const value = typeof child.value === 'string' ? child.value : child.value?.value

      // 检查是否是选项节点
      if (role === 'option' || role === 'menuitem') {
        // 按值或文本匹配
        if (typeof optionValue === 'number') {
          // 按索引匹配
          const index = parseInt(String(value || 0))
          if (index === optionValue) {
            return child
          }
        } else {
          // 按值或文本匹配
          if (value === optionValue || name === optionValue || name?.includes(optionValue)) {
            return child
          }
        }
      }

      // 递归查找子节点
      const found = findOptionNode(child)
      if (found) {
        return found
      }
    }

    return null
  }

  const optionNode = findOptionNode(selectNode)
  if (!optionNode) {
    throw new Error(`未找到选项: ${optionValue}`)
  }

  // 点击选项
  await clickNodeByUid(manager, optionNode.id)
}

/**
 * 通过 UID 滚动节点到视图中或在节点内滚动
 * @param manager 快照管理器
 * @param uid 节点 UID（可选，不提供则滚动页面）
 * @param options 滚动选项
 */
export async function scrollNodeByUid(
  manager: SnapshotManager,
  uid?: string,
  options: { x?: number; y?: number; behavior?: 'auto' | 'smooth' } = {}
): Promise<void> {
  const page = manager.getPage()
  if (!page) {
    throw new Error('页面未连接')
  }

  const { x, y, behavior = 'auto' } = options

  try {
    await waitForEventsAfterAction(page, async () => {
      if (uid) {
        // 滚动特定元素
        const handle = await manager.getElementHandleByUid(uid)
        if (!handle) {
          throw new Error(`无法获取元素句柄，UID: ${uid}`)
        }

        try {
          // 如果提供了 x 或 y，则在元素内滚动；否则将元素滚动到视图中
          if (x !== undefined || y !== undefined) {
            await page.evaluate(
              (el: Element, scrollX: number, scrollY: number, scrollBehavior: ScrollBehavior) => {
                el.scrollTo({ left: scrollX, top: scrollY, behavior: scrollBehavior })
              },
              handle as any,
              x || 0,
              y || 0,
              behavior
            )
          } else {
            await page.evaluate(
              (el: Element, scrollBehavior: ScrollBehavior) => {
                el.scrollIntoView({ behavior: scrollBehavior, block: 'center' })
              },
              handle as any,
              behavior
            )
          }
        } finally {
          // 确保清理资源
          if (handle && typeof (handle as any).dispose === 'function') {
            await (handle as any).dispose()
          }
        }
      } else {
        // 滚动整个页面
        await page.evaluate(
          (scrollX: number, scrollY: number, scrollBehavior: ScrollBehavior) => {
            window.scrollTo({ left: scrollX, top: scrollY, behavior: scrollBehavior })
          },
          x || 0,
          y || 0,
          behavior
        )
      }
    })

    // 等待滚动完成
    await delay(behavior === 'smooth' ? 500 : 100)
  } catch (error) {
    throw new Error(`滚动操作失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * 通过 UID 复制节点的文本内容
 * @param manager 快照管理器
 * @param uid 节点 UID
 * @returns 复制的文本内容
 */
export async function copyFromNodeByUid(manager: SnapshotManager, uid: string): Promise<string> {
  const page = manager.getPage()
  if (!page) {
    throw new Error('页面未连接')
  }

  // 获取 ElementHandle
  const handle = await manager.getElementHandleByUid(uid)
  if (!handle) {
    throw new Error(`无法获取元素句柄，UID: ${uid}`)
  }

  try {
    // 获取元素的文本内容
    const text = await page.evaluate((el: Element) => {
      // 如果是输入框，返回其值
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        return el.value
      }
      // 否则返回文本内容
      return el.textContent || ''
    }, handle as any)

    return text
  } finally {
    // 确保清理资源
    if (handle && typeof (handle as any).dispose === 'function') {
      await (handle as any).dispose()
    }
  }
}

/**
 * 通过 UID 粘贴文本到节点中
 * @param manager 快照管理器
 * @param uid 节点 UID
 * @param text 要粘贴的文本
 */
export async function pasteIntoNodeByUid(manager: SnapshotManager, uid: string, text: string): Promise<void> {
  const page = manager.getPage()
  if (!page) {
    throw new Error('页面未连接')
  }

  // 获取 ElementHandle
  const handle = await manager.getElementHandleByUid(uid)
  if (!handle) {
    throw new Error(`无法获取元素句柄，UID: ${uid}`)
  }

  try {
    await waitForEventsAfterAction(page, async () => {
      const hasAsLocator = typeof (handle as any).asLocator === 'function'

      if (!hasAsLocator) {
        throw new Error('无法获取元素定位器')
      }

      // 使用 Locator API
      const locator = (handle as any).asLocator()

      // 先点击以聚焦
      await locator.click()
      await delay(100)

      // 使用键盘模拟粘贴操作（更贴近真实用户行为）
      // 先全选
      await page.keyboard.down('Control')
      await page.keyboard.press('a')
      await page.keyboard.up('Control')
      await delay(50)

      // 输入文本（模拟粘贴）
      await locator.fill(text)
    })
  } finally {
    // 确保清理资源
    if (handle && typeof (handle as any).dispose === 'function') {
      await (handle as any).dispose()
    }
  }
}
/**
 * 通过 UID 高亮节点
 * @param manager 快照管理器
 * @param uid 节点 UID
 */
export async function highlightNodeByUid(manager: SnapshotManager, uid: string, isHighlight: boolean): Promise<void> {
  const page = manager.getPage()
  if (!page) {
    throw new Error('页面未连接')
  }

  // 获取 ElementHandle
  const handle = await manager.getElementHandleByUid(uid)
  if (!handle) {
    throw new Error(`无法获取元素句柄，UID: ${uid}`)
  }

  try {
    if (isHighlight) {
      await handle.evaluate((el: Element) => {
        if (el && el.style) {
          el.style.outline = '2px solid #f2e5f3'
        }
      })
    } else {
      await handle.evaluate((el: Element) => {
        if (el && el.style) {
          el.style.outline = 'none'
        }
      })
    }
  } finally {
    // 确保清理资源
    if (handle && typeof (handle as any).dispose === 'function') {
      await (handle as any).dispose()
    }
  }
}

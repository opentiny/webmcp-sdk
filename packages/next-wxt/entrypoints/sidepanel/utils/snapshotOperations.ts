// 快照操作工具
// 参考 chrome-devtools-mcp 的操作方式
// 提供点击、输入等公共操作方法

import type { ElementHandle } from 'puppeteer-core'
import { SnapshotManager } from './snapshotManager'

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 等待 DOM 稳定
 * 参考 chrome-devtools-mcp 的 waitForStableDom
 */
async function waitForStableDom(page: any, timeout = 5000): Promise<void> {
  try {
    // 简单的延迟等待，100ms 后认为 DOM 稳定
    // 更精确的实现需要使用 CDP 的 DOM 事件监听
    await delay(100)

    // 可选：等待网络空闲
    try {
      await page.waitForLoadState?.('networkidle', { timeout: Math.min(timeout, 2000) }).catch(() => {
        // 如果超时，忽略错误
      })
    } catch {
      // 如果 waitForLoadState 不存在，忽略
    }
  } catch (error: any) {
    // 如果等待失败，忽略错误，继续执行
    console.warn('等待 DOM 稳定失败:', error)
  }
}

/**
 * 等待导航完成
 * 参考 chrome-devtools-mcp 的 waitForNavigation
 */
async function waitForNavigation(page: any, timeout = 30000): Promise<void> {
  try {
    // 尝试等待导航完成
    await Promise.race([
      page.waitForNavigation?.({ timeout, waitUntil: 'networkidle0' }).catch(() => {
        // 如果没有导航，返回
        return Promise.resolve()
      }),
      delay(Math.min(timeout, 5000)).then(() => {
        // 5秒后如果没有导航，返回
        return Promise.resolve()
      })
    ])
  } catch (error: any) {
    // 如果导航超时或没有导航，忽略错误
    console.warn('等待导航失败:', error)
  }
}

/**
 * 执行操作并等待事件
 * 参考 chrome-devtools-mcp 的 waitForEventsAfterAction
 */
async function waitForEventsAfterAction(page: any, action: () => Promise<void>): Promise<void> {
  try {
    // 启动导航监听（如果有）
    const navigationPromise = waitForNavigation(page).catch(() => {
      // 如果没有导航，忽略错误
    })

    // 执行操作
    await action()

    // 等待导航完成（如果有）
    await navigationPromise

    // 等待 DOM 稳定
    await waitForStableDom(page)
  } catch (error: any) {
    throw new Error(`操作后等待事件失败: ${error.message}`)
  }
}

/**
 * 通过 UID 点击节点
 * 参考 chrome-devtools-mcp 的 click 工具
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
    // 参考 chrome-devtools-mcp: handle.asLocator().click()
    await waitForEventsAfterAction(page, async () => {
      if (typeof (handle as any).asLocator === 'function') {
        const locator = (handle as any).asLocator()
        await locator.click({ count: clickCount })
      } else {
        // 如果不支持 asLocator，使用原生 click
        if (clickCount === 1) {
          await handle.click({ button })
        } else {
          // 多次点击
          for (let i = 0; i < clickCount; i++) {
            await handle.click({ button })
            if (i < clickCount - 1) {
              await delay(50)
            }
          }
        }
      }
    })
  } finally {
    await handle.dispose()
  }
}

/**
 * 通过 UID 在节点中输入文本
 * 参考 chrome-devtools-mcp 的 fill 工具
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
      // 先点击以聚焦
      if (typeof (handle as any).asLocator === 'function') {
        const locator = (handle as any).asLocator()
        await locator.click()
      } else {
        await handle.click()
      }

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

      // 输入文本
      if (typeof (handle as any).asLocator === 'function') {
        const locator = (handle as any).asLocator()
        await locator.fill(text)
      } else {
        await handle.type(text, { delay: 10 })
      }
    })
  } finally {
    await handle.dispose()
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

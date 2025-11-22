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
      // 检查 handle 是否有 click 方法（ElementHandle）
      const hasClickMethod = typeof (handle as any).click === 'function'
      const hasAsLocator = typeof (handle as any).asLocator === 'function'

      if (hasAsLocator) {
        // 使用 Locator API（推荐）
        const locator = (handle as any).asLocator()
        await locator.click({ count: clickCount })
      } else if (hasClickMethod) {
        // 使用 ElementHandle 的 click 方法
        if (clickCount === 1) {
          await (handle as any).click({ button })
        } else {
          // 多次点击
          for (let i = 0; i < clickCount; i++) {
            await (handle as any).click({ button })
            if (i < clickCount - 1) {
              await delay(50)
            }
          }
        }
      } else {
        // 如果 handle 没有 click 方法，尝试通过 evaluate 来点击
        // 这可能是一个 JSHandle 而不是 ElementHandle
        for (let i = 0; i < clickCount; i++) {
          await handle.evaluate((el: Element) => {
            if (el && typeof (el as HTMLElement).click === 'function') {
              ;(el as HTMLElement).click()
            }
          })
          if (i < clickCount - 1) {
            await delay(50)
          }
        }
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
      // 检查 handle 是否有 click 方法（ElementHandle）
      // 如果 handle 是 JSHandle，需要通过 evaluate 来操作
      const hasClickMethod = typeof (handle as any).click === 'function'
      const hasAsLocator = typeof (handle as any).asLocator === 'function'
      const hasTypeMethod = typeof (handle as any).type === 'function'

      // 先点击以聚焦
      if (hasAsLocator) {
        // 使用 Locator API（推荐）
        const locator = (handle as any).asLocator()
        await locator.click()
      } else if (hasClickMethod) {
        // 使用 ElementHandle 的 click 方法
        await (handle as any).click()
      } else {
        // 如果 handle 没有 click 方法，尝试通过 evaluate 来聚焦
        // 这可能是一个 JSHandle 而不是 ElementHandle
        try {
          await handle.evaluate((el: Element) => {
            if (el && typeof (el as HTMLElement).focus === 'function') {
              ;(el as HTMLElement).focus()
            }
            if (el && typeof (el as HTMLElement).click === 'function') {
              ;(el as HTMLElement).click()
            }
          })
        } catch (e) {
          console.warn('通过 evaluate 聚焦元素失败:', e)
          // 如果 evaluate 也失败，尝试使用键盘导航到元素
          // 这是一个备用方案
        }
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
      if (hasAsLocator) {
        // 使用 Locator API 的 fill 方法（推荐）
        const locator = (handle as any).asLocator()
        await locator.fill(text)
      } else if (hasTypeMethod) {
        // 使用 ElementHandle 的 type 方法
        await (handle as any).type(text, { delay: 10 })
      } else {
        // 如果 handle 没有 type 方法，尝试通过 evaluate 来输入文本
        // 或者直接使用键盘输入
        try {
          // 方法 1: 尝试通过 evaluate 设置 value（适用于 input 元素）
          const success = await handle.evaluate((el: Element, value: string) => {
            if (el && typeof (el as HTMLInputElement).value !== 'undefined') {
              ;(el as HTMLInputElement).value = value
              // 触发 input 事件
              el.dispatchEvent(new Event('input', { bubbles: true }))
              el.dispatchEvent(new Event('change', { bubbles: true }))
              return true
            }
            return false
          }, text)

          // 方法 2: 如果设置 value 失败，直接使用键盘输入
          if (!success) {
            await page.keyboard.type(text, { delay: 10 })
          }
        } catch (e) {
          console.warn('通过 evaluate 输入文本失败，使用键盘输入:', e)
          // 最后的手段：直接使用键盘输入
          await page.keyboard.type(text, { delay: 10 })
        }
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

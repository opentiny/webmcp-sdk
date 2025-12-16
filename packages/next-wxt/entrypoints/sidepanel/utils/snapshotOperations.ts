import { SnapshotManager } from './snapshotManager'
import { delay, waitForEventsAfterAction } from './utils'

/**
 * 通过坐标点击页面
 * 参考 FARA-7B 的实现方式：直接通过像素坐标操作
 * @param manager 快照管理器
 * @param x X 坐标（像素），相对于页面左上角
 * @param y Y 坐标（像素），相对于页面左上角
 * @param options 点击选项
 */
export async function clickByCoordinate(
  manager: SnapshotManager,
  x: number,
  y: number,
  options: { button?: 'left' | 'right' | 'middle'; clickCount?: number } = {}
): Promise<void> {
  const { button = 'left', clickCount = 1 } = options
  const page = manager.getPage()

  if (!page) {
    throw new Error('页面未连接')
  }

  // 获取页面的设备像素比和视口尺寸，用于坐标转换
  // Puppeteer 截图会考虑 devicePixelRatio，实际截图像素尺寸 = CSS尺寸 × devicePixelRatio
  // 如果 AI 返回的是截图像素坐标，需要转换为 CSS 像素坐标
  const pageInfo = await page.evaluate(() => {
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      scrollX: window.scrollX || window.pageXOffset || 0,
      scrollY: window.scrollY || window.pageYOffset || 0
    }
  })

  // 计算实际截图尺寸（考虑设备像素比）
  const actualScreenshotWidth = pageInfo.viewportWidth * pageInfo.devicePixelRatio
  const actualScreenshotHeight = pageInfo.viewportHeight * pageInfo.devicePixelRatio

  // 如果坐标超过 CSS 视口尺寸，可能是截图像素坐标，需要转换为 CSS 坐标
  // 判断标准：如果坐标超过 CSS 视口尺寸的 1.2 倍，认为是截图像素坐标
  let cssX = x
  let cssY = y

  if (x > pageInfo.viewportWidth * 1.2 || y > pageInfo.viewportHeight * 1.2) {
    // 坐标看起来是基于截图像素坐标，需要转换为 CSS 坐标
    cssX = x / pageInfo.devicePixelRatio
    cssY = y / pageInfo.devicePixelRatio
    console.log(
      `坐标转换：截图像素坐标 (${x}, ${y}) -> CSS坐标 (${cssX}, ${cssY})，设备像素比：${pageInfo.devicePixelRatio}`
    )
  }

  // 使用 Puppeteer 的鼠标 API 点击坐标
  // 注意：坐标是相对于页面视口的 CSS 像素坐标
  await waitForEventsAfterAction(page, async () => {
    await page.mouse.click(cssX, cssY, {
      button,
      clickCount
    })
  })
}

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

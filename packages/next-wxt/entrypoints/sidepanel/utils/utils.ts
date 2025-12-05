export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 获取当前活动标签页 ID
export const getCurrentTabId = async (): Promise<number> => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true })
  if (!tabs[0]?.id) {
    throw new Error('无法获取当前活动标签页')
  }
  return tabs[0].id
}

/**
 * 等待标签页加载完成
 * @param tabId 标签页 ID
 * @param timeout 超时时间（毫秒），默认 30 秒
 * @returns Promise<void>
 */
export const waitForTabLoad = (tabId: number, timeout = 30000): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 设置超时
    const timeoutId = setTimeout(() => {
      browser.tabs.onUpdated.removeListener(listener)
      reject(new Error(`等待标签页 ${tabId} 加载超时`))
    }, timeout)

    // 监听标签页更新事件
    const listener: Parameters<typeof browser.tabs.onUpdated.addListener>[0] = (updatedTabId, changeInfo, tab) => {
      // 只处理目标标签页
      if (updatedTabId !== tabId) return

      // 检查状态是否为 'complete'（页面加载完成）
      if (changeInfo.status === 'complete') {
        clearTimeout(timeoutId)
        browser.tabs.onUpdated.removeListener(listener)
        resolve()
      }
    }

    // 添加监听器
    browser.tabs.onUpdated.addListener(listener)

    // 立即检查一次，可能标签页已经加载完成
    browser.tabs
      .get(tabId)
      .then((tab) => {
        if (tab.status === 'complete') {
          clearTimeout(timeoutId)
          browser.tabs.onUpdated.removeListener(listener)
          resolve()
        }
      })
      .catch(() => {
        // 如果获取失败，继续等待监听器触发
      })
  })
}

/**
 * 执行操作并等待事件
 */
export const waitForEventsAfterAction = async (page: any, action: () => Promise<void>): Promise<void> => {
  try {
    // 执行操作
    await action()
  } catch (error: any) {
    throw new Error(`操作后等待事件失败: ${error.message}`)
  }
}

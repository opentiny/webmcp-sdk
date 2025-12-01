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
 * 等待 DOM 稳定
 */
export const waitForStableDom = async (page: any, timeout = 5000): Promise<void> => {
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
 */
export const waitForNavigation = async (page: any, timeout = 30000): Promise<void> => {
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
 */
export const waitForEventsAfterAction = async (page: any, action: () => Promise<void>): Promise<void> => {
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

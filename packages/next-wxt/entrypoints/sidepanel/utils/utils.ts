export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 获取当前活动标签页 ID */
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
 */
export const waitForTabLoad = (tabId: number, timeout = 30000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      browser.tabs.onUpdated.removeListener(listener)
      reject(new Error(`等待标签页 ${tabId} 加载超时`))
    }, timeout)

    const listener: Parameters<typeof browser.tabs.onUpdated.addListener>[0] = (updatedTabId, changeInfo) => {
      if (updatedTabId !== tabId) return
      if (changeInfo.status === 'complete') {
        clearTimeout(timeoutId)
        browser.tabs.onUpdated.removeListener(listener)
        resolve()
      }
    }

    browser.tabs.onUpdated.addListener(listener)

    browser.tabs
      .get(tabId)
      .then((tab) => {
        if (tab.status === 'complete') {
          clearTimeout(timeoutId)
          browser.tabs.onUpdated.removeListener(listener)
          resolve()
        }
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        browser.tabs.onUpdated.removeListener(listener)
        reject(error)
      })
  })
}

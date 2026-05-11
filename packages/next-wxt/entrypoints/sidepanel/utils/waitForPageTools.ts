/**
 * 等待指定 Tab 的页面工具注册完成（握手）。
 *
 * 适用于 tabs-manager open/switch 操作后，在返回结果前确保新页面的工具已进入大模型上下文。
 * 工具注册完成后，mcpServer.ts 会通过 browser.runtime.sendMessage 发出 page-tools-updated 消息。
 *
 * @param tabId - 目标 Tab ID，用于校验消息是否属于该 Tab
 * @param timeoutMs - 超时时间（ms），默认 8000ms；超时则直接放行（该页面可能没有 WebMCP 工具）
 */
export const waitForPageToolsReady = async (tabId: number, timeoutMs = 5000): Promise<void> => {
  // 1. 尝试主动探测：如果 content script 已经就绪（page-agent-tool 可用），直接放行
  try {
    const res = await browser.tabs.sendMessage(tabId, { type: 'PAGE_CONTROL', action: 'ping' })
    if (res?.success) return
  } catch (e) {
    // 忽略错误，继续走被动监听逻辑
  }

  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      // 超时放行：该页面没有注册 WebMCP 工具，或工具注册耗时过长
      browser.runtime.onMessage.removeListener(listener)
      resolve()
    }, timeoutMs)

    const listener = (message: any) => {
      if (message.type === 'page-tools-updated' && message.tabId === tabId) {
        clearTimeout(timer)
        browser.runtime.onMessage.removeListener(listener)
        resolve()
      }
    }
    browser.runtime.onMessage.addListener(listener)
  })
}

import { onPageToolsUpdated, forceRefreshTools } from '../mcpServer'

/**
 * 等待指定 Tab 的页面工具注册完成（握手）。
 *
 * 适用于 tabs-manager open/switch 操作后，在返回结果前确保新页面的工具已进入大模型上下文。
 * 工具同步完成后 mcpServer 会触发 onPageToolsUpdated（同页），并广播 page-tools-updated（跨上下文）。
 *
 * @param tabId - 目标 Tab ID，用于校验消息是否属于该 Tab
 * @param timeoutMs - 超时时间（ms）；超时则直接放行（该页面可能没有 WebMCP 工具）
 */
export const waitForPageToolsReady = async (tabId: number, timeoutMs = 5000): Promise<void> => {
  return new Promise<void>((resolve) => {
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      onPageToolsUpdated.delete(onLocalUpdate)
      browser.runtime.onMessage.removeListener(onRuntimeMessage)
      resolve()
    }

    const timer = setTimeout(done, timeoutMs)

    const onLocalUpdate = (updatedTabId: number) => {
      if (updatedTabId === tabId) done()
    }
    onPageToolsUpdated.add(onLocalUpdate)

    const onRuntimeMessage = (message: any) => {
      if (message.type === 'page-tools-updated' && message.tabId === tabId) done()
    }
    browser.runtime.onMessage.addListener(onRuntimeMessage)

    // content 已就绪时主动触发一次同步（避免事件在监听注册前已发出而错过）
    browser.tabs
      .sendMessage(tabId, { type: 'PAGE_CONTROL', action: 'ping' })
      .then((res) => {
        if (res?.success) return forceRefreshTools?.(tabId)
      })
      .catch(() => {})
  })
}

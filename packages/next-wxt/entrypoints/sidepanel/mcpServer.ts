import { getCurrentTabId } from './utils/utils'
import { useExtraTools } from './extraTools'

/**
 * 注册侧边栏本地工具及页面代理工具到内置 WebMCP（navigator.modelContext）。
 * 无需 WebMcpServer 或 Zod 转换，直接使用原生 JSON Schema。
 */
export const setupLocalTools = () => {
  const nativeCtx = (document as any).modelContext || (navigator as any).modelContext

  if (!nativeCtx) {
    console.warn('【setupLocalTools】document.modelContext 未就绪，跳过工具注册')
    return
  }

  // 1. 注册插件内置辅助工具（tabs-manager, accessibility, visual 等）
  useExtraTools(nativeCtx)

  // 2. 记录已注册的页面代理工具，防止重复注册
  const registeredProxyTools = new Set<string>()

  /**
   * 清除所有已注册的页面代理工具（Tab 切换时调用）
   * 从 nativeCtx 取消注册，并清空 Set，确保旧 Tab 工具不残留
   */
  const clearProxyTools = () => {
    if (registeredProxyTools.size === 0) return
    registeredProxyTools.forEach((name) => {
      try {
        nativeCtx.unregisterTool?.(name)
      } catch {
        // 忽略取消注册错误
      }
    })
    registeredProxyTools.clear()
  }

  /**
   * 从 background 获取指定 Tab 的页面工具，代理注册到 nativeCtx。
   * 纯数据同步，不发送任何消息通知 —— 供外部（useBrowserExtensions）调用，
   * 调用方自行决定何时刷新 UI。
   */
  const syncPageProxy = async (tabId: number): Promise<void> => {
    clearProxyTools()

    const tools: any[] = await browser.runtime.sendMessage({
      type: 'get-page-tools',
      tabId
    })

    if (!tools || !Array.isArray(tools) || tools.length === 0) return

    tools.forEach((tool) => {
      if (registeredProxyTools.has(tool.name)) return
      registeredProxyTools.add(tool.name)

      nativeCtx.registerTool({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        execute: async (args: any) => {
          const activeTabId = await getCurrentTabId()
          if (!activeTabId) {
            return { content: [{ type: 'text', text: 'Error: No active tab found' }] }
          }

          const res = await browser.runtime.sendMessage({
            type: 'execute-page-tool',
            tabId: activeTabId,
            toolName: tool.name,
            args
          })

          if (!res?.success) {
            return { content: [{ type: 'text', text: `Error: ${res?.error || 'Unknown error'}` }] }
          }

          if (res.result?.content) return res.result

          return {
            content: [
              {
                type: 'text',
                text: typeof res.result === 'string' ? res.result : JSON.stringify(res.result)
              }
            ]
          }
        }
      })
    })
  }

  // 3. 动态获取当前 Tab 工具并代理，完成后通知 UI 刷新
  //    由 tabs.onActivated / tabs.onUpdated 驱动，此路径负责发消息通知 UI
  const refreshPageTools = async () => {
    try {
      const tabId = await getCurrentTabId()
      if (!tabId) return

      await syncPageProxy(tabId)

      // 通知侧边栏 UI 刷新
      browser.runtime.sendMessage({ type: 'page-tools-updated', tabId }).catch(() => {})
    } catch (err) {
      console.warn('【setupLocalTools】刷新页面工具代理失败:', err)
    }
  }

  // 初始加载
  refreshPageTools()

  // 监听 Tab 切换，清除旧工具并加载新 Tab 的工具
  browser.tabs.onActivated.addListener(refreshPageTools)
  browser.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
      refreshPageTools()
    }
  })

  // 将 syncPageProxy 挂到模块级变量，供 useBrowserExtensions 访问
  // 这样 page-tools-updated 消息到来时，可以先同步代理工具再刷新 UI
  exportedSyncPageProxy = syncPageProxy
}

/**
 * 模块级暴露：同步当前 Tab 的页面工具到 nativeCtx，但不发通知消息。
 * 由 useBrowserExtensions 在收到 content.ts 的 page-tools-updated 时调用，
 * 确保 nativeCtx 里的代理工具是最新的，再让 refreshPluginTools 刷新 UI。
 */
export let exportedSyncPageProxy: ((tabId: number) => Promise<void>) | null = null

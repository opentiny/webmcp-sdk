import { getCurrentTabId } from './utils/utils'
import { useExtraTools } from './extraTools'

/**
 * 注册侧边栏本地工具及页面代理工具到内置 WebMCP（document.modelContext）。
 * 无需 WebMcpServer 或 Zod 转换，直接使用原生 JSON Schema。
 */
let isSetupLocalToolsCalled = false

export const setupLocalTools = () => {
  if (isSetupLocalToolsCalled) return
  isSetupLocalToolsCalled = true

  let nativeCtx: any = null
  if (typeof document !== 'undefined') nativeCtx = nativeCtx || (document as any).modelContext
  if (typeof navigator !== 'undefined') nativeCtx = nativeCtx || (navigator as any).modelContext
  nativeCtx = nativeCtx || (globalThis as any).modelContext

  if (!nativeCtx) {
    console.log('【setupLocalTools】初始化 fallback modelContext (针对 Background Service Worker)')
    nativeCtx = {
      _tools: new Map(),
      getTools: async () => Array.from(nativeCtx._tools.values()),
      registerTool: (tool: any) => nativeCtx._tools.set(tool.name, tool),
      unregisterTool: (name: string) => nativeCtx._tools.delete(name),
      executeTool: async (tool: any, argsStr: string) => {
        const args = argsStr ? JSON.parse(argsStr) : {}
        return await tool.execute(args)
      }
    }
    ;(globalThis as any).modelContext = nativeCtx
  }

  // 1. 注册插件内置辅助工具（tabs-manager、page-agent-tool 等）
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

  let currentSyncTabId: number | null = null

  /**
   * 从 background 获取指定 Tab 的页面工具，代理注册到 nativeCtx。
   * 纯数据同步，不发送任何消息通知 —— 供外部（useBrowserExtensions）调用，
   * 调用方自行决定何时刷新 UI。
   */
  const syncPageProxy = async (tabId: number): Promise<void> => {
    currentSyncTabId = tabId
    let tools: any[] = []
    try {
      console.log('【syncPageProxy】开始执行 executeScript, tabId:', tabId)
      const execRes = await browser.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: () => {
          try {
            let pageTools = []
            if (typeof (window as any).__nextSdkRegisteredTools === 'function') {
              pageTools = (window as any).__nextSdkRegisteredTools()
            } else if ((document as any).modelContext?.getTools) {
              const res = (document as any).modelContext.getTools()
              pageTools = Array.isArray(res) ? res : []
            }
            return pageTools.map((t: any) => ({
              name: t.name,
              title: t.title,
              description: t.description,
              inputSchema: t.inputSchema
            }))
          } catch (e: any) {
            return [{ name: '__error_in_page', description: e.message }]
          }
        }
      })
      tools = execRes[0]?.result || []
      console.log('【syncPageProxy】获取到了页面工具:', tools)
    } catch (err) {
      console.warn('【syncPageProxy】获取页面工具失败:', err)
    }

    if (currentSyncTabId !== tabId) {
      console.log('【syncPageProxy】并发调用丢弃旧的 tabId:', tabId)
      return
    }

    clearProxyTools()

    if (!tools || !Array.isArray(tools) || tools.length === 0) {
      console.log('【syncPageProxy】页面工具为空或无效')
      return
    }

    tools.forEach((tool) => {
      if (registeredProxyTools.has(tool.name)) return
      registeredProxyTools.add(tool.name)

      nativeCtx.registerTool({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        execute: async (args: any) => {
          let activeTabId = currentSyncTabId
          if (!activeTabId) {
            return { content: [{ type: 'text', text: 'Error: No active tab found' }] }
          }

          let res: any = null
          try {
            const execRes = await browser.scripting.executeScript({
              target: { tabId: activeTabId },
              world: 'MAIN',
              func: async (name: string, inputStr: string) => {
                try {
                  const ctx = (document as any).modelContext
                  if (!ctx) throw new Error('WebMCP is not initialized on this page')
                  const tools = await ctx.getTools()
                  const toolObj = tools.find((t: any) => t.name === name)
                  if (!toolObj) throw new Error(`Tool ${name} not found`)
                  const execRes = await ctx.executeTool(toolObj, inputStr)
                  return { success: true, result: execRes }
                } catch (e: any) {
                  return { success: false, error: e.message }
                }
              },
              args: [tool.name, JSON.stringify(args)]
            })
            res = execRes[0]?.result
          } catch (err: any) {
            console.warn('【syncPageProxy】执行页面工具失败:', err)
            res = { success: false, error: err.message }
          }

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
  const refreshPageTools = async (targetTabId?: number) => {
    try {
      const tabId = targetTabId || (await getCurrentTabId())
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

  // 监听内容脚本工具注入完成事件，这是最准确的获取时机
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'page-tools-injected') {
      refreshPageTools(message.tabId)
    }
  })

  // 监听 Tab 切换，清除旧工具并加载新 Tab 的工具
  browser.tabs.onActivated.addListener((activeInfo) => refreshPageTools(activeInfo.tabId))
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
      refreshPageTools(tabId)
    }
  })

  // 导出刷新函数供其他模块主动调用
  forceRefreshTools = refreshPageTools

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

export let forceRefreshTools: (() => Promise<void>) | null = null

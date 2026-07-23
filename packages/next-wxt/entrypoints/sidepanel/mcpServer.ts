import { getCurrentTabId } from './utils/utils'
import { useExtraTools } from './extraTools'

/**
 * 注册侧边栏本地工具及页面代理工具到内置 WebMCP（document.modelContext）。
 * 无需 WebMcpServer 或 Zod 转换，直接使用原生 JSON Schema。
 */
let isSetupLocalToolsCalled = false

/**
 * 页面工具同步完成后的回调集合。
 * 工具已注册到 nativeCtx 之后才触发，订阅方可以安全地发送 notifications/tools/list_changed。
 */
export const onPageToolsUpdated = new Set<(tabId: number) => void>()

/** setupLocalTools 使用的 modelContext，供 remoter 注册 builtin 时复用同一引用 */
export let sidepanelModelContext: any = null

export const setupLocalTools = () => {
  if (isSetupLocalToolsCalled) return
  isSetupLocalToolsCalled = true

  let nativeCtx: any = null
  if (typeof document !== 'undefined') nativeCtx = nativeCtx || (document as any).modelContext
  nativeCtx = nativeCtx || (globalThis as any).modelContext

  if (!nativeCtx) {
    console.log('setupLocalTools: init fallback modelContext')
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
    if (typeof document !== 'undefined') {
      try {
        Object.defineProperty(document, 'modelContext', {
          configurable: true,
          get: () => nativeCtx
        })
      } catch {
        ;(document as any).modelContext = nativeCtx
      }
    }
  }

  sidepanelModelContext = nativeCtx

  // 1. 注册插件内置辅助工具
  useExtraTools(nativeCtx)

  // 2. 记录已注册的页面代理工具，防止重复注册
  const registeredProxyTools = new Set<string>()

  const clearProxyTools = () => {
    if (registeredProxyTools.size === 0) return
    registeredProxyTools.forEach((name) => {
      try {
        nativeCtx.unregisterTool?.(name)
      } catch {
        // ignore
      }
    })
    registeredProxyTools.clear()
  }

  let currentSyncTabId: number | null = null
  let refreshSeq = 0

  const syncPageProxy = async (tabId: number): Promise<void> => {
    const tabInfo = await browser.tabs.get(tabId)
    // 先检查 staleness，再做任何副作用，避免 TOCTOU 问题
    if (currentSyncTabId !== tabId) {
      console.log('syncPageProxy: drop stale tabId', tabId)
      return
    }
    if (tabInfo.url && (tabInfo.url.startsWith('chrome://') || tabInfo.url.startsWith('edge://') || tabInfo.url.startsWith('about:'))) {
      console.log('syncPageProxy: cannot access chrome/edge/about URL')
      clearProxyTools()
      return
    }

    let tools: any[] = []
    try {
      console.log('syncPageProxy: executeScript tabId', tabId)
      const execRes = await browser.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: async () => {
          try {
            const ctx = (document as any).modelContext
            if (!ctx?.getTools) return []
            const res = await ctx.getTools()
            const pageTools = Array.isArray(res) ? res : []
            return pageTools.map((t: any) => {
              let inputSchema: unknown = { type: 'object', properties: {} }
              try {
                if (typeof t.inputSchema === 'string') {
                  inputSchema = JSON.parse(t.inputSchema)
                } else if (t.inputSchema && typeof t.inputSchema === 'object') {
                  inputSchema = JSON.parse(JSON.stringify(t.inputSchema))
                }
              } catch {
                inputSchema = { type: 'object', properties: {} }
              }
              return {
                name: String(t.name || ''),
                title: t.title != null ? String(t.title) : undefined,
                description: t.description != null ? String(t.description) : '',
                inputSchema
              }
            })
          } catch {
            return []
          }
        }
      })
      tools = (execRes[0]?.result || []).filter((t: any) => t?.name)
      console.log('syncPageProxy: got tools', tools.map((t: any) => t.name))
    } catch (err) {
      console.warn('syncPageProxy: executeScript failed', err)
    }

    if (currentSyncTabId !== tabId) {
      console.log('syncPageProxy: drop stale tabId after script', tabId)
      return
    }

    clearProxyTools()

    if (!tools || !Array.isArray(tools) || tools.length === 0) {
      console.log('syncPageProxy: no tools')
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
        execute: async (args: unknown) => {
          const registeredTabId = tabId
          if (!registeredTabId) {
            return { content: [{ type: 'text', text: 'Error: No active tab found' }] }
          }

          let res: { success: boolean; result?: unknown; error?: string } | null = null
          try {
            const execRes = await browser.scripting.executeScript({
              target: { tabId: registeredTabId },
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
            console.warn('syncPageProxy: tool exec failed', err)
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

  // 3. 先同步工具到 nativeCtx，完成后再通知同页订阅方 / 跨上下文监听方
  const refreshPageTools = async (targetTabId?: number) => {
    try {
      const tabId = targetTabId || (await getCurrentTabId())
      if (!tabId) return

      const seq = ++refreshSeq
      currentSyncTabId = tabId

      await syncPageProxy(tabId)

      // 已被更新的刷新请求取代，则不再通知，避免旧结果覆盖新结果
      if (seq !== refreshSeq || currentSyncTabId !== tabId) {
        console.log('refreshPageTools: superseded', { seq, refreshSeq, tabId, currentSyncTabId })
        return
      }

      onPageToolsUpdated.forEach((cb) => cb(tabId))
      // 跨扩展页广播（同页监听应走 onPageToolsUpdated，runtime 不会投递给发送方页面）
      browser.runtime.sendMessage({ type: 'page-tools-updated', tabId }).catch(() => {})
    } catch (err) {
      console.warn('refreshPageTools failed:', err)
    }
  }

  // 初始加载
  refreshPageTools()

  // 监听内容脚本工具注入完成事件
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'page-tools-injected') {
      refreshPageTools(message.tabId)
    }
  })

  // 监听 Tab 切换
  browser.tabs.onActivated.addListener((activeInfo) => refreshPageTools(activeInfo.tabId))
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
      refreshPageTools(tabId)
    }
  })

  forceRefreshTools = refreshPageTools
  exportedSyncPageProxy = syncPageProxy
}

export let exportedSyncPageProxy: ((tabId: number) => Promise<void>) | null = null

export let forceRefreshTools: ((tabId?: number) => Promise<void>) | null = null

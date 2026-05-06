import { getCurrentTabId } from './utils/utils'
import { useExtraTools } from './extraTools'

/**
 * 注册侧边栏本地工具及页面代理工具到内置 WebMCP（navigator.modelContext）。
 * 无需 WebMcpServer 或 Zod 转换，直接使用原生 JSON Schema。
 */
export const setupLocalTools = () => {
  const nativeCtx = (navigator as any).modelContext

  if (!nativeCtx) {
    console.warn('【setupLocalTools】navigator.modelContext 未就绪，跳过工具注册')
    return
  }

  // 1. 注册插件内置辅助工具（tabs-manager, accessibility, visual 等）
  useExtraTools(nativeCtx)

  // 2. 记录已注册的页面代理工具，防止重复注册
  const registeredProxyTools = new Set<string>()

  // 3. 动态获取当前 Tab 页面工具并注册为代理
  const refreshPageTools = async () => {
    try {
      const tabId = await getCurrentTabId()
      if (!tabId) return

      const tools: any[] = await browser.runtime.sendMessage({
        type: 'get-page-tools',
        tabId
      })

      if (!tools || !Array.isArray(tools)) return

      tools.forEach((tool) => {
        if (registeredProxyTools.has(tool.name)) return
        registeredProxyTools.add(tool.name)

        // 直接使用页面原生 JSON Schema，不经过任何 Zod 转换
        nativeCtx.registerTool({
          name: tool.name,
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema, // 原汁原味的 JSON Schema，AI 能看到完整约束
          execute: async (args: any) => {
            // 每次执行时实时获取当前 tabId，支持切换 Tab 后继续调用
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

            // 如果页面返回了标准 MCP content 结构，直接透传
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
    } catch (err) {
      console.warn('【setupLocalTools】刷新页面工具代理失败:', err)
    }
  }

  // 初始加载
  refreshPageTools()

  // 监听 Tab 切换和页面加载完成，自动刷新工具列表
  browser.tabs.onActivated.addListener(refreshPageTools)
  browser.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
      refreshPageTools()
    }
  })
}

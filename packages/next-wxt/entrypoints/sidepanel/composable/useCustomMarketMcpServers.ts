import { ref } from 'vue'
import { ICustomMarketMcpServers } from '@opentiny/next-remoter'
import { getCurrentTabId } from '../utils/utils'

export const useCustomMarketMcpServers: () => Ref<ICustomMarketMcpServers> = () => {
  const customMarketMcpServers = ref<ICustomMarketMcpServers>([])

  // 从 background.ts 获取当前 active Tab 所注入的工具
  const fetchTabTools = async () => {
    try {
      const tabId = await getCurrentTabId()
      if (!tabId) return

      let tools: any[] = []
      try {
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
            } catch (e) {
              return []
            }
          }
        })
        tools = execRes[0]?.result || []
      } catch (err) {
        console.warn('【useCustomMarketMcpServers】获取页面工具失败:', err)
      }

      if (tools && Array.isArray(tools) && tools.length > 0) {
        // 映射为 UI 所需的 ICustomMarketMcpServers 格式
        customMarketMcpServers.value = [
          {
            serverName: '本地网页工具',
            serverVersion: '1.0.0',
            description: '通过 WebMCP 从当前网页动态注入的工具集',
            tools: tools.map(t => ({
              ...t,
              // Sidepanel 视图渲染依赖 customMarketMcpServers 里的 tool.name
              // 我们直接沿用即可
            }))
          }
        ]
      } else {
        customMarketMcpServers.value = []
      }
    } catch (err) {
      console.warn('【useCustomMarketMcpServers】获取页面工具失败:', err)
    }
  }

  // 初始获取
  fetchTabTools()

  // 监听 Tab 切换和更新事件，自动刷新工具列表
  browser.tabs.onActivated.addListener(() => {
    fetchTabTools()
  })

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // 等待页面加载完成后再获取
    if (changeInfo.status === 'complete' && tab.active) {
      fetchTabTools()
    }
  })

  // 监听 background 注入完成后的主动通知，立即刷新工具列表
  // 避免注入发生在页面加载完成之后，导致 onUpdated 不再触发
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'page-tools-updated') {
      fetchTabTools()
    }
  })

  return customMarketMcpServers
}

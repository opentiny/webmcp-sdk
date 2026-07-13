import { type McpServerConfig, initializeBuiltinWebMCP } from '@opentiny/next-sdk'
import { onMounted } from 'vue'
import { setupLocalTools, exportedSyncPageProxy } from '../mcpServer'
import { TinyRemoter } from '@opentiny/next-remoter'
import { showToast } from 'vant'

export const useBrowserExtensions = async (remoterRef: Ref<InstanceType<typeof TinyRemoter>>) => {
  onMounted(async () => {
    // 注册内置 WebMCP 工具（依赖 remoterRef，必须在 mount 后执行）
    const nativeCtx = (document as any).modelContext
    if (nativeCtx) {
      registerQueue = registerQueue.then(async () => {
        try {
          const mcpServer: McpServerConfig = {
            type: 'builtin',
            client: nativeCtx,
            name: '浏览器内置工具',
            description: '插件内置工具及当前网页通过 document.modelContext 暴露的 MCP 工具'
          }
          await remoterRef.value.loadMcpServerToPlugin('mcp-server-builtin', mcpServer)
        } catch (error) {
          console.error('【useBrowserExt】注册内置 WebMCP 失败', error as any)
        }
      })
    } else {
      console.warn('【useBrowserExt】document.modelContext 未就绪，跳过内置工具注册')
    }
  })

  // 注册队列：确保 MCP server 注册操作串行执行
  let registerQueue = Promise.resolve()

  // 初始化侧边栏的内置 WebMCP（注册 document.modelContext)
  initializeBuiltinWebMCP()

  // 注册插件内置工具（tabs-manager、page-agent-tool）及当前页面代理工具
  setupLocalTools()

  // 监听后台主动推送的 UI 更新事件
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'bg-mcp-server-register-forward') {
      const { sessionId, serverInfo } = message.data

      registerQueue = registerQueue.then(async () => {
        try {
          const mcpServer = {
            type: 'extension',
            url: serverInfo.url,
            sessionId
          }
          const serverName = `mcp-server-${sessionId}`
          await remoterRef.value.loadMcpServerToPlugin(serverName, mcpServer as McpServerConfig)
          showToast(`插件已添加: ${serverInfo.url}`)
        } catch (error) {
          console.error(`【useBrowserExt】agent 注册插件失败: ${sessionId}`, error as any)
        }
      })
    } else if (message.type === 'bg-mcp-server-removed') {
      const { sessionId } = message
      const serverName = `mcp-server-${sessionId}`

      remoterRef.value
        .handleClientDisconnected(serverName)
        .then(() => {
          showToast(`插件已移除: ${serverName}`)
        })
        .catch((error: any) => {
          console.error(`【useBrowserExt】agent 删除插件失败: ${serverName}`, error)
        })
    } else if (message.type === 'page-tools-updated') {
      // 收到 content.ts 或 mcpServer.ts 发出的页面工具更新通知
      // 时序：先同步代理工具到 nativeCtx（mcpServer.ts 可能还没执行 refreshPageTools），
      // 再调 refreshPluginTools 刷新 UI，确保 UI 拿到的是最新工具列表
      const tabId = message.tabId
      registerQueue = registerQueue.then(async () => {
        try {
          // 1. 先同步代理工具（不发消息，避免循环）
          if (tabId && exportedSyncPageProxy) {
            await exportedSyncPageProxy(tabId)
          }
          // 2. 再刷新 UI（agent.refreshTools + syncInstalledPluginTools）
          await (remoterRef.value as any).refreshPluginTools?.()
        } catch (error) {
          console.error('【useBrowserExt】刷新插件工具列表失败', error as any)
        }
      })
    }
  })
}

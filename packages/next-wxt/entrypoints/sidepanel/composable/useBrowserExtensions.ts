import { type McpServerConfig } from '@opentiny/next-sdk'
import { onMounted } from 'vue'
import {
  setupLocalTools,
  onPageToolsUpdated,
  sidepanelModelContext,
  forceRefreshTools
} from '../mcpServer'
import { TinyRemoter } from '@opentiny/next-remoter'

/**
 * 将侧边栏 modelContext 注册到 TinyRemoter，并在页面工具同步后刷新 UI。
 *
 * 注意：mcpServer 在同一 sidepanel 页面内同步完成后会触发 onPageToolsUpdated。
 * Chrome 的 runtime.sendMessage 不会投递给发送方所在页面，因此不能只靠 page-tools-updated 消息刷新 UI。
 */
export const useBrowserExtensions = async (remoterRef: Ref<InstanceType<typeof TinyRemoter>>) => {
  let registerQueue = Promise.resolve()

  const waitForRemoter = async (timeoutMs = 5000) => {
    const start = Date.now()
    while (!remoterRef.value && Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, 50))
    }
    return remoterRef.value
  }

  const refreshRemoterTools = () => {
    registerQueue = registerQueue.then(async () => {
      try {
        const remoter = await waitForRemoter()
        await (remoter as any)?.refreshPluginTools?.()
      } catch (error) {
        console.error('【useBrowserExt】刷新插件工具列表失败', error as any)
      }
    })
  }

  // 先初始化本地工具与页面代理同步（必须在 remoter 注册前，保证同一 modelContext）
  setupLocalTools()

  onMounted(async () => {
    registerQueue = registerQueue.then(async () => {
      try {
        const remoter = await waitForRemoter()
        if (!remoter) {
          console.warn('【useBrowserExt】TinyRemoter 未就绪，跳过内置 WebMCP 注册')
          return
        }

        const nativeCtx = sidepanelModelContext || (document as any).modelContext
        if (!nativeCtx) {
          console.warn('【useBrowserExt】modelContext 未就绪，跳过内置 WebMCP 注册')
          return
        }

        const mcpServer: McpServerConfig = {
          type: 'builtin',
          client: nativeCtx,
          name: '浏览器内置工具',
          description: '插件内置工具及当前网页通过 document.modelContext 暴露的 MCP 工具'
        }
        await remoter.loadMcpServerToPlugin('mcp-server-builtin', mcpServer)

        // 再主动同步一次当前页工具，然后刷新 UI（覆盖「先开侧边栏后注入」与「先注入后开侧边栏」）
        await forceRefreshTools?.()
        await (remoter as any)?.refreshPluginTools?.()
      } catch (error) {
        console.error('【useBrowserExt】注册内置 WebMCP 失败', error as any)
      }
    })
  })

  onPageToolsUpdated.add(() => {
    refreshRemoterTools()
  })

  browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'page-tools-updated') {
      refreshRemoterTools()
    }
  })
}

import { type McpServerConfig } from '@opentiny/next-sdk'
import { onMounted } from 'vue'
import { createMcpServer } from '../mcpServer'
import { TinyRemoter } from '@opentiny/next-remoter'
import { showToast } from 'vant'

export const useBrowserExtensions = async (remoterRef: Ref<InstanceType<typeof TinyRemoter>>) => {
  onMounted(async () => {
    try {
      console.log('【useBrowserExt】向后台请求 session 列表快照')
      const sessions = await browser.runtime.sendMessage({ type: 'get-session-registry' })
      if (sessions && Array.isArray(sessions)) {
        sessions.forEach(({ sessionId, serverInfo }) => {
          registerQueue = registerQueue.then(async () => {
            try {
              const mcpServer = {
                type: 'extension',
                url: serverInfo.url,
                sessionId
              }
              const serverName = `mcp-server-${sessionId}`
              await remoterRef.value.loadMcpServerToPlugin(serverName, mcpServer as McpServerConfig)
            } catch (error) {
              console.error(`【useBrowserExt】初始化加载插件失败: ${sessionId}`, error as any)
            }
          })
        })
      }
    } catch (error) {
      console.error('【useBrowserExt】获取后台 session 列表失败：', error)
    }
  })

  // 注册队列：确保 MCP server 注册操作串行执行
  let registerQueue = Promise.resolve()

  const { clientTransport } = await createMcpServer()

  // 首先加载sidepanel面板自身的mcpServer
  registerQueue = registerQueue.then(async () => {
    try {
      const mcpServer = {
        type: 'local',
        transport: clientTransport
      }
      const serverName = `mcp-server-localhost`

      await remoterRef.value.loadMcpServerToPlugin(serverName, mcpServer as McpServerConfig)
    } catch (error) {
      console.error(`【useBrowserExt】agent 注册插件失败: localhost:3000`, error as any)
    }
  })

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
      
      remoterRef.value.handleClientDisconnected(serverName).then(() => {
        showToast(`插件已移除: ${serverName}`)
      }).catch((error: any) => {
        console.error(`【useBrowserExt】agent 删除插件失败: ${serverName}`, error)
      })
    }
  })
}

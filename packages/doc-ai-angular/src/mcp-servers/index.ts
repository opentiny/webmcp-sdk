import { WebMcpServer, createMessageChannelServerTransport, withPageTools, registerNavigateTool } from '@opentiny/next-sdk'

const rawServer = new WebMcpServer()

/**
 * 用 withPageTools 包装 server，使 registerTool 支持路由配置对象。
 */
export const server = withPageTools(rawServer)

/**
 * 初始化 MCP Server
 */
export const createMcpServer = async () => {
  // 注册通用页面跳转工具：navigate_to_page（内部使用 setNavigator + page-ready）
  registerNavigateTool(rawServer)
  const serverTransport = createMessageChannelServerTransport('local-mcp')
  await serverTransport.listen()
  await rawServer.connect(serverTransport)
}

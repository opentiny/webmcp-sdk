import { WebMcpServer, createMessageChannelServerTransport, withPageTools } from '@opentiny/next-sdk'
import registerProductGuideTools from './product-guide/tools'
import registerPriceProtectionTools from './price-protection/tools'

const rawServer = new WebMcpServer()

/**
 * 用 withPageTools 包装 server，使 registerTool 支持路由配置对象。
 * MCP Server 与 registerPageTool 均在 react 主窗口，page-tool-bridge 同窗口 postMessage 即可。
 */
export const server = withPageTools(rawServer)

/**
 * 初始化 MCP Server：创建 MessageChannel 服务端传输层，
 * 监听 iframe（remoter.html）中 TinyRemoter 的 MCP 连接。
 * 对应 iframe 侧：createMessageChannelClientTransport('local-mcp', window.parent)
 */
export const createMcpServer = async () => {
  registerProductGuideTools(server)
  registerPriceProtectionTools(server)
  const serverTransport = createMessageChannelServerTransport('local-mcp')
  await serverTransport.listen()
  await rawServer.connect(serverTransport)
}

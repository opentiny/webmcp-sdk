import { WebMcpServer, createMessageChannelServerTransport, withPageTools, z } from '@opentiny/next-sdk'
import registerProductGuideTools from './product-guide/tools'
import registerPriceProtectionTools from './price-protection/tools'

const rawServer = new WebMcpServer()

/**
 * 用 withPageTools 包装 server，使 registerTool 支持路由配置对象。
 */
export const server = withPageTools(rawServer)

// 局部导航器变量，由外部 Angular 组件注入
let _angularNavigator: ((path: string) => void | Promise<void>) | null = null

/**
 * 注入 Angular 路由跳转函数
 */
export function setAngularNavigator(fn: (path: string) => void | Promise<void>) {
  _angularNavigator = fn
}

server.registerTool(
  'navigate_to_page',
  {
    title: '页面跳转',
    description: '当需要的工具在当前页面不可用时，使用此工具跳转到特定页面。例如：要查询订单时，跳转到 "/orders"。',
    inputSchema: {
      path: z.string().describe('目标页面的路由地址，例如 "/orders", "/inventory", "/price-protection" 等。')
    }
  },
  async ({ path }) => {
    try {
      if (_angularNavigator) {
        await _angularNavigator(path)
        return {
          content: [{ type: 'text', text: `已成功跳转至页面：${path}。请继续你的下一步操作。` }]
        }
      }
      return {
        content: [{ type: 'text', text: '无法跳转：未在 mcp-servers 中注入 Angular Navigator。' }]
      }
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `跳转失败：${err instanceof Error ? err.message : String(err)}。这可能是由于路径无效或导航被取消。`
          }
        ]
      }
    }
  }
)

/**
 * 初始化 MCP Server
 */
export const createMcpServer = async () => {
  registerProductGuideTools(server)
  registerPriceProtectionTools(server)
  const serverTransport = createMessageChannelServerTransport('local-mcp')
  await serverTransport.listen()
  await rawServer.connect(serverTransport)
}

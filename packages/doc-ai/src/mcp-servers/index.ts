import { WebMcpServer, createMessageChannelPairTransport, withPageTools, z } from '@opentiny/next-sdk'
import registerInventoryTools from './inventory/tools'
import registerPriceProtectionTools from './price-protection/tools'
import registerProductGuideTools from './product-guide/tools'
import registerSalesTools from './sales/tools'
import registerFinanceTools from './finance/tools'
import registerOrdersTools from './orders/tools'
import router from '../router'
import { isNavigationFailure } from 'vue-router'

const rawServer = new WebMcpServer()
const [serverTransport, clientTransport] = createMessageChannelPairTransport()

// 用 withPageTools 包装后，registerTool 第三个参数支持路由配置对象
export const server = withPageTools(rawServer)

export { clientTransport }

// 路由跳转工具：供大模型在需要时主动跳转到指定页面（如 /orders、/price-protection）
server.registerTool(
  'navigate_to_page',
  {
    title: '页面跳转',
    description:
      '当需要的工具在当前页面不可用时，使用此工具跳转到特定页面。例如：要查询订单时跳转到 "/orders"，要创建价保时跳转到 "/price-protection"。',
    inputSchema: {
      path: z.string().describe('目标页面的路由地址，例如 "/orders", "/inventory", "/price-protection" 等。')
    }
  },
  async ({ path }) => {
    try {
      const failure = await router.push(path)
      if (isNavigationFailure(failure)) {
        return {
          content: [{ type: 'text', text: '页面跳转失败，可能是路径无效或导航被取消。' }]
        }
      }
      return {
        content: [{ type: 'text', text: `已成功跳转至页面：${path}。请继续你的下一步操作。` }]
      }
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `跳转失败：${err instanceof Error ? err.message : String(err)}。`
          }
        ]
      }
    }
  }
)

let isConnected = false

export const createMcpServer = async () => {
  if (isConnected) return
  isConnected = true

  // 注册所有模块的工具
  registerInventoryTools(server)
  registerPriceProtectionTools(server)
  registerProductGuideTools(server)
  registerSalesTools(server)
  registerFinanceTools(server)
  registerOrdersTools(server)

  await rawServer.connect(serverTransport)
}

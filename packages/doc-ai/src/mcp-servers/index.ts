import { WebMcpServer, createMessageChannelPairTransport, withPageTools } from '@opentiny/next-sdk'
import registerInventoryTools from './inventory/tools'
import registerPriceProtectionTools from './price-protection/tools'
import registerProductGuideTools from './product-guide/tools'
import registerSalesTools from './sales/tools'
import registerFinanceTools from './finance/tools'
import registerOrdersTools from './orders/tools'
import { z } from 'zod'
import router from '../router'

const rawServer = new WebMcpServer()
const [serverTransport, clientTransport] = createMessageChannelPairTransport()

// 用 withPageTools 包装后，registerTool 第三个参数支持路由配置对象
export const server = withPageTools(rawServer)

export { clientTransport }

let isConnected = false

export const createMcpServer = async () => {
  if (isConnected) return
  isConnected = true

  // 注册基础工具
  server.registerTool(
    'navigate_to_page',
    {
      title: '页面跳转',
      description:
        '当需要的工具在当前页面不可用，或技能说明文档要求切换到特定页面时，使用此工具进行路由跳转。例如：要查询订单时，根据提示跳转到 "/orders"。',
      inputSchema: {
        path: z.string().describe('目标页面的路由地址，例如 "/orders", "/inventory", "/price-protection" 等。')
      }
    },
    async ({ path }) => {
      await router.push(path)
      return {
        content: [
          { type: 'text', text: `已成功跳转至页面：${path}，该页面的专属工具现在已经可用。请继续你的下一步操作。` }
        ]
      }
    }
  )

  // 注册所有模块的工具
  registerInventoryTools(server)
  registerPriceProtectionTools(server)
  registerProductGuideTools(server)
  registerSalesTools(server)
  registerFinanceTools(server)
  registerOrdersTools(server)

  await rawServer.connect(serverTransport)
}

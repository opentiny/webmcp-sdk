import { WebMcpServer, createMessageChannelPairTransport, withPageTools, z } from '@opentiny/next-sdk'
import registerInventoryTools from './inventory/tools'
import registerPriceProtectionTools from './price-protection/tools'
import registerProductGuideTools from './product-guide/tools'
import registerSalesTools from './sales/tools'
import registerFinanceTools from './finance/tools'
import registerOrdersTools from './orders/tools'
import router from '../router'
import { isNavigationFailure, NavigationFailureType } from 'vue-router'

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
      // 预解析目标路由，避免无效路径被 catch-all 当成成功
      const resolved = router.resolve(path)
      if (resolved.name === 'NotFound') {
        return {
          content: [{ type: 'text', text: `跳转失败：未找到页面 ${path}。` }]
        }
      }
      // 已在目标页则直接返回成功，无需 push（避免 duplicated 被误判为失败）
      if (router.currentRoute.value.fullPath === resolved.fullPath) {
        return {
          content: [{ type: 'text', text: `当前已在页面：${resolved.fullPath}。请继续你的下一步操作。` }]
        }
      }

      const failure = await router.push(resolved)
      // duplicated 表示已在同位置，视为成功；其余 NavigationFailure 返回失败
      if (isNavigationFailure(failure) && !isNavigationFailure(failure, NavigationFailureType.duplicated)) {
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

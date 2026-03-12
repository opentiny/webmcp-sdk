import { WebMcpServer, createMessageChannelPairTransport, withPageTools } from '@opentiny/next-sdk'
import registerInventoryTools from './inventory/tools'
import registerPriceProtectionTools from './price-protection/tools'
import registerProductGuideTools from './product-guide/tools'
import registerSalesTools from './sales/tools'
import registerFinanceTools from './finance/tools'
import registerOrdersTools from './orders/tools'
import { z } from 'zod'
import router from '../router'
import { isNavigationFailure } from 'vue-router'

const rawServer = new WebMcpServer()
const [serverTransport, clientTransport] = createMessageChannelPairTransport()

// 用 withPageTools 包装后，registerTool 第三个参数支持路由配置对象
export const server = withPageTools(rawServer)

export { clientTransport }

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

import { WebMcpServer, createMessageChannelPairTransport, withPageTools } from '@opentiny/next-sdk'
import registerProductGuideTools from './product-guide/tools'
import registerPriceProtectionTools from './price-protection/tools'

const rawServer = new WebMcpServer()
const [serverTransport, clientTransport] = createMessageChannelPairTransport()

// 用 withPageTools 包装后，registerTool 第三个参数支持路由配置对象
export const server = withPageTools(rawServer)

export { clientTransport }

export const createMcpServer = async () => {
  registerProductGuideTools(server)
  registerPriceProtectionTools(server)
  await rawServer.connect(serverTransport)
}

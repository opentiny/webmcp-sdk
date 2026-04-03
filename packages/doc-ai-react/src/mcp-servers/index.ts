import { WebMcpServer, createMessageChannelPairTransport, withPageTools } from '@opentiny/next-sdk'
import { registerAllTools } from './common'
export { useWebAgentServer } from './useWebAgentServer'

const rawServer = new WebMcpServer()
const [serverTransport, clientTransport] = createMessageChannelPairTransport()

// 用 withPageTools 包装后，registerTool 第三个参数支持路由配置对象
export const server = withPageTools(rawServer)

export { clientTransport }

let isConnected = false

export const createMcpServer = async () => {
  if (isConnected) return
  isConnected = true

  // 使用公共注册函数，统一传递代理后的 server
  registerAllTools(server)

  await rawServer.connect(serverTransport)
}

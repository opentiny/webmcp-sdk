import { WebMcpServer } from '@opentiny/next-sdk'
import { createMessageChannelPairTransport } from '@opentiny/next-sdk'
import registerTools from './product-guide/tools'

const server = new WebMcpServer()
const [serverTransport, clientTransport] = createMessageChannelPairTransport()

export { clientTransport }

export const createMcpServer = async () => {
  registerTools(server)
  await server.connect(serverTransport)
}

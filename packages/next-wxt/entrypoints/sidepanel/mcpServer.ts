import { WebMcpServer, createMessageChannelPairTransport, z } from '@opentiny/next-sdk'

const [serverTransport, clientTransport] = createMessageChannelPairTransport()

export { clientTransport }

export const createMcpServer = async () => {
  const server = new WebMcpServer({ name: 'sidepanel-mcp-server', version: '1.0.0' })
  server.registerTool(
    'add-number',
    {
      title: '加法工具',
      description: '两个数字相加',
      inputSchema: { a: z.number(), b: z.number() }
    },
    async ({ a, b }) => {
      return { content: [{ type: 'text', text: String(a + b) }] }
    }
  )
  await server.connect(serverTransport)
  return server
}

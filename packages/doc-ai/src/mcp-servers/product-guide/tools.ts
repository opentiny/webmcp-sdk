import { z, WebMcpServer } from '@opentiny/next-sdk'

export default (server: WebMcpServer) => {
  server.registerTool(
    'product-guide',
    {
      title: '产品指南',
      description: '获取产品指南',
      inputSchema: {
        productId: z.string().describe('产品ID')
      }
    },
    async ({ productId }) => {
      return {
        content: [{ type: 'text', text: `产品指南${productId}` }]
      }
    }
  )
}

import { z } from 'zod'
import type { PageAwareServer } from '@opentiny/next-sdk'

/** 注册商品指南工具，路由指向 /comprehensive 页面 */
const registerProductGuideTools = (server: PageAwareServer) => {
  server.registerTool(
    'product-guide',
    {
      title: '产品指南',
      description: '根据产品ID获取产品详细信息',
      inputSchema: {
        productId: z.string().describe('产品ID')
      }
    },
    { route: '/comprehensive' }
  )
}

export default registerProductGuideTools

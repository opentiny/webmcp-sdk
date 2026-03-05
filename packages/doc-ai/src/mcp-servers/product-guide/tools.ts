import { z } from '@opentiny/next-sdk'
import type { PageAwareServer } from '@opentiny/next-sdk'

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
    // 第三个参数传路由配置对象，与原始回调写法并排支持：
    //   回调写法：async ({ productId }) => { return { content: [...] } }
    //   路由写法：{ route: '/comprehensive' }  ← 工具调用时自动跳转并通过消息通信执行
    { route: '/comprehensive' }
  )
}

export default registerProductGuideTools

import { z } from '@opentiny/next-sdk'
import type { PageAwareServer } from '@opentiny/next-sdk'

export default function registerOrdersTools(server: PageAwareServer) {
  // 查询订单列表，支持按状态或关键词筛选
  server.registerTool(
    'order_query',
    {
      title: '查询订单',
      description: '【订单管理工具】查询电商订单列表，可按订单号、客户姓名或状态筛选，不传参数则返回全部订单。',
      inputSchema: {
        orderId: z.string().optional().describe('按订单号精确查询，如 ORD-5X9A2B'),
        customerName: z.string().optional().describe('按客户姓名模糊查询'),
        status: z
          .enum(['Pending', 'Shipped', 'Delivered', 'Refunded', 'Cancelled'])
          .optional()
          .describe('按订单状态筛选')
      }
    },
    { route: '/orders' }
  )

  // 获取单条订单详情
  server.registerTool(
    'order_detail',
    {
      title: '订单详情',
      description: '【订单管理工具】根据订单号获取完整的订单详情，包括商品、金额、物流、收货人信息等。',
      inputSchema: {
        orderId: z.string().describe('要查询的订单号，如 ORD-5X9A2B')
      }
    },
    { route: '/orders' }
  )
}

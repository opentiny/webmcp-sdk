import { z } from '@opentiny/next-sdk'
import type { PageAwareServer } from '@opentiny/next-sdk'

export default function registerSalesTools(server: PageAwareServer) {
  server.registerTool(
    'sales_record_query',
    {
      title: '查询商品销售记录',
      description: '【销售数据展示工具】帮助管理员查询最近一段时间的商品销售趋势、统计图表数据',
      inputSchema: {
        timeRange: z.enum(['7days', '30days', 'year']).optional().describe('查询时间范围')
      }
    },
    { route: '/sales' }
  )
}

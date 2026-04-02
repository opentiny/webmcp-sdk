import { z } from '@opentiny/next-sdk'
import type { PageAwareServer } from '@opentiny/next-sdk'

export default function registerFinanceTools(server: PageAwareServer) {
  server.registerTool(
    'finance_summary_query',
    {
      title: '查询财务数据',
      description: '【财务管理工具】查询电商平台的整体收入、支出和待结算金额等核心财务指标',
      inputSchema: {
        month: z.string().optional().describe('查询的月份，如"2023-10"')
      }
    },
    { route: '/ai-vue/finance' }
  )
}

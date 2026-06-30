export default function registerFinanceTools() {
  ;(document as any).modelContext.registerTool({
    name: 'finance_summary_query',
    description: '【财务管理工具】查询电商平台的整体收入、支出和待结算金额等核心财务指标',
    inputSchema: {
      type: 'object',
      properties: {
        month: { type: 'string', description: '查询的月份，如"2023-10"' }
      }
    },
    routeConfig: {
      route: '/finance'
    }
  })
}

import { useEffect } from 'react'
import type { ModelContext } from '@mcp-b/webmcp-types'

export function Component() {
  useEffect(() => {
    const financeData = { balance: 845210, pending: 124300, expense: 45120 }
    const FINANCE_SUMMARY_QUERY_TOOL = 'finance_summary_query'
    const abortController = new AbortController()

    const modelContext =
      (document as unknown as { modelContext?: ModelContext }).modelContext
    if (modelContext?.registerTool) {
      modelContext.registerTool(
        {
          name: FINANCE_SUMMARY_QUERY_TOOL,
          title: '查询财务数据',
          description: '【财务管理工具】查询电商平台的整体收入、支出和待结算金额等核心财务指标',
          inputSchema: {
            type: 'object',
            properties: {
              month: { type: 'string', description: '查询的月份，如"2023-10"' }
            }
          },
          execute: async ({ month }: { month?: string }) => {
            const monthLabel = month ? `（${month}）` : '（当前）'
            const text = `财务概况${monthLabel}：\n- 可用余额：¥${financeData.balance.toLocaleString()}\n- 待结算金额：¥${financeData.pending.toLocaleString()}\n- 本月总支出：¥${financeData.expense.toLocaleString()}\n\n详细流水已在左侧界面展示，可点击【发起提现】或【导出账单】进行操作。`
            return { content: [{ type: 'text', text }] }
          }
        },
        { signal: abortController.signal }
      )
    }

    return () => {
      abortController.abort()
    }
  }, [])

  return (
    <div className="finance-container">
      <div className="header">
        <h2>财务管理</h2>
        <p className="subtitle">企业财务总览与结算</p>
      </div>

      <div className="finance-overview">
        <div className="overview-item">
          <h3>可用余额</h3>
          <div className="amount highlight">¥845,210.00</div>
        </div>
        <div className="overview-item">
          <h3>待结算金额</h3>
          <div className="amount">¥124,300.00</div>
        </div>
        <div className="overview-item">
          <h3>本月总支出</h3>
          <div className="amount text-danger">-¥45,120.00</div>
        </div>
      </div>

      <div className="actions">
        <div className="btn primary">发起提现</div>
        <div className="btn">导出账单</div>
        <div className="btn">发票管理</div>
      </div>

      <div className="transactions">
        <h3>最近交易记录</h3>
        <table className="transaction-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>类型</th>
              <th>描述</th>
              <th>金额</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2023-11-01 10:24</td>
              <td>收入</td>
              <td>订单结算 (批量)</td>
              <td className="text-success">+¥12,400.00</td>
              <td>
                <span className="status success">已完成</span>
              </td>
            </tr>
            <tr>
              <td>2023-11-02 14:10</td>
              <td>支出</td>
              <td>物流运费结算</td>
              <td className="text-danger">-¥1,200.00</td>
              <td>
                <span className="status success">已完成</span>
              </td>
            </tr>
            <tr>
              <td>2023-11-03 09:15</td>
              <td>退款</td>
              <td>订单原路退款</td>
              <td className="text-danger">-¥4,599.00</td>
              <td>
                <span className="status processing">处理中</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Component

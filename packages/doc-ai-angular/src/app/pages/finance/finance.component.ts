import { Component, OnInit, OnDestroy } from '@angular/core'
import { CommonModule } from '@angular/common'
import type { ModelContext } from '@mcp-b/webmcp-types'

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './finance.component.html',
  styleUrl: './finance.component.scss'
})
export class FinanceComponent implements OnInit, OnDestroy {
  // 模拟的财务数据
  financeData = {
    balance: 845210,
    pending: 124300,
    expense: 45120
  }

  transactions = [
    {
      date: '2023-11-01 10:24',
      type: '收入',
      description: '订单结算 (批量)',
      amount: 12400,
      status: 'success'
    },
    {
      date: '2023-11-02 14:10',
      type: '支出',
      description: '物流运费结算',
      amount: -1200,
      status: 'success'
    },
    {
      date: '2023-11-03 09:15',
      type: '退款',
      description: '订单原路退款',
      amount: -4599,
      status: 'processing'
    }
  ]

  private abortController = new AbortController()

  ngOnInit() {
    const modelContext =
      (document as unknown as { modelContext?: ModelContext }).modelContext
    if (!modelContext?.registerTool) return

    modelContext.registerTool(
      {
        name: 'finance_summary_query',
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
          const text = `财务概况${monthLabel}：
- 可用余额：¥${this.financeData.balance.toLocaleString()}
- 待结算金额：¥${this.financeData.pending.toLocaleString()}
- 本月总支出：¥${this.financeData.expense.toLocaleString()}

详细流水已在左侧界面展示，可点击【发起提现】或【导出账单】进行操作。`
          return { content: [{ type: 'text', text }] }
        }
      },
      { signal: this.abortController.signal }
    )
  }

  ngOnDestroy() {
    this.abortController.abort()
  }

  getAmountClass(amount: number): string {
    return amount > 0 ? 'text-success' : 'text-danger'
  }

  getStatusClass(status: string): string {
    return status === 'success' ? 'status success' : 'status processing'
  }

  getStatusText(status: string): string {
    return status === 'success' ? '已完成' : '处理中'
  }
}

<template>
  <div class="finance-container">
    <div class="header">
      <h2>财务管理</h2>
      <p class="subtitle">企业财务总览与结算</p>
    </div>

    <!-- Data Summary -->
    <div class="finance-overview">
      <div class="overview-item">
        <h3>可用余额</h3>
        <div class="amount highlight">¥845,210.00</div>
      </div>
      <div class="overview-item">
        <h3>待结算金额</h3>
        <div class="amount">¥124,300.00</div>
      </div>
      <div class="overview-item">
        <h3>本月总支出</h3>
        <div class="amount text-danger">-¥45,120.00</div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="actions">
      <div class="btn primary">发起提现</div>
      <div class="btn">导出账单</div>
      <div class="btn">发票管理</div>
    </div>

    <!-- Recent Transactions -->
    <div class="transactions">
      <h3>最近交易记录</h3>
      <table class="transaction-table">
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
            <td class="text-success">+¥12,400.00</td>
            <td><span class="status success">已完成</span></td>
          </tr>
          <tr>
            <td>2023-11-02 14:10</td>
            <td>支出</td>
            <td>物流运费结算</td>
            <td class="text-danger">-¥1,200.00</td>
            <td><span class="status success">已完成</span></td>
          </tr>
          <tr>
            <td>2023-11-03 09:15</td>
            <td>退款</td>
            <td>订单原路退款</td>
            <td class="text-danger">-¥4,599.00</td>
            <td><span class="status processing">处理中</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import type { ModelContext } from '@mcp-b/webmcp-types'

// 模拟的财务数据
const financeData = { balance: 845210, pending: 124300, expense: 45120 }

const FINANCE_SUMMARY_QUERY_TOOL = 'finance_summary_query'
const abortController = new AbortController()

onMounted(() => {
  const modelContext =
    (document as unknown as { modelContext?: ModelContext }).modelContext
  if (!modelContext?.registerTool) return

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
})

onUnmounted(() => {
  abortController.abort()
})
</script>

<style scoped>
.finance-container {
  padding: 24px;
  background: white;
  border-radius: 12px;
  min-height: 100%;
}

.header {
  margin-bottom: 32px;
}
.header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 8px;
  color: #1d2129;
}
.subtitle {
  color: #86909c;
  margin: 0;
}

.finance-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}
.overview-item {
  background: #f7f8fa;
  padding: 20px;
  border-radius: 8px;
}
.overview-item h3 {
  font-size: 0.875rem;
  color: #86909c;
  margin: 0 0 12px;
  font-weight: 500;
}
.amount {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1d2129;
}
.amount.highlight {
  color: #165dff;
}
.amount.text-danger {
  color: #f53f3f;
}

.actions {
  display: flex;
  gap: 12px;
  margin-bottom: 40px;
}
.btn {
  padding: 8px 20px;
  border-radius: 6px;
  background: #f2f3f5;
  color: #4e5969;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn:hover {
  background: #e5e6eb;
}
.btn.primary {
  background: #165dff;
  color: white;
}
.btn.primary:hover {
  background: #0e42d2;
}

.transactions h3 {
  font-size: 1.1rem;
  margin-bottom: 16px;
  color: #1d2129;
}
.transaction-table {
  width: 100%;
  border-collapse: collapse;
}
.transaction-table th {
  text-align: left;
  padding: 12px 16px;
  background: #f7f8fa;
  color: #86909c;
  font-weight: 500;
  font-size: 0.875rem;
}
.transaction-table td {
  padding: 16px;
  border-bottom: 1px solid #f2f3f5;
  color: #4e5969;
  font-size: 0.875rem;
}
.text-success {
  color: #00b42a;
}
.text-danger {
  color: #f53f3f;
}
.status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
}
.status.success {
  background: #e8ffea;
  color: #00b42a;
}
.status.processing {
  background: #fff7e8;
  color: #ff7d00;
}
</style>

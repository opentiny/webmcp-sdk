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
import { registerPageTool } from '@opentiny/next-sdk'

// 模拟的财务数据
const financeData = { balance: 845210, pending: 124300, expense: 45120 }

let cleanupPageTool: (() => void) | undefined

onMounted(() => {
  cleanupPageTool = registerPageTool({
    // 显式指定路由，需与 mcp-servers 中 RouteConfig.route '/finance' 保持一致
    route: '/finance',
    handlers: {
      'finance_summary_query': async ({ month }: { month?: string }) => {
        const monthLabel = month ? `（${month}）` : '（当前）'
        const text = `财务概况${monthLabel}：\n- 可用余额：¥${financeData.balance.toLocaleString()}\n- 待结算金额：¥${financeData.pending.toLocaleString()}\n- 本月总支出：¥${financeData.expense.toLocaleString()}\n\n详细流水已在左侧界面展示，可点击【发起提现】或【导出账单】进行操作。`
        return { content: [{ type: 'text', text }] }
      }
    }
  })
})

onUnmounted(() => {
  cleanupPageTool?.()
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
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
}
.overview-item {
  flex: 1;
  padding: 24px;
  background: linear-gradient(135deg, rgba(58, 120, 236, 0.05) 0%, rgba(58, 120, 236, 0.01) 100%);
  border-radius: 12px;
  border: 1px solid rgba(58, 120, 236, 0.1);
}
.overview-item h3 {
  margin: 0 0 12px;
  font-size: 1rem;
  color: #4e5969;
}
.amount {
  font-size: 1.8rem;
  font-weight: 700;
  font-family: monospace;
}
.amount.highlight {
  color: #3a78ec;
}
.text-danger {
  color: #f53f3f;
}
.text-success {
  color: #00b42a;
}

.actions {
  display: flex;
  gap: 16px;
  margin-bottom: 40px;
}
.btn {
  padding: 10px 24px;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  background: #f2f3f5;
  color: #1d2129;
  transition: all 0.2s;
}
.btn:hover {
  background: #e5e6eb;
}
.btn.primary {
  background: #3a78ec;
  color: white;
  box-shadow: 0 4px 12px rgba(58, 120, 236, 0.3);
}
.btn.primary:hover {
  background: #2f65ce;
}

.transactions h3 {
  font-size: 1.2rem;
  color: #1d2129;
  margin-bottom: 16px;
}
.transaction-table {
  width: 100%;
  border-collapse: collapse;
}
.transaction-table th,
.transaction-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #f2f3f5;
}
.transaction-table th {
  background: #f7f8fc;
  color: #4e5969;
  font-weight: 500;
  font-size: 0.95rem;
}
.transaction-table td {
  color: #1d2129;
  font-size: 0.95rem;
}
.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
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

<template>
  <div class="sales-container">
    <div class="header">
      <h2>商品销售记录</h2>
      <p class="subtitle">近30天销售趋势与数据总览</p>
    </div>

    <!-- 顶层概览卡片 -->
    <div class="stats-row">
      <div class="stat-card" v-for="card in statCards" :key="card.label">
        <div class="stat-icon" :style="{ background: card.iconBg }">
          <span>{{ card.icon }}</span>
        </div>
        <div class="stat-body">
          <div class="stat-label">{{ card.label }}</div>
          <div class="stat-value">{{ card.value }}</div>
          <div :class="['stat-trend', card.up ? 'positive' : 'negative']">
            {{ card.up ? '▲' : '▼' }} {{ card.change }} 较上月
          </div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <div class="chart-card wide">
        <div class="chart-header">
          <h3>销售额趋势</h3>
          <div class="tab-group">
            <span :class="['tab', activeRange === '7days' ? 'active' : '']" @click="activeRange = '7days'">近7天</span>
            <span :class="['tab', activeRange === '30days' ? 'active' : '']" @click="activeRange = '30days'"
              >近30天</span
            >
            <span :class="['tab', activeRange === 'year' ? 'active' : '']" @click="activeRange = 'year'">全年</span>
          </div>
        </div>
        <TinyChartLine :options="lineOptions" style="height: 410px" />
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h3>各品类销售占比</h3>
        </div>
        <TinyChartPie :options="pieOptions" style="height: 410px" />
      </div>
    </div>

    <!-- 近期热销商品 -->
    <div class="table-section">
      <div class="section-header">
        <h3>热销商品排行</h3>
        <span class="badge">Top 5</span>
      </div>
      <table class="rank-table">
        <thead>
          <tr>
            <th>#</th>
            <th>商品名称</th>
            <th>品类</th>
            <th>销售量</th>
            <th>销售额</th>
            <th>占比</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in topProducts" :key="item.name">
            <td>
              <span :class="['rank-badge', i < 3 ? 'top' : '']">{{ i + 1 }}</span>
            </td>
            <td class="product-name">{{ item.name }}</td>
            <td>
              <span class="category-tag">{{ item.category }}</span>
            </td>
            <td>{{ item.qty.toLocaleString() }}</td>
            <td class="amount">¥{{ item.revenue.toLocaleString() }}</td>
            <td>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: item.ratio + '%', background: item.color }"></div>
              </div>
              <span class="ratio-text">{{ item.ratio }}%</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { TinyHuichartsLine as TinyChartLine, TinyHuichartsPie as TinyChartPie } from '@opentiny/vue-huicharts'

const activeRange = ref('30days')

const statCards = [
  {
    label: '总销售额',
    value: '¥128,450',
    change: '12.5%',
    up: true,
    icon: '💰',
    iconBg: 'linear-gradient(135deg,#6366f1,#3b82f6)'
  },
  {
    label: '总订单数',
    value: '1,342 单',
    change: '8.2%',
    up: true,
    icon: '📦',
    iconBg: 'linear-gradient(135deg,#0ea5e9,#06b6d4)'
  },
  {
    label: '客单价',
    value: '¥95.7',
    change: '3.8%',
    up: true,
    icon: '🛒',
    iconBg: 'linear-gradient(135deg,#10b981,#34d399)'
  },
  {
    label: '退货率',
    value: '2.4%',
    change: '0.5%',
    up: false,
    icon: '↩️',
    iconBg: 'linear-gradient(135deg,#f59e0b,#fbbf24)'
  }
]

const chartDataByRange: Record<string, Array<{ Day: string; Sales: number; Orders: number }>> = {
  '7days': [
    { Day: '3/4', Sales: 3100, Orders: 42 },
    { Day: '3/5', Sales: 4200, Orders: 55 },
    { Day: '3/6', Sales: 3800, Orders: 48 },
    { Day: '3/7', Sales: 5100, Orders: 63 },
    { Day: '3/8', Sales: 4700, Orders: 59 },
    { Day: '3/9', Sales: 6000, Orders: 75 },
    { Day: '3/10', Sales: 5500, Orders: 70 }
  ],
  '30days': [
    { Day: '2/9', Sales: 3200, Orders: 40 },
    { Day: '2/14', Sales: 4100, Orders: 52 },
    { Day: '2/19', Sales: 3800, Orders: 47 },
    { Day: '2/24', Sales: 5200, Orders: 65 },
    { Day: '3/1', Sales: 4900, Orders: 61 },
    { Day: '3/5', Sales: 6100, Orders: 76 },
    { Day: '3/10', Sales: 5800, Orders: 72 }
  ],
  year: [
    { Day: '4月', Sales: 52000, Orders: 640 },
    { Day: '5月', Sales: 61000, Orders: 750 },
    { Day: '6月', Sales: 78000, Orders: 960 },
    { Day: '7月', Sales: 55000, Orders: 680 },
    { Day: '8月', Sales: 70000, Orders: 860 },
    { Day: '9月', Sales: 83000, Orders: 1020 },
    { Day: '10月', Sales: 112000, Orders: 1380 },
    { Day: '11月', Sales: 145000, Orders: 1780 },
    { Day: '12月', Sales: 98000, Orders: 1210 },
    { Day: '1月', Sales: 75000, Orders: 920 },
    { Day: '2月', Sales: 80000, Orders: 980 },
    { Day: '3月', Sales: 90000, Orders: 1100 }
  ]
}

const lineOptions = computed(() => ({
  padding: [40, 30, 50, 50],
  legend: { show: true, icon: 'line' },
  data: chartDataByRange[activeRange.value],
  xAxis: 'Day',
  yAxis: { name: '销售额 (¥)' }
}))

const pieOptions = ref({
  type: 'pie',
  selectedMode: 'multiple',
  data: [
    { value: 55000, name: '手机数码' },
    { value: 35000, name: '电脑办公' },
    { value: 20450, name: '家用电器' },
    { value: 18000, name: '配件耗材' }
  ]
})

const topProducts = [
  { name: 'iPhone 15 Pro Max 256G', category: '手机数码', qty: 312, revenue: 31188, ratio: 24, color: '#6366f1' },
  { name: 'MacBook Pro M3 Max 1T', category: '电脑办公', qty: 88, revenue: 21999, ratio: 17, color: '#3b82f6' },
  { name: 'AirPods Pro 2', category: '配件耗材', qty: 520, revenue: 9349, ratio: 13, color: '#0ea5e9' },
  { name: 'iPad Pro 2024 M4 256G', category: '平板设备', qty: 97, revenue: 8731, ratio: 9, color: '#10b981' },
  { name: 'HUAWEI Mate 60 Pro 512G', category: '手机数码', qty: 104, revenue: 8319, ratio: 7, color: '#f59e0b' }
]

// 按时间范围的模拟销售摘要数据
const salesSummary = {
  '7days': { totalSales: 28400, orders: 312, returnRate: '1.8%' },
  '30days': { totalSales: 128450, orders: 1342, returnRate: '2.4%' },
  year: { totalSales: 1542600, orders: 16080, returnRate: '2.1%' }
}

const SALES_RECORD_QUERY_TOOL = 'sales_record_query'
const abortController = new AbortController()
onMounted(() => {
  const modelContext = (document as any).modelContext
  if (modelContext?.registerTool) {
    modelContext.registerTool(
      {
        name: SALES_RECORD_QUERY_TOOL,
      description: '【销售数据展示工具】帮助管理员查询最近一段时间的商品销售趋势、统计图表数据',
      inputSchema: {
        type: 'object',
        properties: {
          timeRange: {
            type: 'string',
            enum: ['7days', '30days', 'year'],
            description: '查询时间范围'
          }
        }
      },
      execute: async ({ timeRange }: { timeRange?: '7days' | '30days' | 'year' }) => {
        const range = timeRange ?? '30days'
        activeRange.value = range
        const s = salesSummary[range]
        const label = range === '7days' ? '近7天' : range === '30days' ? '近30天' : '过去一年'
        const text = `${label}销售数据：\n- 总销售额：¥${s.totalSales.toLocaleString()}\n- 总订单数：${s.orders}\n- 退货率：${s.returnRate}\n\n详细图表已更新，可在左侧查看。`
        return { content: [{ type: 'text', text }] }
      }
    },
    { signal: abortController.signal }
  )
  }
})
onUnmounted(() => {
  abortController.abort()
})
</script>

<style scoped>
.sales-container {
  padding: 20px;
  background: #f8f9ff;
  overflow-y: auto;
}

.header {
  margin-bottom: 20px;
}
.header h2 {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 4px;
  color: #1e1b4b;
}
.subtitle {
  color: #6b7280;
  margin: 0;
  font-size: 0.88rem;
}

/* Stats Row */
.stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}
.stat-card {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 2px 12px rgba(99, 102, 241, 0.06);
  border: 1px solid #ede9fe;
}
.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}
.stat-label {
  font-size: 0.8rem;
  color: #9ca3af;
  margin-bottom: 4px;
}
.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e1b4b;
  margin-bottom: 2px;
}
.stat-trend {
  font-size: 0.75rem;
}
.stat-trend.positive {
  color: #059669;
}
.stat-trend.negative {
  color: #dc2626;
}

/* Charts Section */
.charts-section {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 14px;
  margin-bottom: 14px;
}
.chart-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px 16px 20px;
  border: 1px solid #ede9fe;
  box-shadow: 0 2px 12px rgba(99, 102, 241, 0.05);
}
.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.chart-header h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1e1b4b;
}
.tab-group {
  display: flex;
  gap: 4px;
}
.tab {
  padding: 3px 10px;
  font-size: 0.78rem;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  font-weight: 500;
  transition: all 0.18s;
}
.tab:hover {
  background: rgba(99, 102, 241, 0.08);
  color: #6366f1;
}
.tab.active {
  background: #6366f1;
  color: #fff;
}

/* Table Section */
.table-section {
  background: #fff;
  border-radius: 12px;
  padding: 18px 20px;
  border: 1px solid #ede9fe;
  box-shadow: 0 2px 12px rgba(99, 102, 241, 0.05);
}
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.section-header h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #1e1b4b;
}
.badge {
  padding: 2px 8px;
  background: linear-gradient(135deg, #6366f1, #3b82f6);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 20px;
}

.rank-table {
  width: 100%;
  border-collapse: collapse;
}
.rank-table th {
  padding: 8px 12px;
  text-align: left;
  font-size: 0.8rem;
  color: #9ca3af;
  font-weight: 600;
  border-bottom: 1px solid #f3f4f6;
}
.rank-table td {
  padding: 10px 12px;
  font-size: 0.88rem;
  color: #374151;
  border-bottom: 1px solid #f9fafb;
}
.rank-table tr:last-child td {
  border-bottom: none;
}

.rank-badge {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  background: #f3f4f6;
  color: #9ca3af;
}
.rank-badge.top {
  background: linear-gradient(135deg, #6366f1, #3b82f6);
  color: #fff;
}

.product-name {
  font-weight: 500;
  color: #1e1b4b;
}
.category-tag {
  padding: 2px 8px;
  font-size: 0.75rem;
  border-radius: 4px;
  background: #ede9fe;
  color: #7c3aed;
  font-weight: 500;
}
.amount {
  font-weight: 600;
  color: #1e1b4b;
}

.progress-bar {
  height: 4px;
  background: #f3f4f6;
  border-radius: 2px;
  width: 80px;
  display: inline-block;
  vertical-align: middle;
  margin-right: 6px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.4s ease;
}
.ratio-text {
  font-size: 0.78rem;
  color: #6b7280;
  vertical-align: middle;
}
</style>

<template>
  <div class="orders-view">
    <div class="page-header">
      <div class="header-left">
        <h2>订单管理</h2>
        <p class="subtitle">查询和追踪客户订单，支持按状态筛选</p>
      </div>
      <div class="header-right">
        <tiny-select v-model="filterStatus" placeholder="所有状态" clearable style="width: 140px; margin-right: 12px">
          <tiny-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
        </tiny-select>
        <tiny-input
          v-model="searchText"
          placeholder="搜索订单号或客户名"
          prefix-icon="search"
          clearable
          style="width: 220px"
        />
      </div>
    </div>

    <div class="table-container">
      <tiny-grid :data="filteredOrders" border resizable>
        <tiny-grid-column type="index" width="60" />
        <tiny-grid-column field="id" title="订单号" width="150">
          <template #default="{ row }">
            <span class="order-id">{{ row.id }}</span>
          </template>
        </tiny-grid-column>
        <tiny-grid-column field="customerName" title="客户姓名" width="100" />
        <tiny-grid-column field="customerPhone" title="联系电话" width="150" />
        <tiny-grid-column field="productName" title="商品名称" min-width="220" />
        <tiny-grid-column field="quantity" title="数量" width="70" align="center" />
        <tiny-grid-column field="totalAmount" title="订单金额" width="120" align="right">
          <template #default="{ row }">
            <span class="amount">¥{{ row.totalAmount.toLocaleString() }}</span>
          </template>
        </tiny-grid-column>
        <tiny-grid-column field="paymentMethod" title="支付方式" width="110" />
        <tiny-grid-column field="status" title="状态" width="110" align="center">
          <template #default="{ row }">
            <span :class="['status-tag', row.status.toLowerCase()]">
              {{ statusLabelMap[row.status] }}
            </span>
          </template>
        </tiny-grid-column>
        <tiny-grid-column field="createdAt" title="下单时间" width="180" />
      </tiny-grid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { orderList, type OrderItem } from '../../mock'
import { registerPageTool } from '@opentiny/next-sdk'

const searchText = ref('')
const filterStatus = ref('')

const statusOptions = [
  { label: '待发货', value: 'Pending' },
  { label: '已发货', value: 'Shipped' },
  { label: '已签收', value: 'Delivered' },
  { label: '已退款', value: 'Refunded' },
  { label: '已取消', value: 'Cancelled' }
]

const statusLabelMap: Record<string, string> = {
  Pending: '待发货',
  Shipped: '已发货',
  Delivered: '已签收',
  Refunded: '已退款',
  Cancelled: '已取消'
}

const filteredOrders = computed(() => {
  return orderList.value.filter((o) => {
    const matchStatus = !filterStatus.value || o.status === filterStatus.value
    const searchLower = searchText.value.toLowerCase()
    const matchSearch =
      !searchText.value ||
      o.id.toLowerCase().includes(searchLower) ||
      o.customerName.toLowerCase().includes(searchLower)
    return matchStatus && matchSearch
  })
})

let cleanupPageTool: (() => void) | undefined

onMounted(() => {
  cleanupPageTool = registerPageTool({
    // 显式指定路由，需与 mcp-servers 中 RouteConfig.route '/orders' 保持一致
    route: '/orders',
    handlers: {
      // 查询订单列表（支持按订单号、客户姓名、状态筛选）
      order_query: async ({
        orderId,
        customerName,
        status
      }: {
        orderId?: string
        customerName?: string
        status?: string
      }) => {
        let result = orderList.value as OrderItem[]
        if (orderId) result = result.filter((o) => o.id.toLowerCase().includes(orderId.toLowerCase()))
        if (customerName)
          result = result.filter((o) => o.customerName.toLowerCase().includes(customerName.toLowerCase()))
        if (status) result = result.filter((o) => o.status === status)

        // 同步更新页面筛选框
        if (status) filterStatus.value = status
        if (orderId || customerName) searchText.value = orderId ?? customerName ?? ''

        const text =
          result.length === 0
            ? '未找到符合条件的订单。'
            : `找到 ${result.length} 条订单：\n${result
                .map(
                  (o) =>
                    `- ${o.id}｜${o.customerName}｜${o.productName}｜¥${o.totalAmount}｜${statusLabelMap[o.status]}`
                )
                .join('\n')}`
        return { content: [{ type: 'text', text }] }
      },

      // 查询单条订单详情
      order_detail: async ({ orderId }: { orderId: string }) => {
        const order = orderList.value.find((o) => o.id === orderId)
        if (!order) {
          return { content: [{ type: 'text', text: `未找到订单号为 ${orderId} 的订单。` }] }
        }
        // 高亮该订单
        searchText.value = orderId
        const text = `订单详情（${orderId}）：
- 客户：${order.customerName}（${order.customerPhone}）
- 商品：${order.productName} × ${order.quantity}
- 金额：¥${order.totalAmount.toLocaleString()}
- 支付：${order.paymentMethod}
- 状态：${statusLabelMap[order.status]}
- 下单时间：${order.createdAt}${order.shippedAt ? `\n- 发货时间：${order.shippedAt}` : ''}`
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
.orders-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  animation: fadeIn 0.4s ease-out;
}

.page-header {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.page-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1d2129;
  margin: 0 0 4px;
}
.subtitle {
  color: #86909c;
  font-size: 0.95rem;
  margin: 0;
}
.header-right {
  display: flex;
  align-items: center;
}

.table-container {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
  flex: 1;
}

.order-id {
  font-family: monospace;
  font-weight: 600;
  color: #3a78ec;
}
.amount {
  font-weight: 600;
  color: #1d2129;
}

.status-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 500;
}
.status-tag.pending {
  background: #e8f3ff;
  color: #165dff;
}
.status-tag.shipped {
  background: #fff7e8;
  color: #ff7d00;
}
.status-tag.delivered {
  background: #e8ffea;
  color: #00b42a;
}
.status-tag.refunded {
  background: #f5f5f5;
  color: #86909c;
}
.status-tag.cancelled {
  background: #ffece8;
  color: #f53f3f;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

<template>
  <div class="price-protection-page">
    <div class="page-header">
      <h3>价保管理</h3>
      <div class="header-stats">
        <span class="stat-item pending">待审核 {{ statusCount.pending }}</span>
        <span class="stat-item approved">已通过 {{ statusCount.approved }}</span>
        <span class="stat-item rejected">已拒绝 {{ statusCount.rejected }}</span>
        <span class="stat-item expired">已过期 {{ statusCount.expired }}</span>
      </div>
    </div>
    <div class="page-content">
      <tiny-grid
        auto-resize
        ref="gridRef"
        :data="records"
        :height="500"
        :edit-config="{ trigger: 'click', mode: 'cell', showStatus: true }"
      >
        <tiny-grid-column type="index" width="50" />
        <tiny-grid-column type="selection" width="50" />
        <tiny-grid-column field="orderId" title="订单号" width="180" />
        <tiny-grid-column field="productName" title="商品名称" />
        <tiny-grid-column field="buyPrice" title="购买价格">
          <template #default="{ row }">¥{{ row.buyPrice }}</template>
        </tiny-grid-column>
        <tiny-grid-column field="currentPrice" title="当前价格">
          <template #default="{ row }">¥{{ row.currentPrice }}</template>
        </tiny-grid-column>
        <tiny-grid-column field="diffPrice" title="可退差价">
          <template #default="{ row }">
            <span class="diff-price">¥{{ row.diffPrice }}</span>
          </template>
        </tiny-grid-column>
        <tiny-grid-column field="applyDate" title="申请日期" width="110" />
        <tiny-grid-column field="expireDate" title="到期日期" width="110" />
        <tiny-grid-column field="status" title="状态" width="100">
          <template #default="{ row }">
            <tiny-tag :type="statusType[row.status]">{{ statusLabels[row.status] }}</tiny-tag>
          </template>
        </tiny-grid-column>
        <tiny-grid-column field="remark" title="备注" />
        <tiny-grid-column title="操作" width="140">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <tiny-button type="primary" size="mini" @click="handleApprove(row)">通过</tiny-button>
              <tiny-button type="danger" size="mini" style="margin-left: 6px" @click="handleReject(row)"
                >拒绝</tiny-button
              >
            </template>
            <span v-else class="no-action">—</span>
          </template>
        </tiny-grid-column>
      </tiny-grid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { registerPageTool } from '@opentiny/next-sdk'
import rawData from './price-protection.json'

// 状态标签与样式映射
const statusLabels: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
  expired: '已过期'
}
const statusType: Record<string, string> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  expired: 'info'
}

// 审批默认备注，统一管理避免多处重复导致不一致
const DEFAULT_REMARKS = {
  approve: '审核通过，差价将在3个工作日内退回',
  reject: '不符合价保条件，不予受理'
} as const

const records = ref(rawData as any[])

// 各状态数量统计
const statusCount = computed(() => {
  const count = { pending: 0, approved: 0, rejected: 0, expired: 0 }
  records.value.forEach((r) => {
    if (r.status in count) count[r.status as keyof typeof count]++
  })
  return count
})

// 审核通过
function handleApprove(row: any) {
  row.status = 'approved'
  row.remark = DEFAULT_REMARKS.approve
}

// 审核拒绝
function handleReject(row: any) {
  row.status = 'rejected'
  row.remark = DEFAULT_REMARKS.reject
}

// 注册页面 MCP 工具处理器
let cleanupPageTool: () => void

onMounted(() => {
  cleanupPageTool = registerPageTool({
    route: '/price-protection',
    handlers: {
      // 查询价保申请列表，支持按状态过滤
      'price-protection-query': async ({ status }: { status?: string }) => {
        const result = status ? records.value.filter((r) => r.status === status) : records.value
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        }
      },

      // 审批价保申请
      'price-protection-review': async ({
        id,
        action,
        remark
      }: {
        id: number
        action: 'approve' | 'reject'
        remark?: string
      }) => {
        const record = records.value.find((r) => r.id === id)
        if (!record) {
          return { content: [{ type: 'text', text: `未找到 ID 为 ${id} 的价保申请` }] }
        }
        if (record.status !== 'pending') {
          return {
            content: [{ type: 'text', text: `申请 ${id} 当前状态为「${statusLabels[record.status]}」，无法再次审核` }]
          }
        }
        record.status = action === 'approve' ? 'approved' : 'rejected'
        record.remark = remark ?? (action === 'approve' ? DEFAULT_REMARKS.approve : DEFAULT_REMARKS.reject)
        return {
          content: [
            {
              type: 'text',
              text: `申请 ${id}（${record.productName}）已${action === 'approve' ? '通过' : '拒绝'}，备注：${record.remark}`
            }
          ]
        }
      },

      // 获取价保申请详情
      'price-protection-detail': async ({ id }: { id: number }) => {
        const record = records.value.find((r) => r.id === id)
        if (!record) {
          return { content: [{ type: 'text', text: `未找到 ID 为 ${id} 的价保申请` }] }
        }
        return { content: [{ type: 'text', text: JSON.stringify(record, null, 2) }] }
      }
    }
  })
})

onUnmounted(() => cleanupPageTool?.())
</script>

<style scoped lang="less">
.price-protection-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    height: 32px;

    h3 {
      margin: 0;
    }
  }
}

.header-stats {
  display: flex;
  gap: 12px;

  .stat-item {
    font-size: 13px;
    padding: 3px 12px;
    border-radius: 12px;
    font-weight: 500;

    &.pending {
      background: #fff7e6;
      color: #fa8c16;
    }
    &.approved {
      background: #f6ffed;
      color: #52c41a;
    }
    &.rejected {
      background: #fff1f0;
      color: #ff4d4f;
    }
    &.expired {
      background: #f5f5f5;
      color: #8c8c8c;
    }
  }
}

.page-content {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.03);
}

.diff-price {
  color: #ff4d4f;
  font-weight: 600;
}

.no-action {
  color: #bfbfbf;
  font-size: 13px;
}
</style>

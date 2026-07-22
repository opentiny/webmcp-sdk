<template>
  <div class="price-protection-view">
    <div class="page-header">
      <div class="header-left">
        <h2>价保单监控</h2>
        <p class="subtitle">跟踪并审批客户提起的价保申请订单</p>
      </div>
      <div class="header-right">
        <button class="btn-add" @click="handleManualAdd">＋ 新增价保申请</button>
      </div>
    </div>

    <div class="table-container">
      <tiny-grid :data="priceProtectionList" border resizable>
        <tiny-grid-column type="index" width="60" />
        <tiny-grid-column field="id" title="价保单号" width="180" />
        <tiny-grid-column field="orderId" title="原订单号" width="150" />
        <tiny-grid-column field="customerName" title="客户姓名" width="100" />
        <tiny-grid-column field="amount" title="补偿金额" width="110" align="right">
          <template #default="{ row }">
            <span class="amount">￥{{ row.amount }}</span>
          </template>
        </tiny-grid-column>
        <tiny-grid-column field="reason" title="价保原因" min-width="180" />
        <tiny-grid-column field="status" title="当前状态" width="110" align="center">
          <template #default="{ row }">
            <span :class="['status-bubble', row.status.toLowerCase()]">
              {{ statusLabel[row.status] }}
            </span>
          </template>
        </tiny-grid-column>
        <tiny-grid-column field="createdAt" title="提起时间" width="175" />
        <!-- 操作列：仅 Pending 状态展示审批/驳回按钮 -->
        <tiny-grid-column title="操作" width="150" align="center">
          <template #default="{ row }">
            <div v-if="row.status === 'Pending'" class="row-actions">
              <button class="act-btn approve" @click="handleApprove(row)">通过</button>
              <button class="act-btn reject" @click="handleReject(row)">驳回</button>
            </div>
            <span v-else class="action-done">—</span>
          </template>
        </tiny-grid-column>
      </tiny-grid>
    </div>

    <!-- 客户申请审批核对弹窗（AI 调用 / 手动新增共用） -->
    <PriceProtectionModal ref="modalRef" />

    <!-- 审批确认对话框 -->
    <tiny-dialog-box
      v-model:visible="reviewDialog.visible"
      :title="reviewDialog.action === 'approve' ? '确认审批通过' : '确认驳回'"
      width="420px"
    >
      <div class="review-confirm">
        <p>
          即将对价保申请
          <strong>{{ reviewDialog.orderId }}</strong>
          执行
          <strong :class="reviewDialog.action === 'approve' ? 'text-success' : 'text-danger'">
            {{ reviewDialog.action === 'approve' ? '审批通过' : '驳回' }}
          </strong>
          操作。
        </p>
        <tiny-form :model="reviewDialog">
          <tiny-form-item label="备注（可选）">
            <tiny-input v-model="reviewDialog.remark" type="textarea" :rows="2" placeholder="填写审批备注" />
          </tiny-form-item>
        </tiny-form>
      </div>
      <template #footer>
        <tiny-button @click="reviewDialog.visible = false">取消</tiny-button>
        <tiny-button :type="reviewDialog.action === 'approve' ? 'success' : 'danger'" @click="confirmReview">
          确认{{ reviewDialog.action === 'approve' ? '通过' : '驳回' }}
        </tiny-button>
      </template>
    </tiny-dialog-box>
  </div>
</template>

<script setup lang="ts">
import { priceProtectionList, type PriceProtectionOrder } from '../../mock'
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import PriceProtectionModal from '../../components/PriceProtectionModal.vue'

const modalRef = ref()

const statusLabel: Record<string, string> = {
  Pending: '待处理',
  Approved: '已通过',
  Rejected: '已拒绝'
}

// 手动点击按钮新增价保申请（与 AI 调用共用同一个弹窗）
const handleManualAdd = () => {
  modalRef.value?.openModal({ customerName: '', orderId: '', amount: 0, reason: '' })
}

// 行内审批对话框状态
const reviewDialog = reactive({
  visible: false,
  action: 'approve' as 'approve' | 'reject',
  orderId: '',
  id: '',
  remark: ''
})

const handleApprove = (row: PriceProtectionOrder) => {
  reviewDialog.action = 'approve'
  reviewDialog.orderId = row.orderId
  reviewDialog.id = row.id
  reviewDialog.remark = ''
  reviewDialog.visible = true
}

const handleReject = (row: PriceProtectionOrder) => {
  reviewDialog.action = 'reject'
  reviewDialog.orderId = row.orderId
  reviewDialog.id = row.id
  reviewDialog.remark = ''
  reviewDialog.visible = true
}

const confirmReview = () => {
  const order = priceProtectionList.value.find((o) => o.id === reviewDialog.id)
  if (order) {
    if (order.status !== 'Pending') {
      alert(`申请单状态为「${order.status}」，无法重复审核。`)
      reviewDialog.visible = false
      return
    }
    order.status = reviewDialog.action === 'approve' ? 'Approved' : 'Rejected'
    if (reviewDialog.remark) {
      order.remark = reviewDialog.remark
    }
  }
  reviewDialog.visible = false
}

const PRICE_PROTECTION_QUERY_TOOL = 'price-protection-query'
const PRICE_PROTECTION_REVIEW_TOOL = 'price-protection-review'
const PRICE_PROTECTION_DETAIL_TOOL = 'price-protection-detail'
const ADD_PRICE_PROTECTION_TOOL = 'add_price_protection'
const abortController = new AbortController()

onMounted(() => {
  const modelContext = (document as any).modelContext
  if (modelContext?.registerTool) {
    modelContext.registerTool(
    {
    name: PRICE_PROTECTION_QUERY_TOOL,
    description: '查询商品价保申请列表，可按状态筛选（pending/approved/rejected/expired），不传 status 则返回全部',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'approved', 'rejected', 'expired'],
          description: '申请状态，不传则查询全部'
        }
      }
    },
    execute: async ({ status }: { status?: string }) => {
      const list = status
        ? priceProtectionList.value.filter((o) => o.status.toLowerCase() === status.toLowerCase())
        : priceProtectionList.value
      const text = `查询到 ${list.length} 条价保申请：\n${JSON.stringify(list, null, 2)}`
      return { content: [{ type: 'text', text }] }
    }
  },
  { signal: abortController.signal }
  )

  modelContext.registerTool(
    {
    name: PRICE_PROTECTION_REVIEW_TOOL,
    description: '对待审核的价保申请进行审批，支持通过（approve）或拒绝（reject），可附加备注',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          pattern: '^PP-\\d{8}-\\d{2}$',
          description: '价保申请 ID'
        },
        action: {
          type: 'string',
          enum: ['approve', 'reject'],
          description: '审批动作：approve=通过，reject=拒绝'
        },
        remark: { type: 'string', description: '审批备注（可选）' }
      },
      required: ['id', 'action']
    },
    execute: async ({
      id,
      action,
      remark
    }: {
      id: string | number
      action: 'approve' | 'reject'
      remark?: string
    }) => {
      const order = priceProtectionList.value.find((o) => o.id === String(id))
      if (!order) {
        return { content: [{ type: 'text', text: `未找到 ID 为 ${id} 的价保申请。` }] }
      }
      if (order.status !== 'Pending') {
        return { content: [{ type: 'text', text: `申请单状态为「${order.status}」，无法重复审核。` }] }
      }
      order.status = action === 'approve' ? 'Approved' : 'Rejected'
      if (remark) {
        order.remark = remark
      }
      const remarkText = remark ? `，备注：${remark}` : ''
      return {
        content: [{ type: 'text', text: `价保申请 ${order.id} 已${action === 'approve' ? '通过' : '拒绝'}${remarkText}。` }]
      }
    }
  },
  { signal: abortController.signal }
  )

  modelContext.registerTool(
    {
    name: PRICE_PROTECTION_DETAIL_TOOL,
    description: '根据申请 ID 获取单条价保申请的完整详情',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          pattern: '^PP-\\d{8}-\\d{2}$',
          description: '价保申请 ID'
        }
      },
      required: ['id']
    },
    execute: async ({ id }: { id: string | number }) => {
      const order = priceProtectionList.value.find((o) => o.id === String(id))
      const text = order ? `价保申请详情：\n${JSON.stringify(order, null, 2)}` : `未找到 ID 为 ${id} 的价保申请。`
      return { content: [{ type: 'text', text }] }
    }
  },
  { signal: abortController.signal }
  )

  modelContext.registerTool(
    {
    name: ADD_PRICE_PROTECTION_TOOL,
    description:
      '【价保监控工具】帮助电商管理员处理顾客因降价提出的补差价请求（价保申请）。注意：在调用本工具前，你必须先使用 get_skill_content 工具读取相关的技能文档，严禁凭空构造参数或跳过业务规则直接调用。',
    inputSchema: {
      type: 'object',
      properties: {
        isSkillRead: {
          type: 'boolean',
          description: '是否已经通过 get_skill_content 读取过技能文档？必须阅读文档后才允许传 true。如果你还没有阅读文档，严禁调用此工具。'
        },
        customerName: { type: 'string', description: '提出价保申请的顾客姓名' },
        orderId: { type: 'string', description: '需要价保补偿的原订单编号' },
        amount: { type: 'number', description: '申请补偿的差价金额' },
        reason: { type: 'string', description: '顾客申请价保的原因' }
      },
      required: ['isSkillRead', 'customerName', 'orderId', 'amount', 'reason']
    },
    execute: async (params: any) => {
      if (!params.isSkillRead) {
        return {
          content: [
            {
              type: 'text',
              text: '错误：在调用此工具前，你必须先使用 get_skill_content 读取相关技能文档。请先阅读技能文档后再重新调用。'
            }
          ]
        }
      }
      if (!modalRef.value) {
        return { content: [{ type: 'text', text: '错误：价保弹窗未加载，当前页面可能已被销毁。' }] }
      }
      const result = await modalRef.value.openModal(params)
      return { content: [{ type: 'text', text: result }] }
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
.price-protection-view {
  animation: fadeIn 0.4s ease-out;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.page-header {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1d2129;
  margin: 0 0 4px 0;
}

.subtitle {
  color: #86909c;
  font-size: 0.95rem;
  margin: 0;
}

.review-confirm p {
  font-size: 0.95rem;
  margin-bottom: 16px;
  color: #1d2129;
  line-height: 1.6;
}
.review-confirm strong {
  font-weight: 600;
}
.text-success {
  color: #00b42a;
}
.text-danger {
  color: #f53f3f;
}

.action-done {
  color: #c9cdd4;
  font-size: 1rem;
}

/* 顶部新增按钮 */
.btn-add {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #6366f1;
  background: #fff;
  border: 1.5px solid #c7d2fe;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.btn-add:hover {
  background: rgba(99, 102, 241, 0.06);
  border-color: #818cf8;
}

/* 行内操作按钮组 */
.row-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.act-btn {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  font-size: 0.78rem;
  font-weight: 600;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.18s;
  white-space: nowrap;
}
.act-btn.approve {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}
.act-btn.approve:hover {
  background: #d1fae5;
  border-color: #6ee7b7;
}
.act-btn.reject {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}
.act-btn.reject:hover {
  background: #fee2e2;
  border-color: #f87171;
}

.table-container {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
  flex: 1;
}

.amount {
  font-weight: 600;
  color: #f53f3f;
}

.status-bubble {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.status-bubble.approved {
  background: #e8ffea;
  color: #00b42a;
}

.status-bubble.pending {
  background: #e8f3ff;
  color: #165dff;
}

.status-bubble.rejected {
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

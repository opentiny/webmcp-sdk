<template>
  <tiny-dialog-box
    v-model:visible="visible"
    title="价保申请审核"
    width="520px"
    :modal-append-to-body="true"
    :close-on-click-modal="false"
    custom-class="pp-dialog"
    @close="handleClose"
  >
    <!-- AI Banner -->
    <div class="ai-banner">
      <div class="ai-avatar">
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
          <circle cx="20" cy="20" r="20" fill="url(#grad)" />
          <!-- Brain / Circuit nodes -->
          <circle cx="20" cy="14" r="2.5" fill="white" opacity="0.9" />
          <circle cx="13" cy="23" r="2" fill="white" opacity="0.9" />
          <circle cx="27" cy="23" r="2" fill="white" opacity="0.9" />
          <circle cx="20" cy="28" r="1.8" fill="white" opacity="0.7" />
          <line x1="20" y1="16.5" x2="13.8" y2="21.2" stroke="white" stroke-width="1.2" opacity="0.6" />
          <line x1="20" y1="16.5" x2="26.2" y2="21.2" stroke="white" stroke-width="1.2" opacity="0.6" />
          <line x1="14.8" y1="24.4" x2="19" y2="27" stroke="white" stroke-width="1.2" opacity="0.6" />
          <line x1="25.2" y1="24.4" x2="21" y2="27" stroke="white" stroke-width="1.2" opacity="0.6" />
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop stop-color="#6366f1" />
              <stop offset="1" stop-color="#3b82f6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div class="ai-text">
        <div class="ai-label">AI 业务助手</div>
        <div class="ai-desc">已捕获客户价保诉求，请核实并确认以下信息后提交审批。</div>
      </div>
    </div>

    <!-- Form -->
    <tiny-form :model="formData" label-width="100px" class="pp-form">
      <tiny-form-item label="客户姓名">
        <tiny-input v-model="formData.customerName" placeholder="例如：张三" />
      </tiny-form-item>
      <tiny-form-item label="原订单号">
        <tiny-input v-model="formData.orderId" placeholder="例如：ORD-5X9A2B" />
      </tiny-form-item>
      <tiny-form-item label="补偿金额">
        <tiny-numeric
          v-model="formData.amount"
          :min="0.01"
          :max="99999"
          :precision="2"
          :step="10"
          style="width: 100%"
        />
      </tiny-form-item>
      <tiny-form-item label="申请事由">
        <tiny-input type="textarea" v-model="formData.reason" placeholder="例如：百亿补贴大促降价保底" :rows="3" />
      </tiny-form-item>
    </tiny-form>

    <template #footer>
      <div class="dialog-footer">
        <tiny-button class="btn-cancel" @click="handleCancel">驳回申请</tiny-button>
        <tiny-button class="btn-confirm" @click="handleConfirm">
          <span class="btn-icon">✓</span> 审核通过并建单
        </tiny-button>
      </div>
    </template>
  </tiny-dialog-box>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { addPriceProtectionOrder } from '../mock'

const visible = ref(false)
const formData = ref({ customerName: '', orderId: '', amount: 0, reason: '' })

let currentResolve: ((result: string) => void) | null = null

const openModal = (params: { customerName: string; orderId: string; amount: number; reason: string }) => {
  if (currentResolve) {
    currentResolve('❌ 用户发起了新的操作，前置价保申请已取消。')
  }
  formData.value = {
    customerName: params.customerName || '',
    orderId: params.orderId || '',
    amount: params.amount || 0,
    reason: params.reason || ''
  }
  visible.value = true
  return new Promise<string>((resolve) => {
    currentResolve = resolve
  })
}

const handleConfirm = () => {
  if (!formData.value.customerName) {
    alert('客户姓名不能为空')
    return
  }
  if (!formData.value.orderId) {
    alert('原订单号不能为空')
    return
  }
  if (!formData.value.amount || formData.value.amount <= 0) {
    alert('补偿金额必须大于 0')
    return
  }
  if (!formData.value.reason) {
    alert('申请事由不能为空')
    return
  }
  addPriceProtectionOrder({
    customerName: formData.value.customerName,
    orderId: formData.value.orderId,
    amount: formData.value.amount,
    reason: formData.value.reason
  })
  currentResolve?.(
    `价保单已建立：订单 ${formData.value.orderId}，补偿 ¥${formData.value.amount}，客户：${formData.value.customerName}。`
  )
  visible.value = false
  currentResolve = null
}

const handleCancel = () => {
  currentResolve?.('已驳回该笔价保申请。')
  visible.value = false
  currentResolve = null
}

const handleClose = () => {
  if (currentResolve) {
    currentResolve('❌ 对话框已关闭，操作取消。')
    currentResolve = null
  }
}

defineExpose({ openModal })
</script>

<style>
/* 对话框外层定制 - 非 scoped 以穿透 tiny-dialog */
.pp-dialog .tiny-dialog-box__header {
  background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%);
  padding: 20px 24px 16px;
  border-radius: 12px 12px 0 0;
}
.pp-dialog .tiny-dialog-box__title {
  color: #fff !important;
  font-size: 1.05rem;
  font-weight: 600;
}
.pp-dialog .tiny-dialog-box__headerbtn .tiny-dialog-box__close {
  color: rgba(255, 255, 255, 0.8) !important;
}
.pp-dialog .tiny-dialog-box__body {
  padding: 0;
}
.pp-dialog .tiny-dialog-box__footer {
  padding: 16px 24px 20px;
  border-top: 1px solid #f0f0f0;
}
</style>

<style scoped>
/* AI Banner */
.ai-banner {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.07) 0%, rgba(59, 130, 246, 0.04) 100%);
  border-left: 3px solid #6366f1;
  padding: 16px 20px;
  margin: 0 0 4px;
}
.ai-avatar {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
}
.ai-avatar svg {
  display: block;
}
.ai-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: #6366f1;
  letter-spacing: 0.03em;
  margin-bottom: 4px;
  text-transform: uppercase;
}
.ai-desc {
  font-size: 0.9rem;
  color: #374151;
  line-height: 1.5;
}

/* Form */
.pp-form {
  padding: 20px 24px 8px;
}

/* Footer */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel {
  border: 1px solid #e5e7eb;
  color: #6b7280;
  background: #fff;
  border-radius: 8px;
  padding: 0 20px;
  font-size: 0.9rem;
  transition: all 0.2s;
}
.btn-cancel:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #374151;
}

.btn-confirm {
  background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%) !important;
  color: white !important;
  border: none !important;
  border-radius: 8px;
  padding: 0 24px;
  font-size: 0.9rem;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn-confirm:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(99, 102, 241, 0.5);
}
.btn-icon {
  font-size: 1rem;
  font-weight: 700;
}
</style>

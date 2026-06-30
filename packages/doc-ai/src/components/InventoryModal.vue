<template>
  <tiny-dialog-box
    v-model:visible="visible"
    title="📦 新增入库单核对"
    width="500px"
    :modal-append-to-body="true"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="modal-content">
      <div class="alert-info">
        <span class="icon">🤖</span>
        <div class="text">
          <strong>AI 业务助手</strong> 已为您提取了入库请求。请核实下方商品数量及存放仓库，确认无误后点击执行。
        </div>
      </div>

      <tiny-form :model="formData" label-width="80px" class="form-container">
        <tiny-form-item label="商品名称">
          <tiny-input v-model="formData.productName" placeholder="例如: iPhone 15 Pro Max"></tiny-input>
        </tiny-form-item>
        <tiny-form-item label="入库数量">
          <tiny-numeric v-model="formData.quantity" :min="1" :max="99999"></tiny-numeric>
        </tiny-form-item>
        <tiny-form-item label="存放仓库">
          <tiny-select v-model="formData.warehouse" placeholder="请选择仓库">
            <tiny-option label="北京一号仓" value="北京一号仓"></tiny-option>
            <tiny-option label="上海二号仓" value="上海二号仓"></tiny-option>
            <tiny-option label="广州中心仓" value="广州中心仓"></tiny-option>
            <tiny-option label="深圳坂田仓" value="深圳坂田仓"></tiny-option>
          </tiny-select>
        </tiny-form-item>
      </tiny-form>
    </div>

    <template #footer>
      <tiny-button @click="handleCancel">取消本次入库</tiny-button>
      <tiny-button type="primary" @click="handleConfirm">确认并执行入库</tiny-button>
    </template>
  </tiny-dialog-box>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { addInventory } from '../mock'

const visible = ref(false)
const formData = ref({
  productName: '',
  quantity: 1,
  warehouse: '北京一号仓'
})

// 保存 MCP Tool 的 resolve 回调
let currentResolve: ((result: string) => void) | null = null

// 由外部工具调用此方法，传入 AI 提取到的参数
const openModal = (params: { productName: string; quantity: number; warehouse: string }) => {
  if (currentResolve) {
    currentResolve('❌ 用户发起了新的操作，前置入库已取消。')
  }
  formData.value = {
    productName: params.productName || '',
    quantity: params.quantity || 1,
    warehouse: params.warehouse || '北京一号仓'
  }
  visible.value = true

  return new Promise<string>((resolve) => {
    currentResolve = resolve
  })
}

const handleConfirm = () => {
  if (!formData.value.productName) {
    alert('商品名称不能为空')
    return
  }

  // 更新 Mock 数据
  addInventory({
    productName: formData.value.productName,
    sku: `SKU-AUTO-${Math.floor(Math.random() * 10000)}`,
    quantity: formData.value.quantity,
    warehouse: formData.value.warehouse
  })

  if (currentResolve) {
    currentResolve(
      `📦 成功！已将 ${formData.value.quantity} 件 ${formData.value.productName} 入库到 ${formData.value.warehouse}。`
    )
  }

  visible.value = false
  currentResolve = null
}

const handleCancel = () => {
  if (currentResolve) {
    currentResolve('❌ 用户取消了入库操作。')
  }
  visible.value = false
  currentResolve = null
}

const handleClose = () => {
  if (currentResolve) {
    currentResolve('❌ 对话框已关闭，操作取消。')
    currentResolve = null
  }
}

defineExpose({
  openModal
})
</script>

<style scoped>
.modal-content {
  padding: 10px 0;
}

.alert-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #f0f5ff;
  border: 1px solid #c9defc;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
}

.alert-info .icon {
  font-size: 1.5rem;
  line-height: 1;
}

.alert-info .text {
  font-size: 0.95rem;
  color: #1d2129;
  line-height: 1.5;
}

.form-container {
  padding: 0 10px;
}
</style>

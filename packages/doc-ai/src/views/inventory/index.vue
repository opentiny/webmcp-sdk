<template>
  <div class="inventory-view">
    <div class="page-header">
      <div class="header-left">
        <h2>库存管理</h2>
        <p class="subtitle">管理商品库存，支持 AI 辅助快速建仓与数量更新</p>
      </div>
      <div class="header-right">
        <button class="btn-add" @click="handleManualAdd">＋ 手动新增入库</button>
      </div>
    </div>

    <div class="table-container">
      <tiny-grid :data="inventoryList" border resizable>
        <tiny-grid-column type="index" width="60"></tiny-grid-column>
        <tiny-grid-column field="id" title="库存单号" width="120"></tiny-grid-column>
        <tiny-grid-column field="productName" title="商品名称" min-width="180"></tiny-grid-column>
        <tiny-grid-column field="sku" title="SKU编码" width="160"></tiny-grid-column>
        <tiny-grid-column field="warehouse" title="仓库" width="140"></tiny-grid-column>
        <tiny-grid-column field="quantity" title="在库数量" width="100" align="right">
          <template #default="data">
            <strong>{{ data.row.quantity }}</strong>
          </template>
        </tiny-grid-column>
        <tiny-grid-column field="status" title="状态" width="120">
          <template #default="data">
            <span :class="['status-tag', data.row.status.replace(/ /g, '-').toLowerCase()]">
              {{ data.row.status === 'In Stock' ? '库存充足' : data.row.status === 'Low Stock' ? '库存预警' : '缺货' }}
            </span>
          </template>
        </tiny-grid-column>
        <tiny-grid-column field="lastUpdated" title="最后更新时间" width="180"></tiny-grid-column>
      </tiny-grid>
    </div>

    <!-- 新增入库单核对弹窗 -->
    <InventoryModal ref="modalRef" />
  </div>
</template>

<script setup lang="ts">
import { inventoryList } from '../../mock'
import { ref, onMounted, onUnmounted } from 'vue'
import InventoryModal from '../../components/InventoryModal.vue'

const modalRef = ref()
const abortController = new AbortController()

const handleManualAdd = () => {
  // 唤起表单但使用空数据
  modalRef.value.openModal({ productName: '', quantity: 1, warehouse: '' }).then((res: string) => {
    console.log(res)
  })
}

const ADD_INVENTORY_TOOL = 'add_inventory'

onMounted(() => {
  const modelContext = (document as any).modelContext
  if (modelContext?.registerTool) {
    modelContext.registerTool(
      {
        name: ADD_INVENTORY_TOOL,
        description: '【入库管理工具】帮助电商管理员将采购的商品新增入库存系统中',
        inputSchema: {
          type: 'object',
          properties: {
            productName: { type: 'string', description: '商品名称或型号，如：iPhone 15 Pro Max' },
            quantity: { type: 'number', description: '要入库的数量，必须大于0' },
            warehouse: { type: 'string', description: '入库存放的仓库名称，如：北京一号仓' }
          },
          required: ['productName', 'quantity', 'warehouse']
        },
        execute: async (params: any) => {
          if (!modalRef.value) {
            return { content: [{ type: 'text', text: '错误：入库弹窗未加载，当前页面可能已被销毁。' }] }
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
.inventory-view {
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

.table-container {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
  flex: 1;
}

.status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
}

.in-stock {
  background: #e8ffea;
  color: #00b42a;
}

.low-stock {
  background: #fff3e8;
  color: #ff7d00;
}

.out-of-stock {
  background: #ffece8;
  color: #f53f3f;
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

<template>
  <div class="products-page">
    <div class="page-header">
      <h3>商品管理</h3>
    </div>
    <div class="page-content">
      <tiny-grid
        auto-resize
        ref="gridRef"
        :data="products"
        :height="500"
        :edit-config="{ trigger: 'click', mode: 'cell', showStatus: true }"
      >
        <tiny-grid-column type="index" width="50" />
        <tiny-grid-column type="selection" width="50" />
        <tiny-grid-column field="name" title="商品名称" :editor="{ component: 'input' }" />
        <tiny-grid-column
          field="price"
          :editor="{
            component: 'input',
            attrs: { type: 'number' }
          }"
          title="价格"
        >
          <template #default="{ row }"> ¥{{ row.price }} </template>
        </tiny-grid-column>
        <tiny-grid-column
          field="stock"
          :editor="{
            component: 'input',
            attrs: { type: 'number' }
          }"
          title="库存"
        />
        <tiny-grid-column
          field="category"
          :editor="{
            component: 'select',
            options: [
              { label: '手机', value: 'phones' },
              { label: '笔记本', value: 'laptops' },
              { label: '平板', value: 'tablets' }
            ]
          }"
          title="分类"
        >
          <template #default="{ row }">
            {{ categoryLabels[row.category] }}
          </template>
        </tiny-grid-column>
        <tiny-grid-column
          field="status"
          :editor="{
            component: 'select',
            options: [
              { label: '上架', value: 'on' },
              { label: '下架', value: 'off' }
            ]
          }"
          title="状态"
        >
          <template #default="{ row }">
            <tiny-tag :type="row.status === 'on' ? 'success' : 'warning'">
              {{ row.status === 'on' ? '上架' : '下架' }}
            </tiny-tag>
          </template>
        </tiny-grid-column>
      </tiny-grid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import productsData from './products.json'

// 根据 products.json 结构定义类型，避免使用 any
type Product = {
  id: number
  name: string
  price: number
  stock: number
  category: 'phones' | 'laptops' | 'tablets' | string
  status: 'on' | 'off' | string
  description?: string
  image?: string
  createdAt?: string
  updatedAt?: string
}

const products = ref<Product[]>(productsData as Product[])

const categoryLabels: Record<string, string> = {
  phones: '手机',
  laptops: '笔记本',
  tablets: '平板'
}

const PRODUCT_GUIDE_TOOL = 'product-guide'

onMounted(() => {
  ;(navigator as any).modelContext.registerTool({
    name: PRODUCT_GUIDE_TOOL,
    title: '产品指南',
    description: '根据产品ID获取产品详细信息',
    inputSchema: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: '产品ID' }
      },
      required: ['productId']
    },
    execute: async ({ productId }: { productId: string }) => {
      const product = products.value.find((p) => String(p.id) === productId)
      const text = product ? `产品信息：${JSON.stringify(product, null, 2)}` : `未找到产品 ID 为 ${productId} 的商品`
      return { content: [{ type: 'text', text }] }
    }
  })
})

onUnmounted(() => {
  ;(navigator as any).modelContext.unregisterTool(PRODUCT_GUIDE_TOOL)
})
</script>

<style scoped lang="less">
.products-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    height: 32px;
  }
}

.button-box {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  justify-content: space-between;
}
.button-box-left {
  display: flex;
  gap: 8px;
}

.loading-state {
  padding: 20px;
}

.product-image {
  width: 40px;
  height: 40px;
  border-radius: 4px;
}
.page-content {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.03);
}
</style>

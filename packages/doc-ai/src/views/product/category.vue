<template>
  <div class="products-page">
    <div class="page-header">
      <h3>按分类管理</h3>
    </div>
    <div class="page-content">
      <div class="filter-tabs">
        <tiny-button
          v-for="item in categoryTabs"
          :key="item.value"
          :type="activeCategory === item.value ? 'primary' : 'default'"
          @click="activeCategory = item.value"
        >
          {{ item.label }}
        </tiny-button>
      </div>
      <tiny-grid
        auto-resize
        :data="filteredByCategory"
        :height="500"
        :edit-config="{ trigger: 'click', mode: 'cell', showStatus: true }"
        :tiny_mcp_config="{
          server: mcpServerForGrid,
          business: { id: 'product-category', description: '按分类商品列表' }
        }"
      >
        <tiny-grid-column type="index" width="50" />
        <tiny-grid-column field="name" title="商品名称" />
        <tiny-grid-column field="price" title="价格">
          <template #default="{ row }"> ¥{{ row.price }} </template>
        </tiny-grid-column>
        <tiny-grid-column field="stock" title="库存" />
        <tiny-grid-column field="category" title="分类">
          <template #default="{ row }">{{ categoryLabels[row.category] }}</template>
        </tiny-grid-column>
        <tiny-grid-column field="status" title="状态">
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
import { ref, inject, computed, onMounted } from 'vue'
import productsData from '../comprehensive/products.json'
import { WebMcpServer, z } from '@opentiny/next-sdk'
import type { Product, ProductCategory } from '../../../skills/product-management'

const webMcpServer = inject<InstanceType<typeof WebMcpServer>>('webMcpServer')
const productMcp = inject<ReturnType<typeof import('../../../composable/useProductMcp').useProductMcp>>('productMcp')

const fallbackProducts = ref<Product[]>(
  (productsData as Array<Record<string, unknown>>).map((p) => ({ ...p, id: String(p.id) })) as Product[]
)
const sourceData = computed(() => (productMcp ? productMcp.products.value : fallbackProducts.value))

const categoryTabs: { value: ProductCategory; label: string }[] = [
  { value: 'phones', label: '手机' },
  { value: 'laptops', label: '笔记本' },
  { value: 'tablets', label: '平板' }
]
const activeCategory = ref<ProductCategory>('phones')

const filteredByCategory = computed(() =>
  sourceData.value.filter((p) => p.category === activeCategory.value)
)

const mcpServerForGrid = computed(() => webMcpServer ?? fallbackServer)
const mcpServer = inject('mcpServer') as { transport: any; capabilities: any } | undefined
const fallbackServer = new WebMcpServer(
  { name: 'base-config', version: '1.0.0' },
  mcpServer ? { capabilities: mcpServer.capabilities } : undefined
)
if (mcpServer) {
  fallbackServer.registerTool(
    'get-weather',
    { description: '获取天气', inputSchema: { city: z.string() } },
    async ({ city }: { city: string }) => ({ content: [{ type: 'text', text: `天气：${city}晴天` }] })
  )
}

const categoryLabels: Record<string, string> = {
  phones: '手机',
  laptops: '笔记本',
  tablets: '平板'
}

onMounted(async () => {
  if (mcpServer && !webMcpServer) await fallbackServer.connect(mcpServer.transport)
})
</script>

<style scoped lang="less">
.products-page .page-header {
  margin-bottom: 15px;
  height: 32px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.page-content {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.03);
}
</style>

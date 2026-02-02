<template>
  <div class="products-page">
    <div class="page-header">
      <h3>商品列表</h3>
      <span v-if="productMcp" class="skill-badge">Web-Skill + Web-MCP 已启用</span>
    </div>
    <div class="page-content">
      <tiny-grid
        auto-resize
        ref="gridRef"
        :data="gridData"
        :height="500"
        :edit-config="{ trigger: 'click', mode: 'cell', showStatus: true }"
        :tiny_mcp_config="{
          server: mcpServerForGrid,
          business: {
            id: 'product-list',
            description: '商品列表'
          }
        }"
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
import { ref, inject, computed, onMounted } from 'vue'
import productsData from '../comprehensive/products.json'
import { WebMcpServer, z } from '@opentiny/next-sdk'
import type { Product } from '../../../skills/product-management'

const webMcpServer = inject<InstanceType<typeof WebMcpServer>>('webMcpServer')
const productMcp = inject<ReturnType<typeof import('../../../composable/useProductMcp').useProductMcp>>('productMcp')

const fallbackProducts = ref<Product[]>(
  (productsData as Array<Record<string, unknown>>).map((p) => ({ ...p, id: String(p.id) })) as Product[]
)
const gridData = computed(() => (productMcp ? productMcp.products.value : fallbackProducts.value))

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
    async ({ city }: { city: string }) => ({
      content: [{ type: 'text', text: `天气信息：${city}晴天` }]
    })
  )
}

const categoryLabels: Record<string, string> = {
  phones: '手机',
  laptops: '笔记本',
  tablets: '平板'
}

onMounted(async () => {
  if (mcpServer && !webMcpServer) {
    await fallbackServer.connect(mcpServer.transport)
  }
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

.page-content {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.03);
}
</style>

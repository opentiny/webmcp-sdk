<template>
  <div class="products-page">
    <div class="page-header">
      <h3>商品管理</h3>
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
import productsData from './products.json'
import { WebMcpServer, z } from '@opentiny/next-sdk'
import type { Product } from '../../skills/product-management'

// 优先使用 App 提供的 Web-Skill + Web-MCP 实例（含商品管理 Skill、read_memory_doc/read_cdn_doc 等）
const webMcpServer = inject<InstanceType<typeof WebMcpServer>>('webMcpServer')
const productMcp = inject<ReturnType<typeof import('../../composable/useProductMcp').useProductMcp>>('productMcp')

// 表格数据源：有 productMcp 时用其 products（与 MCP 工具同源，工具修改后表格自动更新）
const fallbackProducts = ref<Product[]>(
  (productsData as Array<Record<string, unknown>>).map((p) => ({ ...p, id: String(p.id) })) as Product[]
)
const gridData = computed(() => (productMcp ? productMcp.products.value : fallbackProducts.value))

// 表格使用的 MCP Server：优先使用已注册 Skill+工具的 server
const mcpServerForGrid = computed(() => webMcpServer ?? fallbackServer)

// 无 App 注入时使用的备用 server（仅保留原有 get-weather 示例）
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

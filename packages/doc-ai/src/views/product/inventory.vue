<template>
  <div class="inventory-page">
    <div class="page-header">
      <h3>库存分析</h3>
    </div>
    <div class="page-content">
      <!-- 总体统计卡片 -->
      <div class="summary-cards">
        <div class="card">
          <div class="card-label">商品总数</div>
          <div class="card-value">{{ report.summary.totalProducts }} 个</div>
        </div>
        <div class="card">
          <div class="card-label">库存总价值</div>
          <div class="card-value">¥{{ report.summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</div>
        </div>
        <div class="card">
          <div class="card-label">总库存数量</div>
          <div class="card-value">{{ report.summary.totalStock }} 件</div>
        </div>
        <div class="card">
          <div class="card-label">平均价格</div>
          <div class="card-value">¥{{ report.summary.avgPrice.toFixed(2) }}</div>
        </div>
      </div>

      <!-- 状态分布 -->
      <div class="section">
        <h4>商品状态</h4>
        <p>上架 {{ report.byStatus.on }} 个，下架 {{ report.byStatus.off }} 个</p>
      </div>

      <!-- 分类统计 -->
      <div class="section">
        <h4>分类统计</h4>
        <tiny-grid :data="categoryTableData" :height="120">
          <tiny-grid-column field="categoryLabel" title="分类" />
          <tiny-grid-column field="count" title="数量" />
          <tiny-grid-column field="totalValue" title="库存价值" />
          <tiny-grid-column field="avgPrice" title="均价" />
        </tiny-grid>
      </div>

      <!-- 低库存预警 -->
      <div class="section">
        <h4>低库存商品（库存 &lt; 10）</h4>
        <tiny-grid v-if="report.lowStock.length" :data="report.lowStock" :height="200">
          <tiny-grid-column field="name" title="商品名称" />
          <tiny-grid-column field="stock" title="库存" />
          <tiny-grid-column field="price" title="价格" />
          <tiny-grid-column field="category" title="分类">
            <template #default="{ row }">{{ categoryLabelsMap[row.category] }}</template>
          </tiny-grid-column>
        </tiny-grid>
        <p v-else class="empty-tip">暂无低库存商品</p>
      </div>

      <!-- 操作建议 -->
      <div class="section">
        <h4>操作建议</h4>
        <ul class="recommendations">
          <li v-for="(r, i) in report.recommendations" :key="i">{{ r }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue'
import productsData from '../comprehensive/products.json'
import type { Product, InventoryReport } from '../../../skills/product-management'
import { categoryLabels as categoryLabelsMap } from '../../../skills/product-management'

const productMcp = inject<ReturnType<typeof import('../../../composable/useProductMcp').useProductMcp>>('productMcp')
const fallbackProducts = (productsData as Array<Record<string, unknown>>).map((p) => ({
  ...p,
  id: String(p.id)
})) as Product[]
const sourceData = computed(() => (productMcp ? productMcp.products.value : fallbackProducts as Product[]))

const report = computed<InventoryReport>(() => {
  const products = sourceData.value
  if (products.length === 0) {
    return {
      timestamp: new Date().toISOString(),
      summary: { totalProducts: 0, totalValue: 0, totalStock: 0, avgPrice: 0, avgStock: 0 },
      lowStock: [],
      highValue: [],
      byCategory: {},
      byStatus: { on: 0, off: 0 },
      recommendations: ['暂无商品数据']
    }
  }
  const totalProducts = products.length
  const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0)
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0)
  const avgPrice = products.reduce((sum, p) => sum + p.price, 0) / totalProducts
  const avgStock = totalStock / totalProducts
  const lowStock = products.filter((p) => p.stock < 10).sort((a, b) => a.stock - b.stock)
  const highValue = products
    .map((p) => ({ ...p, totalValue: p.price * p.stock }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 10)
  const byCategory: InventoryReport['byCategory'] = {}
  products.forEach((p) => {
    if (!byCategory[p.category]) {
      byCategory[p.category] = { count: 0, totalValue: 0, avgPrice: 0 }
    }
    byCategory[p.category].count++
    byCategory[p.category].totalValue += p.price * p.stock
  })
  Object.keys(byCategory).forEach((cat) => {
    const list = products.filter((p) => p.category === cat)
    byCategory[cat].avgPrice = list.reduce((s, p) => s + p.price, 0) / list.length
  })
  const byStatus = {
    on: products.filter((p) => p.status === 'on').length,
    off: products.filter((p) => p.status === 'off').length
  }
  const recommendations: string[] = []
  if (lowStock.length > 0) {
    recommendations.push(`有 ${lowStock.length} 个商品库存不足（< 10），建议及时补货`)
  }
  if (byStatus.off > totalProducts * 0.3) {
    recommendations.push(`有 ${byStatus.off} 个商品处于下架状态，占比较高`)
  }
  const zeroStock = products.filter((p) => p.stock === 0)
  if (zeroStock.length > 0) {
    recommendations.push(`有 ${zeroStock.length} 个商品库存为0，建议下架或标记预售`)
  }
  if (recommendations.length === 0) {
    recommendations.push('库存状态良好，无紧急问题')
  }
  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalProducts,
      totalValue: Math.round(totalValue * 100) / 100,
      totalStock,
      avgPrice: Math.round(avgPrice * 100) / 100,
      avgStock: Math.round(avgStock * 100) / 100
    },
    lowStock,
    highValue,
    byCategory,
    byStatus,
    recommendations
  }
})

const categoryTableData = computed(() =>
  Object.entries(report.value.byCategory).map(([cat, stat]) => ({
    categoryLabel: categoryLabelsMap[cat as keyof typeof categoryLabelsMap] ?? cat,
    count: stat.count,
    totalValue: `¥${stat.totalValue.toFixed(2)}`,
    avgPrice: `¥${stat.avgPrice.toFixed(2)}`
  }))
)
</script>

<style scoped lang="less">
.inventory-page .page-header {
  margin-bottom: 15px;
  height: 32px;
}

.page-content {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.03);
}

.summary-cards {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.card {
  min-width: 140px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--ti-base-color-border, #e8e8e8);
  background: #fafafa;
}

.card-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.card-value {
  font-size: 18px;
  font-weight: 600;
}

.section {
  margin-bottom: 20px;
}

.section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
}

.recommendations {
  margin: 0;
  padding-left: 20px;
}

.empty-tip {
  color: #999;
  margin: 0;
}
</style>

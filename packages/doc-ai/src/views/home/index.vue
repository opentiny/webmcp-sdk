<template>
  <div class="home-page">
    <!-- 顶部标题区 -->
    <div class="page-header">
      <div class="header-title">
        <h2>商品管理系统</h2>
        <p>统一管理您的商品信息，支持 AI 助手智能操作</p>
      </div>
      <div class="header-actions">
        <router-link to="/comprehensive" class="btn-primary">商品管理</router-link>
        <router-link to="/price-protection" class="btn-secondary">价保管理</router-link>
      </div>
    </div>

    <!-- 数据统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon total">📦</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">商品总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon on">✅</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.on }}</div>
          <div class="stat-label">上架中</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon off">⏸</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.off }}</div>
          <div class="stat-label">已下架</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon category">🗂</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.categories }}</div>
          <div class="stat-label">商品分类</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon price-pending">🛡</div>
        <div class="stat-info">
          <div class="stat-value">{{ priceStats.pending }}</div>
          <div class="stat-label">价保待审核</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon price-total">💰</div>
        <div class="stat-info">
          <div class="stat-value">¥{{ priceStats.totalDiff }}</div>
          <div class="stat-label">待退差价总额</div>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 分类概览 -->
      <div class="panel">
        <div class="panel-header">分类概览</div>
        <div class="category-list">
          <div v-for="cat in categoryStats" :key="cat.value" class="category-item">
            <span class="category-name">{{ cat.label }}</span>
            <div class="category-bar-wrap">
              <div
                class="category-bar"
                :style="{ width: (stats.total > 0 ? (cat.count / stats.total) * 100 : 0) + '%' }"
              ></div>
            </div>
            <span class="category-count">{{ cat.count }} 件</span>
          </div>
        </div>
      </div>

      <!-- 近期商品 -->
      <div class="panel">
        <div class="panel-header">
          近期商品
          <router-link to="/comprehensive" class="panel-link">查看全部 →</router-link>
        </div>
        <div class="product-list">
          <div v-for="product in recentProducts" :key="product.id" class="product-item">
            <div class="product-info">
              <div class="product-name">{{ product.name }}</div>
              <div class="product-meta">{{ categoryLabels[product.category] }} · ¥{{ product.price }}</div>
            </div>
            <span class="status-badge" :class="product.status">
              {{ product.status === 'on' ? '上架' : '下架' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 价保申请概览 -->
      <div class="panel">
        <div class="panel-header">
          价保申请
          <router-link to="/price-protection" class="panel-link">查看全部 →</router-link>
        </div>
        <div class="product-list">
          <div v-for="record in pendingPriceRecords" :key="record.id" class="product-item">
            <div class="product-info">
              <div class="product-name">{{ record.productName }}</div>
              <div class="product-meta">{{ record.orderId }} · 可退 ¥{{ record.diffPrice }}</div>
            </div>
            <span class="status-badge pending">待审核</span>
          </div>
          <div v-if="pendingPriceRecords.length === 0" class="empty-tip">暂无待审核申请</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import productsData from '../comprehensive/products.json'
import priceData from '../price-protection/price-protection.json'

// 分类标签映射
const categoryLabels: Record<string, string> = {
  phones: '手机',
  laptops: '笔记本',
  tablets: '平板'
}

// 商品统计数据
const stats = computed(() => ({
  total: productsData.length,
  on: productsData.filter((p) => p.status === 'on').length,
  off: productsData.filter((p) => p.status === 'off').length,
  categories: new Set(productsData.map((p) => p.category)).size
}))

// 各分类商品数量
const categoryStats = computed(() => {
  const map: Record<string, number> = {}
  productsData.forEach((p) => {
    map[p.category] = (map[p.category] || 0) + 1
  })
  return Object.entries(map).map(([value, count]) => ({
    value,
    label: categoryLabels[value] ?? value,
    count
  }))
})

// 展示最近 5 条商品（按 id 倒序）
const recentProducts = computed(() =>
  [...productsData].sort((a, b) => b.id - a.id).slice(0, 5)
)

// 价保统计数据
const priceStats = computed(() => ({
  pending: priceData.filter((r) => r.status === 'pending').length,
  totalDiff: priceData.filter((r) => r.status === 'pending').reduce((sum, r) => sum + r.diffPrice, 0)
}))

// 待审核的价保申请（最多显示 4 条）
const pendingPriceRecords = computed(() =>
  priceData.filter((r) => r.status === 'pending').slice(0, 4)
)
</script>

<style scoped lang="less">
.home-page {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
  box-sizing: border-box;
}

/* 顶部标题区 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #1677ff 0%, #0958d9 100%);
  border-radius: 12px;
  padding: 28px 32px;
  margin-bottom: 24px;
  color: #fff;

  .header-title {
    h2 {
      margin: 0 0 6px;
      font-size: 22px;
      font-weight: 600;
    }
    p {
      margin: 0;
      font-size: 14px;
      opacity: 0.85;
    }
  }
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-primary {
  display: inline-block;
  padding: 9px 22px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  color: #fff;
  text-decoration: none;
  font-size: 14px;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.32);
  }
}

.btn-secondary {
  display: inline-block;
  padding: 9px 22px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  font-size: 14px;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.18);
  }
}

/* 统计卡片：前4列固定4列，第5、6列自动换行 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.stat-icon {
  font-size: 28px;
  width: 52px;
  height: 52px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;

  &.total         { background: #e6f4ff; }
  &.on            { background: #f6ffed; }
  &.off           { background: #fff7e6; }
  &.category      { background: #f9f0ff; }
  &.price-pending { background: #fff7e6; }
  &.price-total   { background: #fff1f0; }
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: #8c8c8c;
  margin-top: 4px;
}

/* 主内容区：自动换行的双列布局 */
.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.empty-tip {
  padding: 20px;
  text-align: center;
  color: #bfbfbf;
  font-size: 13px;
}

.panel {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  border-bottom: 1px solid #f0f0f0;
}

.panel-link {
  font-size: 13px;
  font-weight: 400;
  color: #1677ff;
  text-decoration: none;

  &:hover { opacity: 0.8; }
}

/* 分类概览 */
.category-list {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.category-name {
  width: 48px;
  font-size: 13px;
  color: #595959;
  flex-shrink: 0;
}

.category-bar-wrap {
  flex: 1;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.category-bar {
  height: 100%;
  background: linear-gradient(90deg, #1677ff, #69b1ff);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.category-count {
  width: 48px;
  text-align: right;
  font-size: 13px;
  color: #595959;
  flex-shrink: 0;
}

/* 近期商品 */
.product-list {
  padding: 8px 0;
}

.product-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  transition: background 0.15s;

  &:hover {
    background: #fafafa;
  }
}

.product-name {
  font-size: 14px;
  color: #1a1a1a;
  font-weight: 500;
}

.product-meta {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 2px;
}

.status-badge {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
  flex-shrink: 0;

  &.on {
    background: #f6ffed;
    color: #52c41a;
    border: 1px solid #b7eb8f;
  }
  &.off {
    background: #fff7e6;
    color: #fa8c16;
    border: 1px solid #ffd591;
  }
  &.pending {
    background: #fff7e6;
    color: #fa8c16;
    border: 1px solid #ffd591;
  }
}
</style>

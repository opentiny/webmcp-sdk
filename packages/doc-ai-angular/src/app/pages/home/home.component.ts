import { Component, computed, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { NgFor, NgIf, NgClass } from '@angular/common'
import productsData from './products.json'
import priceData from './price-protection.json'

// 商品类型定义
type Product = {
  id: number
  name: string
  price: number
  stock: number
  category: string
  status: 'on' | 'off' | string
}

// 价保申请类型定义
type PriceRecord = {
  id: number
  orderId: string
  productName: string
  diffPrice: number
  status: string
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, NgFor, NgIf, NgClass],
  template: `
    <div class="home-page">
      <div class="page-header">
        <div class="header-title">
          <h2>商品管理系统</h2>
          <p>统一管理您的商品信息，支持 AI 助手智能操作</p>
        </div>
        <div class="header-actions">
          <a routerLink="/comprehensive" class="btn-primary">商品管理</a>
          <a routerLink="/price-protection" class="btn-secondary">价保管理</a>
        </div>
      </div>
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
      <div class="main-content">
        <div class="panel">
          <div class="panel-header">分类概览</div>
          <div class="category-list">
            <div *ngFor="let cat of categoryStats" class="category-item">
              <span class="category-name">{{ cat.label }}</span>
              <div class="category-bar-wrap">
                <div class="category-bar" [style.width]="getCategoryBarWidth(cat.count)"></div>
              </div>
              <span class="category-count">{{ cat.count }} 件</span>
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-header">
            近期商品
            <a routerLink="/comprehensive" class="panel-link">查看全部 →</a>
          </div>
          <div class="product-list">
            <div *ngFor="let product of recentProducts" class="product-item">
              <div class="product-info">
                <div class="product-name">{{ product.name }}</div>
                <div class="product-meta">
                  {{ categoryLabels[product.category] ?? product.category }} · ¥{{ product.price }}
                </div>
              </div>
              <span class="status-badge" [ngClass]="product.status">
                {{ product.status === 'on' ? '上架' : '下架' }}
              </span>
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-header">
            价保申请
            <a routerLink="/price-protection" class="panel-link">查看全部 →</a>
          </div>
          <div class="product-list">
            <div *ngFor="let record of pendingPriceRecords" class="product-item">
              <div class="product-info">
                <div class="product-name">{{ record.productName }}</div>
                <div class="product-meta">{{ record.orderId }} · 可退 ¥{{ record.diffPrice }}</div>
              </div>
              <span class="status-badge pending">待审核</span>
            </div>
            <div *ngIf="pendingPriceRecords.length === 0" class="empty-tip">暂无待审核申请</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .home-page { padding: 24px; background: #f5f7fa; min-height: 100vh; box-sizing: border-box; }
      .page-header { display: flex; align-items: center; justify-content: space-between; background: linear-gradient(135deg, #1677ff 0%, #0958d9 100%); border-radius: 12px; padding: 28px 32px; margin-bottom: 24px; color: #fff; }
      .page-header .header-title h2 { margin: 0 0 6px; font-size: 22px; font-weight: 600; }
      .page-header .header-title p { margin: 0; font-size: 14px; opacity: 0.85; }
      .header-actions { display: flex; gap: 10px; }
      .btn-primary { display: inline-block; padding: 9px 22px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.5); border-radius: 6px; color: #fff; text-decoration: none; font-size: 14px; }
      .btn-primary:hover { background: rgba(255,255,255,0.32); }
      .btn-secondary { display: inline-block; padding: 9px 22px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.3); border-radius: 6px; color: rgba(255,255,255,0.85); text-decoration: none; font-size: 14px; }
      .btn-secondary:hover { background: rgba(255,255,255,0.18); }
      .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
      .stat-card { background: #fff; border-radius: 10px; padding: 20px 24px; display: flex; align-items: center; gap: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
      .stat-icon { font-size: 28px; width: 52px; height: 52px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
      .stat-icon.total { background: #e6f4ff; }
      .stat-icon.on { background: #f6ffed; }
      .stat-icon.off { background: #fff7e6; }
      .stat-icon.category { background: #f9f0ff; }
      .stat-icon.price-pending { background: #fff7e6; }
      .stat-icon.price-total { background: #fff1f0; }
      .stat-value { font-size: 28px; font-weight: 700; color: #1a1a1a; line-height: 1; }
      .stat-label { font-size: 13px; color: #8c8c8c; margin-top: 4px; }
      .main-content { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .empty-tip { padding: 20px; text-align: center; color: #bfbfbf; font-size: 13px; }
      .panel { background: #fff; border-radius: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); overflow: hidden; }
      .panel-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; font-size: 15px; font-weight: 600; color: #1a1a1a; border-bottom: 1px solid #f0f0f0; }
      .panel-link { font-size: 13px; font-weight: 400; color: #1677ff; text-decoration: none; }
      .panel-link:hover { opacity: 0.8; }
      .category-list { padding: 16px 20px; display: flex; flex-direction: column; gap: 16px; }
      .category-item { display: flex; align-items: center; gap: 12px; }
      .category-name { width: 48px; font-size: 13px; color: #595959; flex-shrink: 0; }
      .category-bar-wrap { flex: 1; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
      .category-bar { height: 100%; background: linear-gradient(90deg, #1677ff, #69b1ff); border-radius: 4px; transition: width 0.5s ease; }
      .category-count { width: 48px; text-align: right; font-size: 13px; color: #595959; flex-shrink: 0; }
      .product-list { padding: 8px 0; }
      .product-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; }
      .product-item:hover { background: #fafafa; }
      .product-name { font-size: 14px; color: #1a1a1a; font-weight: 500; }
      .product-meta { font-size: 12px; color: #8c8c8c; margin-top: 2px; }
      .status-badge { font-size: 12px; padding: 2px 10px; border-radius: 10px; flex-shrink: 0; }
      .status-badge.on { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
      .status-badge.off, .status-badge.pending { background: #fff7e6; color: #fa8c16; border: 1px solid #ffd591; }
    `
  ]
})
export class HomeComponent {
  // 分类标签映射
  categoryLabels: Record<string, string> = {
    phones: '手机',
    laptops: '笔记本',
    tablets: '平板'
  }

  // 商品统计数据
  stats = {
    total: productsData.length,
    on: productsData.filter((p) => p.status === 'on').length,
    off: productsData.filter((p) => p.status === 'off').length,
    categories: new Set(productsData.map((p) => p.category)).size
  }

  // 各分类商品数量
  categoryStats = (() => {
    const map: Record<string, number> = {}
    productsData.forEach((p) => {
      map[p.category] = (map[p.category] || 0) + 1
    })
    return Object.entries(map).map(([value, count]) => ({
      value,
      label: this.categoryLabels[value] ?? value,
      count
    }))
  })()

  // 最近 5 条商品（按 id 倒序）
  recentProducts = [...(productsData as Product[])].sort((a, b) => b.id - a.id).slice(0, 5)

  // 价保统计
  priceStats = {
    pending: priceData.filter((r) => r.status === 'pending').length,
    totalDiff: priceData.filter((r) => r.status === 'pending').reduce((sum, r) => sum + r.diffPrice, 0)
  }

  // 待审核的价保申请（最多显示 4 条）
  pendingPriceRecords = (priceData as PriceRecord[]).filter((r) => r.status === 'pending').slice(0, 4)

  // 计算分类进度条宽度（百分比字符串）
  getCategoryBarWidth(count: number): string {
    return this.stats.total > 0 ? `${(count / this.stats.total) * 100}%` : '0%'
  }
}

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
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
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

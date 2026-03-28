import { Component, OnInit, OnDestroy } from '@angular/core'
import { NgFor, NgIf } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { z } from '@opentiny/next-sdk'
import { server } from '../../../mcp-servers'
import productsData from './products.json'

// 商品类型定义
type Product = {
  id: number
  name: string
  price: number
  stock: number
  category: 'phones' | 'laptops' | 'tablets' | string
  status: 'on' | 'off' | string
  description?: string
  image?: string
}

import { ChatRemoterComponent } from '../../components/chat-remoter/chat-remoter.component'

@Component({
  selector: 'app-comprehensive',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, ChatRemoterComponent],
  templateUrl: './comprehensive.component.html',
  styleUrl: './comprehensive.component.scss'
})
export class ComprehensiveComponent implements OnInit, OnDestroy {
  products: Product[] = productsData as Product[]

  categoryLabels: Record<string, string> = {
    phones: '手机',
    laptops: '笔记本',
    tablets: '平板'
  }

  // 行内编辑状态：记录正在编辑的商品 id 和字段
  editingCell: { id: number; field: string } | null = null
  editingValue = ''

  // 用于存储 registerPageTool 返回的 cleanup 函数
  private cleanupPageTool!: () => void

  ngOnInit(): void {
    /**
     * 注册 MCP 工具：声明与执行逻辑合一
     */
    server.registerTool(
      'product-guide',
      {
        title: '产品指南',
        description: '根据产品ID获取产品详细信息',
        inputSchema: {
          productId: z.string().describe('产品ID')
        }
      },
      async ({ productId }: { productId: string }) => {
        const product = this.products.find((p) => String(p.id) === productId)
        const text = product
          ? `产品信息：${JSON.stringify(product, null, 2)}`
          : `未找到产品 ID 为 ${productId} 的商品`
        return { content: [{ type: 'text', text }] }
      }
    )
  }

  ngOnDestroy(): void {
    // 组件销毁时取消注册
    server.unregisterTool('product-guide')
  }

  // 开始行内编辑
  startEdit(id: number, field: string, value: string | number): void {
    this.editingCell = { id, field }
    this.editingValue = String(value)
  }

  // 保存行内编辑
  saveEdit(product: Product): void {
    if (!this.editingCell) return
    const { field } = this.editingCell
    if (field === 'price' || field === 'stock') {
      ;(product as Record<string, unknown>)[field] = Number(this.editingValue)
    } else {
      ;(product as Record<string, unknown>)[field] = this.editingValue
    }
    this.editingCell = null
  }

  // 取消行内编辑
  cancelEdit(): void {
    this.editingCell = null
  }

  // 判断某格是否在编辑中
  isEditing(id: number, field: string): boolean {
    return this.editingCell?.id === id && this.editingCell?.field === field
  }

  // 切换商品上架/下架状态
  toggleStatus(product: Product): void {
    product.status = product.status === 'on' ? 'off' : 'on'
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core'
import { NgFor, NgIf } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { registerPageTool } from '@opentiny/next-sdk'
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

@Component({
  selector: 'app-comprehensive',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
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

  modelContext = (document as any).modelContext
  abortController = new AbortController()

  ngOnInit(): void {
    this.modelContext.registerTool(
      {
        name: 'product-guide',
        description: '根据id查询商品详情。',
        inputSchema: {
          type: 'object',
          properties: {
            productId: { type: 'string', description: '商品 ID' }
          },
          required: ['id']
        },
        execute: async ({ productId }: { productId: string }) => {
          const product = this.products.find((p) => String(p.id) === productId)
          const text = product
            ? `产品信息：${JSON.stringify(product, null, 2)}`
            : `未找到产品 ID 为 ${productId} 的商品`
          return { content: [{ type: 'text', text }] }
        }
      },
      { signal: this.abortController.signal }
    )
  }

  ngOnDestroy(): void {
    // 组件销毁时取消注册
    this.abortController.abort()
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

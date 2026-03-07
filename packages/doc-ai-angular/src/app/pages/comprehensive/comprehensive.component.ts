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
  template: `
    <div class="products-page">
      <div class="page-header"><h3>商品管理</h3></div>
      <div class="page-content">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 50px">#</th>
              <th>商品名称</th>
              <th>价格</th>
              <th>库存</th>
              <th>分类</th>
              <th>状态</th>
              <th style="width: 120px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let product of products; let i = index">
              <td>{{ i + 1 }}</td>
              <td>
                <ng-container *ngIf="isEditing(product.id, 'name'); else nameView">
                  <input class="cell-input" [(ngModel)]="editingValue" (blur)="saveEdit(product)" (keyup.enter)="saveEdit(product)" (keyup.escape)="cancelEdit()" autofocus />
                </ng-container>
                <ng-template #nameView>
                  <span class="editable-cell" (click)="startEdit(product.id, 'name', product.name)">{{ product.name }}</span>
                </ng-template>
              </td>
              <td>
                <ng-container *ngIf="isEditing(product.id, 'price'); else priceView">
                  <input class="cell-input" type="number" [(ngModel)]="editingValue" (blur)="saveEdit(product)" (keyup.enter)="saveEdit(product)" (keyup.escape)="cancelEdit()" />
                </ng-container>
                <ng-template #priceView>
                  <span class="editable-cell" (click)="startEdit(product.id, 'price', product.price)">¥{{ product.price }}</span>
                </ng-template>
              </td>
              <td>
                <ng-container *ngIf="isEditing(product.id, 'stock'); else stockView">
                  <input class="cell-input" type="number" [(ngModel)]="editingValue" (blur)="saveEdit(product)" (keyup.enter)="saveEdit(product)" (keyup.escape)="cancelEdit()" />
                </ng-container>
                <ng-template #stockView>
                  <span class="editable-cell" (click)="startEdit(product.id, 'stock', product.stock)">{{ product.stock }}</span>
                </ng-template>
              </td>
              <td>{{ categoryLabels[product.category] ?? product.category }}</td>
              <td>
                <span class="tag" [class.tag-success]="product.status === 'on'" [class.tag-warning]="product.status !== 'on'">
                  {{ product.status === 'on' ? '上架' : '下架' }}
                </span>
              </td>
              <td>
                <button class="action-btn" [class.btn-danger]="product.status === 'on'" [class.btn-success]="product.status !== 'on'" (click)="toggleStatus(product)">
                  {{ product.status === 'on' ? '下架' : '上架' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [
    `
      .products-page { padding: 24px; background: #f5f7fa; min-height: 100vh; box-sizing: border-box; }
      .products-page .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
      .products-page .page-header h3 { margin: 0; font-size: 18px; font-weight: 600; color: #1a1a1a; }
      .page-content { padding: 20px; background: #fff; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.03); overflow: auto; }
      .data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
      .data-table th, .data-table td { padding: 12px 14px; text-align: left; border-bottom: 1px solid #f0f0f0; }
      .data-table th { background: #fafafa; color: #595959; font-weight: 500; font-size: 13px; }
      .data-table tr:hover td { background: #fafafa; }
      .editable-cell { cursor: pointer; padding: 2px 4px; border-radius: 3px; }
      .editable-cell:hover { background: #e6f4ff; color: #1677ff; }
      .cell-input { width: 100%; padding: 4px 8px; border: 1px solid #1677ff; border-radius: 4px; font-size: 14px; outline: none; box-sizing: border-box; }
      .tag { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: 500; }
      .tag.tag-success { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
      .tag.tag-warning { background: #fff7e6; color: #fa8c16; border: 1px solid #ffd591; }
      .action-btn { padding: 4px 12px; font-size: 12px; border: none; border-radius: 4px; cursor: pointer; }
      .action-btn:hover { opacity: 0.8; }
      .action-btn.btn-danger { background: #fff1f0; color: #ff4d4f; border: 1px solid #ffccc7; }
      .action-btn.btn-success { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
    `
  ]
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
     * 注册 MCP 工具处理器（框架无关的纯 JS 函数）
     * 对应 Vue 版本 onMounted 中的 registerPageTool 调用
     * route 省略时默认读 window.location.pathname（即 /comprehensive）
     */
    this.cleanupPageTool = registerPageTool({
      handlers: {
        // 处理 product-guide 工具的实际业务逻辑
        'product-guide': async ({ productId }: { productId: string }) => {
          const product = this.products.find((p) => String(p.id) === productId)
          const text = product
            ? `产品信息：${JSON.stringify(product, null, 2)}`
            : `未找到产品 ID 为 ${productId} 的商品`
          return { content: [{ type: 'text', text }] }
        }
      }
    })
  }

  ngOnDestroy(): void {
    // 组件销毁时取消注册，对应 Vue 版本 onUnmounted 中的 cleanupPageTool()
    this.cleanupPageTool?.()
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
      (product as Record<string, unknown>)[field] = Number(this.editingValue)
    } else {
      (product as Record<string, unknown>)[field] = this.editingValue
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

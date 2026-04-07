import { Component, EventEmitter, Output } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { addInventory } from '../../mock'

// 保存 MCP Tool 的 resolve 回调
let currentResolve: ((result: string) => void) | null = null

@Component({
  selector: 'app-inventory-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="visible" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>新增入库单</h3>
          <button class="close-btn" (click)="closeModal()">×</button>
        </div>
        <div class="modal-body">
          <form (ngSubmit)="onSubmit()" #form="ngForm">
            <div class="form-group">
              <label for="productName">商品名称 *</label>
              <input
                id="productName"
                type="text"
                [(ngModel)]="formData.productName"
                name="productName"
                required
                placeholder="请输入商品名称"
              />
            </div>
            <div class="form-group">
              <label for="quantity">入库数量 *</label>
              <input
                id="quantity"
                type="number"
                [(ngModel)]="formData.quantity"
                name="quantity"
                required
                min="1"
                placeholder="请输入入库数量"
              />
            </div>
            <div class="form-group">
              <label for="warehouse">仓库位置 *</label>
              <input
                id="warehouse"
                type="text"
                [(ngModel)]="formData.warehouse"
                name="warehouse"
                required
                placeholder="请输入仓库位置"
              />
            </div>
            <div class="form-actions">
              <button type="button" class="btn-cancel" (click)="closeModal()">取消</button>
              <button type="submit" class="btn-submit" [disabled]="!form.valid">确认入库</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal-content {
        background: white;
        border-radius: 8px;
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #e5e5e5;
      }

      .modal-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .close-btn:hover {
        color: #333;
      }

      .modal-body {
        padding: 20px;
      }

      .form-group {
        margin-bottom: 16px;
      }

      .form-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: #333;
      }

      .form-group input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      }

      .form-group input:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 24px;
      }

      .btn-cancel,
      .btn-submit {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
      }

      .btn-cancel {
        background: #f5f5f5;
        color: #666;
      }

      .btn-cancel:hover {
        background: #e5e5e5;
      }

      .btn-submit {
        background: #007bff;
        color: white;
      }

      .btn-submit:hover:not(:disabled) {
        background: #0056b3;
      }

      .btn-submit:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
    `
  ]
})
export class InventoryModalComponent {
  visible = false
  formData = {
    productName: '',
    quantity: 0,
    warehouse: ''
  }

  @Output() inventoryAdded = new EventEmitter<void>()

  // 保存 MCP Tool 的 resolve 回调

  openModal() {
    this.visible = true
    this.formData = {
      productName: '',
      quantity: 0,
      warehouse: ''
    }
  }

  openAiModal(initialData?: Partial<typeof this.formData>) {
    if (currentResolve) {
      currentResolve('❌ 用户发起了新的操作，前置入库已取消。')
    }
    this.visible = true
    this.formData = {
      productName: initialData?.productName || '',
      quantity: initialData?.quantity || 0,
      warehouse: initialData?.warehouse || ''
    }

    // 返回一个 Promise 供 MCP Tool 挂起等待
    return new Promise<string>((resolve) => {
      currentResolve = resolve
    })
  }

  closeModal() {
    this.visible = false
  }

  onSubmit() {
    if (this.formData.productName && this.formData.quantity > 0 && this.formData.warehouse) {
      addInventory({
        productName: this.formData.productName,
        quantity: this.formData.quantity,
        warehouse: this.formData.warehouse,
        sku: `SKU-${Date.now()}` // 生成一个临时的SKU
      })
      this.inventoryAdded.emit()
      this.closeModal()
    }
  }
}

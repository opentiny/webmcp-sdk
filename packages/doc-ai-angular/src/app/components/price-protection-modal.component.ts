import { Component, EventEmitter, Output } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { addPriceProtectionOrder } from '../../mock'

@Component({
  selector: 'app-price-protection-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="visible" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>新增价保申请</h3>
          <button class="close-btn" (click)="closeModal()">×</button>
        </div>
        <div class="modal-body">
          <form (ngSubmit)="onSubmit()" #form="ngForm">
            <div class="form-group">
              <label for="customerName">客户姓名 *</label>
              <input
                id="customerName"
                type="text"
                [(ngModel)]="formData.customerName"
                name="customerName"
                required
                placeholder="请输入客户姓名"
              />
            </div>
            <div class="form-group">
              <label for="orderId">订单号 *</label>
              <input
                id="orderId"
                type="text"
                [(ngModel)]="formData.orderId"
                name="orderId"
                required
                placeholder="请输入订单号"
              />
            </div>
            <div class="form-group">
              <label for="amount">补偿金额 *</label>
              <input
                id="amount"
                type="number"
                [(ngModel)]="formData.amount"
                name="amount"
                required
                min="0.01"
                step="0.01"
                placeholder="请输入补偿金额"
              />
            </div>
            <div class="form-group">
              <label for="reason">价保原因 *</label>
              <textarea
                id="reason"
                [(ngModel)]="formData.reason"
                name="reason"
                required
                rows="3"
                placeholder="请输入价保原因"
              ></textarea>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-cancel" (click)="closeModal()">取消</button>
              <button type="submit" class="btn-submit" [disabled]="!form.valid">提交申请</button>
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

      .form-group input,
      .form-group textarea {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        font-family: inherit;
      }

      .form-group input:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
      }

      .form-group textarea {
        resize: vertical;
        min-height: 60px;
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
export class PriceProtectionModalComponent {
  visible = false
  formData = {
    customerName: '',
    orderId: '',
    amount: 0,
    reason: ''
  }

  @Output() orderAdded = new EventEmitter<void>()

  openModal() {
    this.visible = true
    this.formData = {
      customerName: '',
      orderId: '',
      amount: 0,
      reason: ''
    }
  }

  closeModal() {
    this.visible = false
  }

  onSubmit() {
    if (this.formData.customerName && this.formData.orderId && this.formData.amount > 0 && this.formData.reason) {
      addPriceProtectionOrder({
        customerName: this.formData.customerName,
        orderId: this.formData.orderId,
        amount: this.formData.amount,
        reason: this.formData.reason
      })
      this.orderAdded.emit()
      this.closeModal()
    }
  }
}

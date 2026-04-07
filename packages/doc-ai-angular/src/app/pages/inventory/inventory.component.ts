import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, NgZone } from '@angular/core'
import { CommonModule } from '@angular/common'
import { inventoryList, addInventory, type InventoryItem } from '../../../mock'
import { InventoryModalComponent } from '../../components/inventory-modal.component'

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, InventoryModalComponent],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss'
})
export class InventoryComponent implements OnInit, OnDestroy, AfterViewInit {
  inventoryList = inventoryList
  private pendingModalData: { productName?: string; quantity?: number; warehouse?: string } | null = null

  @ViewChild(InventoryModalComponent) modal!: InventoryModalComponent

  constructor(private zone: NgZone) {}

  ngOnInit() {
    const modelContext = (navigator as any).modelContext
    modelContext.registerTool({
      name: 'add_inventory',
      description: '【入库管理工具】帮助电商管理员将采购的商品新增入库存系统中',
      inputSchema: {
        type: 'object',
        properties: {
          productName: { type: 'string', description: '商品名称或型号，如：iPhone 15 Pro Max' },
          quantity: { type: 'number', description: '要入库的数量，必须大于0' },
          warehouse: { type: 'string', description: '入库存放的仓库名称，如：北京一号仓' }
        },
        required: ['productName', 'quantity', 'warehouse']
      },
      execute: async (params: any) => {
        await this.handleManualAdd(params)
        setTimeout(() => this.modal.onSubmit(), 1000)
        const result = '已将 ' + params.quantity + ' 件 "' + params.productName + '" 入库到 "' + params.warehouse + '" 仓库'
        return {
          content: [{ type: 'text', text: result }]
        }
      }
    })
  }

  ngOnDestroy() {
    const modelContext = (navigator as any).modelContext
    modelContext.unregisterTool('add_inventory')
  }

  ngAfterViewInit() {
    if (this.pendingModalData) {
      this.zone.run(() => {
        this.modal.openModal(this.pendingModalData!)
        this.pendingModalData = null
      })
    }
  }

  handleManualAdd(params: { productName?: string; quantity?: number; warehouse?: string } = {}) {
    const payload = {
      productName: params.productName || '',
      quantity: params.quantity ?? 1,
      warehouse: params.warehouse || ''
    }
    this.zone.run(() => {
      this.modal.openModal(payload)
    })
  }

  onInventoryAdded() {
    // 可以在这里添加一些额外的逻辑，比如显示成功消息
    console.log('库存已更新')
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'In Stock':
        return '库存充足'
      case 'Low Stock':
        return '库存预警'
      case 'Out of Stock':
        return '缺货'
      default:
        return status
    }
  }

  getStatusClass(status: string): string {
    return status.replace(/ /g, '-').toLowerCase()
  }
}

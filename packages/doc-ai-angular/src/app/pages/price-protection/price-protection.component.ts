import { Component, OnInit, OnDestroy, ViewChild, NgZone } from '@angular/core'
import { NgFor, NgIf, NgClass } from '@angular/common'
import { registerPageTool, RegisterPageToolByHandlersOptions } from '@opentiny/next-sdk'
import rawData from './price-protection.json'
import { PriceProtectionModalComponent } from '../../components/price-protection-modal.component'
import { priceProtectionList, type PriceProtectionOrder } from '../../../mock'

// 价保申请类型定义
type PriceRecord = {
  id: number
  orderId: string
  productId: number
  productName: string
  buyPrice: number
  currentPrice: number
  diffPrice: number
  status: 'pending' | 'approved' | 'rejected' | 'expired' | string
  applyDate: string
  expireDate: string
  remark: string
}

const PRICE_PROTECTION_QUERY_TOOL = 'price-protection-query'
const PRICE_PROTECTION_REVIEW_TOOL = 'price-protection-review'
const PRICE_PROTECTION_DETAIL_TOOL = 'price-protection-detail'
const ADD_PRICE_PROTECTION_TOOL = 'add_price_protection'

@Component({
  selector: 'app-price-protection',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, PriceProtectionModalComponent],
  templateUrl: './price-protection.component.html',
  styleUrl: './price-protection.component.scss'
})
export class PriceProtectionComponent implements OnInit, OnDestroy {
  records: PriceRecord[] = rawData as PriceRecord[]

  @ViewChild(PriceProtectionModalComponent) modal!: PriceProtectionModalComponent

  constructor(private zone: NgZone) {}

  // 状态标签与样式映射
  statusLabels: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    expired: '已过期'
  }

  statusClass: Record<string, string> = {
    pending: 'tag-warning',
    approved: 'tag-success',
    rejected: 'tag-danger',
    expired: 'tag-info'
  }

  // 审批默认备注
  private DEFAULT_REMARKS = {
    approve: '审核通过，差价将在3个工作日内退回',
    reject: '不符合价保条件，不予受理'
  }

  // 各状态数量统计
  get statusCount() {
    const count = { pending: 0, approved: 0, rejected: 0, expired: 0 }
    this.records.forEach((r) => {
      if (r.status in count) count[r.status as keyof typeof count]++
    })
    return count
  }

  ngOnInit(): void {
    const modelContext = (navigator as any).modelContext
    modelContext.registerTool({
      name: PRICE_PROTECTION_QUERY_TOOL,
      title: '查询价保申请',
      description: '查询商品价保申请列表，可按状态筛选（pending/approved/rejected/expired），不传 status 则返回全部',
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'approved', 'rejected', 'expired'],
            description: '申请状态，不传则查询全部'
          }
        }
      },
      execute: async ({ status }: { status?: string }) => {
        const list = status
          ? priceProtectionList().filter((o: PriceProtectionOrder) => o.status.toLowerCase() === status.toLowerCase())
          : priceProtectionList()
        const text = `查询到 ${list.length} 条价保申请：\n${JSON.stringify(list, null, 2)}`
        return { content: [{ type: 'text', text }] }
      }
    })

    modelContext.registerTool({
      name: PRICE_PROTECTION_REVIEW_TOOL,
      title: '审批价保申请',
      description: '对待审核的价保申请进行审批，支持通过（approve）或拒绝（reject），可附加备注',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            pattern: '^PP-\\d{8}-\\d{2}$',
            description: '价保申请 ID'
          },
          action: {
            type: 'string',
            enum: ['approve', 'reject'],
            description: '审批动作：approve=通过，reject=拒绝'
          },
          remark: { type: 'string', description: '审批备注（可选）' }
        },
        required: ['id', 'action']
      },
      execute: async ({
        id,
        action,
        remark
      }: {
        id: string | number
        action: 'approve' | 'reject'
        remark?: string
      }) => {
        const order = priceProtectionList().find((o: PriceProtectionOrder) => o.id === String(id))
        if (!order) {
          return { content: [{ type: 'text', text: `未找到 ID 为 ${id} 的价保申请。` }] }
        }
        if (order.status !== 'Pending') {
          return { content: [{ type: 'text', text: `申请单状态为「${order.status}」，无法重复审核。` }] }
        }
        order.status = action === 'approve' ? 'Approved' : 'Rejected'
        if (remark) {
          order.remark = remark
        }
        const remarkText = remark ? `，备注：${remark}` : ''
        return {
          content: [
            { type: 'text', text: `价保申请 ${order.id} 已${action === 'approve' ? '通过' : '拒绝'}${remarkText}。` }
          ]
        }
      }
    })

    modelContext.registerTool({
      name: PRICE_PROTECTION_DETAIL_TOOL,
      title: '价保申请详情',
      description: '根据申请 ID 获取单条价保申请的完整详情',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            pattern: '^PP-\\d{8}-\\d{2}$',
            description: '价保申请 ID'
          }
        },
        required: ['id']
      },
      execute: async ({ id }: { id: string | number }) => {
        const order = priceProtectionList().find((o: PriceProtectionOrder) => o.id === String(id))
        const text = order ? `价保申请详情：\n${JSON.stringify(order, null, 2)}` : `未找到 ID 为 ${id} 的价保申请。`
        return { content: [{ type: 'text', text }] }
      }
    })

    modelContext.registerTool({
      name: ADD_PRICE_PROTECTION_TOOL,
      title: '申请价保补偿',
      description:
        '【价保监控工具】帮助电商管理员处理顾客因降价提出的补差价请求（价保申请）。注意：在调用本工具前，你必须先使用 get_skill_content 工具读取相关的技能文档，严禁凭空构造参数或跳过业务规则直接调用。',
      inputSchema: {
        type: 'object',
        properties: {
          isSkillRead: {
            type: 'boolean',
            description:
              '是否已经通过 get_skill_content 读取过技能文档？必须阅读文档后才允许传 true。如果你还没有阅读文档，严禁调用此工具。'
          },
          customerName: { type: 'string', description: '提出价保申请的顾客姓名' },
          orderId: { type: 'string', description: '需要价保补偿的原订单编号' },
          productName: { type: 'string', description: '需要价保补偿的商品名称' },
          amount: { type: 'number', description: '申请补偿的差价金额' },
          reason: { type: 'string', description: '顾客申请价保的原因' }
        },
        required: ['isSkillRead', 'customerName', 'orderId', 'productName', 'amount', 'reason']
      },
      execute: async (params: any) => {
        if (!params.isSkillRead) {
          return {
            content: [
              {
                type: 'text',
                text: '错误：在调用此工具前，你必须先使用 get_skill_content 读取相关技能文档。请先阅读技能文档后再重新调用。'
              }
            ]
          }
        }
        this.zone.run(() => {
          this.modal.openModal(params)
          setTimeout(() => this.modal.onSubmit(), 1000)
        })
        const result = '价保申请已提交，正在等待审核。'
        return { content: [{ type: 'text', text: result }] }
      }
    })
  }

  ngOnDestroy(): void {
    const modelContext = (navigator as any).modelContext
    modelContext.unregisterTool(PRICE_PROTECTION_QUERY_TOOL)
    modelContext.unregisterTool(PRICE_PROTECTION_REVIEW_TOOL)
    modelContext.unregisterTool(PRICE_PROTECTION_DETAIL_TOOL)
    modelContext.unregisterTool(ADD_PRICE_PROTECTION_TOOL)
  }

  // 审核通过
  handleApprove(record: PriceRecord): void {
    record.status = 'approved'
    record.remark = this.DEFAULT_REMARKS.approve
  }

  // 审核拒绝
  handleReject(record: PriceRecord): void {
    record.status = 'rejected'
    record.remark = this.DEFAULT_REMARKS.reject
  }

  // 手动新增价保申请
  handleManualAdd(): void {
    this.modal.openModal()
  }

  // 当新增价保申请时调用
  onOrderAdded(formData: any): void {
    // 创建新的 PriceRecord 对象
    let buyPrice = 3598 
    let currentPrice = buyPrice - parseFloat(formData.amount) || 0
    const newRecord: PriceRecord = {
      id: Date.now(), // 使用时间戳作为临时 ID
      orderId: formData.orderId,
      productId: this.records.length > 0 ? this.records[this.records.length - 1].productId + 1 : 1, // 默认值
      productName: formData.productName, // 默认值
      buyPrice, // 默认值
      currentPrice, // 默认值
      diffPrice: formData.amount,
      status: 'pending',
      applyDate: new Date().toISOString().split('T')[0],
      expireDate: '', // 默认值
      remark: formData.reason
    }
    // 添加新记录到 records 数组
    this.records.push(newRecord)
  }
}

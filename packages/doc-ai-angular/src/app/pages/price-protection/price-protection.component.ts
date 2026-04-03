import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core'
import { NgFor, NgIf, NgClass } from '@angular/common'
import { registerPageTool, RegisterPageToolByHandlersOptions } from '@opentiny/next-sdk'
import rawData from './price-protection.json'
import { PriceProtectionModalComponent } from '../../components/price-protection-modal.component'
import { server } from '../../../mcp-servers'
import { z } from '@opentiny/next-sdk'
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

  // 用于存储 registerPageTool 返回的 cleanup 函数
  private cleanupPageTool!: () => void

  // 各状态数量统计
  get statusCount() {
    const count = { pending: 0, approved: 0, rejected: 0, expired: 0 }
    this.records.forEach((r) => {
      if (r.status in count) count[r.status as keyof typeof count]++
    })
    return count
  }

  ngOnInit(): void {
    server.registerTool(
      PRICE_PROTECTION_QUERY_TOOL,
      {
        title: '查询价保申请',
        description: '查询商品价保申请列表，可按状态筛选（pending/approved/rejected/expired），不传 status 则返回全部',
        inputSchema: {
          status: z.enum(['pending', 'approved', 'rejected', 'expired']).optional().describe('申请状态，不传则查询全部')
        }
      },
      async ({ status }: { status?: string }) => {
        const list = status
          ? priceProtectionList().filter((o: PriceProtectionOrder) => o.status.toLowerCase() === status.toLowerCase())
          : priceProtectionList()
        const text = `查询到 ${list.length} 条价保申请：\n${JSON.stringify(list, null, 2)}`
        return { content: [{ type: 'text', text }] }
      }
    )

    server.registerTool(
      PRICE_PROTECTION_REVIEW_TOOL,
      {
        title: '审批价保申请',
        description: '对待审核的价保申请进行审批，支持通过（approve）或拒绝（reject），可附加备注',
        inputSchema: {
          id: z
            .string()
            .regex(/^PP-\d{8}-\d{2}$/i, 'ID格式错误，必须形如 PP-20260301-01')
            .describe('价保申请 ID'),
          action: z.enum(['approve', 'reject']).describe('审批动作：approve=通过，reject=拒绝'),
          remark: z.string().optional().describe('审批备注（可选）')
        }
      },
      async ({ id, action, remark }: { id: string | number; action: 'approve' | 'reject'; remark?: string }) => {
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
    )

    server.registerTool(
      PRICE_PROTECTION_DETAIL_TOOL,
      {
        title: '价保申请详情',
        description: '根据申请 ID 获取单条价保申请的完整详情',
        inputSchema: {
          id: z
            .string()
            .regex(/^PP-\d{8}-\d{2}$/i, 'ID格式错误，必须形如 PP-20260301-01')
            .describe('价保申请 ID')
        }
      },
      async ({ id }: { id: string | number }) => {
        const order = priceProtectionList().find((o: PriceProtectionOrder) => o.id === String(id))
        const text = order ? `价保申请详情：\n${JSON.stringify(order, null, 2)}` : `未找到 ID 为 ${id} 的价保申请。`
        return { content: [{ type: 'text', text }] }
      }
    )

    server.registerTool(
      ADD_PRICE_PROTECTION_TOOL,
      {
        title: '申请价保补偿',
        description:
          '【价保监控工具】帮助电商管理员处理顾客因降价提出的补差价请求（价保申请）。注意：在调用本工具前，你必须先使用 get_skill_content 工具读取相关的技能文档，严禁凭空构造参数或跳过业务规则直接调用。',
        inputSchema: {
          isSkillRead: z
            .boolean()
            .describe(
              '是否已经通过 get_skill_content 读取过技能文档？必须阅读文档后才允许传 true。如果你还没有阅读文档，严禁调用此工具。'
            ),
          customerName: z.string().trim().min(1).describe('提出价保申请的顾客姓名'),
          orderId: z.string().trim().min(1).describe('需要价保补偿的原订单编号'),
          amount: z.number().positive().describe('申请补偿的差价金额'),
          reason: z.string().trim().min(1).describe('顾客申请价保的原因')
        }
      },
      async (params: any) => {
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
        const result = ''
        return { content: [{ type: 'text', text: result }] }
      }
    )

    // 注册 MCP 工具处理器，显式指定 route 与 mcp-servers 中注册的路由一致
    // 运行时支持 route；此处使用 RegisterPageToolByHandlersOptions 类型，规避在联合类型上转换引发 TS2352
    this.cleanupPageTool = registerPageTool({
      route: '/price-protection',
      handlers: {
        'price-protection-query': async ({ status }: { status?: string }) => {
          const result = status ? this.records.filter((r) => r.status === status) : this.records
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
        },
        'price-protection-review': async ({
          id,
          action,
          remark
        }: {
          id: string | number
          action: 'approve' | 'reject'
          remark?: string
        }) => {
          const parseRecordId = (value: string | number): number | null => {
            if (typeof value === 'number') {
              return Number.isSafeInteger(value) ? value : null
            }
            return /^\d+$/.test(value) ? Number(value) : null
          }
          const recordId = parseRecordId(id)
          if (recordId === null) {
            return { content: [{ type: 'text', text: `无效的价保申请 ID：${id}` }] }
          }
          const record = this.records.find((r) => r.id === recordId)
          if (!record) {
            return { content: [{ type: 'text', text: `未找到 ID 为 ${id} 的价保申请` }] }
          }
          if (record.status !== 'pending') {
            return {
              content: [
                {
                  type: 'text',
                  text: `申请 ${id} 当前状态为「${this.statusLabels[record.status] || record.status}」，无法再次审核`
                }
              ]
            }
          }
          record.status = action === 'approve' ? 'approved' : 'rejected'
          record.remark = remark ?? (action === 'approve' ? this.DEFAULT_REMARKS.approve : this.DEFAULT_REMARKS.reject)
          return {
            content: [
              {
                type: 'text',
                text: `申请 ${id}（${record.productName}）已${action === 'approve' ? '通过' : '拒绝'}，备注：${record.remark}`
              }
            ]
          }
        },
        'price-protection-detail': async ({ id }: { id: string | number }) => {
          const parseRecordId = (value: string | number): number | null => {
            if (typeof value === 'number') return Number.isSafeInteger(value) ? value : null
            return /^\d+$/.test(value) ? Number(value) : null
          }
          const recordId = parseRecordId(id)
          if (recordId === null) {
            return { content: [{ type: 'text', text: `无效的价保申请 ID：${id}` }] }
          }
          const record = this.records.find((r) => r.id === recordId)
          if (!record) {
            return { content: [{ type: 'text', text: `未找到 ID 为 ${id} 的价保申请` }] }
          }
          return { content: [{ type: 'text', text: JSON.stringify(record, null, 2) }] }
        }
      }
    } as RegisterPageToolByHandlersOptions)
  }

  ngOnDestroy(): void {
    this.cleanupPageTool?.()
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
  onOrderAdded(): void {
    // 可以在这里添加一些额外的逻辑，比如显示成功消息
    console.log('价保申请已添加')
  }
}

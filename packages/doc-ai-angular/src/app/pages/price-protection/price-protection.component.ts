import { Component, OnInit, OnDestroy } from '@angular/core'
import { NgFor, NgIf, NgClass } from '@angular/common'
import { registerPageTool } from '@opentiny/next-sdk'
import rawData from './price-protection.json'

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

@Component({
  selector: 'app-price-protection',
  standalone: true,
  imports: [NgFor, NgIf, NgClass],
  templateUrl: './price-protection.component.html',
  styleUrl: './price-protection.component.scss'
})
export class PriceProtectionComponent implements OnInit, OnDestroy {
  records: PriceRecord[] = rawData as PriceRecord[]

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
    // 注册 MCP 工具处理器，显式指定 route 与 mcp-servers 中注册的路由一致
    // 运行时支持 route；若 SDK 类型声明未包含 route，用类型断言兼容
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
                { type: 'text', text: `申请 ${id} 当前状态为「${this.statusLabels[record.status]}」，无法再次审核` }
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
    } as Parameters<typeof registerPageTool>[0])
  }

  ngOnDestroy(): void {
    // 组件销毁时取消注册，对应 Vue 版本 onUnmounted 中的 cleanupPageTool()
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
}

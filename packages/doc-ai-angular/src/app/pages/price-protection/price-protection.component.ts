import { Component, OnInit, OnDestroy } from '@angular/core'
import { NgFor, NgIf, NgClass } from '@angular/common'
import { z } from '@opentiny/next-sdk'
import { server } from '../../../mcp-servers'
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

  // 用于存储工具注册的 cleanup 函数
  private toolCleanups: Array<() => void> = []

  // 各状态数量统计
  get statusCount() {
    const count = { pending: 0, approved: 0, rejected: 0, expired: 0 }
    this.records.forEach((r) => {
      if (r.status in count) count[r.status as keyof typeof count]++
    })
    return count
  }

  /**
   * 安全解析商品 ID，防止大数字精度丢失导致溢出
   */
  private parseRecordId(value: string | number): number | null {
    if (typeof value === 'number') {
      return Number.isSafeInteger(value) ? value : null
    }
    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
      return null
    }
    const num = Number(value)
    // 核心修复：校验是否在安全整数范围内，防止大数字 ID 精度丢失导致逻辑错误
    return num <= Number.MAX_SAFE_INTEGER ? num : null
  }

  ngOnInit(): void {
    const records = this.records
    const statusLabels = this.statusLabels
    const DEFAULT_REMARKS = this.DEFAULT_REMARKS

    this.toolCleanups.push(
      server
        .registerTool(
          'price-protection-query',
          {
            title: '查询价保申请',
            description: '查询商品价保申请列表，可按状态筛选（pending/approved/rejected/expired），不传 status 则返回全部',
            inputSchema: {
              status: z.enum(['pending', 'approved', 'rejected', 'expired']).optional().describe('申请状态，不传则查询全部')
            }
          },
          async ({ status }: { status?: string }) => {
            const result = status ? records.filter((r) => r.status === status) : records
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
          }
        )
        .remove
    )

    this.toolCleanups.push(
      server
        .registerTool(
          'price-protection-review',
          {
            title: '审批价保申请',
            description: '对待审核的价保申请进行审批，支持通过（approve）或拒绝（reject），可附加备注',
            inputSchema: {
              id: z.union([z.number().int(), z.string().regex(/^\d+$/, '必须是纯数字 ID')]).describe('价保申请 ID'),
              action: z.enum(['approve', 'reject']).describe('审批动作：approve=通过，reject=拒绝'),
              remark: z.string().optional().describe('审批备注（可选）')
            }
          },
          async ({ id, action, remark }: { id: string | number; action: 'approve' | 'reject'; remark?: string }) => {
            const recordId = this.parseRecordId(id)
            if (recordId === null) return { content: [{ type: 'text', text: `无效或超出安全范围的价保申请 ID：${id}` }] }
            const record = records.find((r) => r.id === recordId)
            if (!record) return { content: [{ type: 'text', text: `未找到 ID 为 ${id} 的价保申请` }] }
            if (record.status !== 'pending') {
              return {
                content: [
                  {
                    type: 'text',
                    text: `申请 ${id} 当前状态为「${statusLabels[record.status] || record.status}」，无法再次审核`
                  }
                ]
              }
            }
            record.status = action === 'approve' ? 'approved' : 'rejected'
            record.remark = remark ?? (action === 'approve' ? DEFAULT_REMARKS.approve : DEFAULT_REMARKS.reject)
            return {
              content: [
                {
                  type: 'text',
                  text: `申请 ${id}（${record.productName}）已${action === 'approve' ? '通过' : '拒绝'}，备注：${record.remark}`
                }
              ]
            }
          }
        )
        .remove
    )

    this.toolCleanups.push(
      server
        .registerTool(
          'price-protection-detail',
          {
            title: '价保申请详情',
            description: '根据申请 ID 获取单条价保申请的完整详情',
            inputSchema: {
              id: z.union([z.number().int(), z.string().regex(/^\d+$/, '必须是纯数字 ID')]).describe('价保申请 ID')
            }
          },
          async ({ id }: { id: string | number }) => {
            const recordId = this.parseRecordId(id)
            if (recordId === null) return { content: [{ type: 'text', text: `无效或超出安全范围的价保申请 ID：${id}` }] }
            const record = records.find((r) => r.id === recordId)
            if (!record) return { content: [{ type: 'text', text: `未找到 ID 为 ${id} 的价保申请` }] }
            return { content: [{ type: 'text', text: JSON.stringify(record, null, 2) }] }
          }
        )
        .remove
    )
  }

  ngOnDestroy(): void {
    // 依次执行所有已注册工具的清理句柄，解决实例竞态问题
    this.toolCleanups.forEach((cleanup) => cleanup())
    this.toolCleanups = []
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

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
  template: `
    <div class="price-protection-page">
      <div class="page-header">
        <h3>价保管理</h3>
        <div class="header-stats">
          <span class="stat-item pending">待审核 {{ statusCount.pending }}</span>
          <span class="stat-item approved">已通过 {{ statusCount.approved }}</span>
          <span class="stat-item rejected">已拒绝 {{ statusCount.rejected }}</span>
          <span class="stat-item expired">已过期 {{ statusCount.expired }}</span>
        </div>
      </div>
      <div class="page-content">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 50px">#</th>
              <th style="width: 180px">订单号</th>
              <th>商品名称</th>
              <th>购买价格</th>
              <th>当前价格</th>
              <th>可退差价</th>
              <th style="width: 110px">申请日期</th>
              <th style="width: 110px">到期日期</th>
              <th style="width: 90px">状态</th>
              <th>备注</th>
              <th style="width: 150px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let record of records; let i = index">
              <td>{{ i + 1 }}</td>
              <td>{{ record.orderId }}</td>
              <td>{{ record.productName }}</td>
              <td>¥{{ record.buyPrice }}</td>
              <td>¥{{ record.currentPrice }}</td>
              <td><span class="diff-price">¥{{ record.diffPrice }}</span></td>
              <td>{{ record.applyDate }}</td>
              <td>{{ record.expireDate }}</td>
              <td>
                <span class="tag" [ngClass]="statusClass[record.status]">{{ statusLabels[record.status] ?? record.status }}</span>
              </td>
              <td><span class="remark-text">{{ record.remark || '—' }}</span></td>
              <td>
                <ng-container *ngIf="record.status === 'pending'; else noAction">
                  <button class="action-btn btn-success" (click)="handleApprove(record)">通过</button>
                  <button class="action-btn btn-danger" style="margin-left: 6px" (click)="handleReject(record)">拒绝</button>
                </ng-container>
                <ng-template #noAction><span class="no-action">—</span></ng-template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [
    `
      .price-protection-page { padding: 24px; background: #f5f7fa; min-height: 100vh; box-sizing: border-box; }
      .price-protection-page .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
      .price-protection-page .page-header h3 { margin: 0; font-size: 18px; font-weight: 600; color: #1a1a1a; }
      .header-stats { display: flex; gap: 12px; }
      .stat-item { font-size: 13px; padding: 3px 12px; border-radius: 12px; font-weight: 500; }
      .stat-item.pending { background: #fff7e6; color: #fa8c16; }
      .stat-item.approved { background: #f6ffed; color: #52c41a; }
      .stat-item.rejected { background: #fff1f0; color: #ff4d4f; }
      .stat-item.expired { background: #f5f5f5; color: #8c8c8c; }
      .page-content { padding: 20px; background: #fff; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.03); overflow: auto; }
      .data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
      .data-table th, .data-table td { padding: 12px 14px; text-align: left; border-bottom: 1px solid #f0f0f0; }
      .data-table th { background: #fafafa; color: #595959; font-weight: 500; font-size: 13px; }
      .data-table tr:hover td { background: #fafafa; }
      .diff-price { color: #ff4d4f; font-weight: 600; }
      .remark-text { font-size: 12px; color: #595959; }
      .tag { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: 500; }
      .tag.tag-warning { background: #fff7e6; color: #fa8c16; border: 1px solid #ffd591; }
      .tag.tag-success { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
      .tag.tag-danger { background: #fff1f0; color: #ff4d4f; border: 1px solid #ffccc7; }
      .tag.tag-info { background: #f5f5f5; color: #8c8c8c; border: 1px solid #d9d9d9; }
      .action-btn { padding: 4px 12px; font-size: 12px; border: none; border-radius: 4px; cursor: pointer; }
      .action-btn:hover { opacity: 0.8; }
      .action-btn.btn-success { background: #f6ffed; color: #52c41a; border: 1px solid #b7eb8f; }
      .action-btn.btn-danger { background: #fff1f0; color: #ff4d4f; border: 1px solid #ffccc7; }
      .no-action { color: #bfbfbf; font-size: 13px; }
    `
  ]
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
    /**
     * 注册 MCP 工具处理器（框架无关的纯 JS 函数）
     * 对应 Vue 版本 onMounted 中的 registerPageTool 调用
     * 显式指定 route，确保与 mcp-servers 中注册的路由一致
     */
    this.cleanupPageTool = registerPageTool({
      route: '/price-protection',
      handlers: {
        // 查询价保申请列表，支持按状态过滤
        'price-protection-query': async ({ status }: { status?: string }) => {
          const result = status ? this.records.filter((r) => r.status === status) : this.records
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
        },

        // 审批价保申请（通过或拒绝）
        'price-protection-review': async ({
          id,
          action,
          remark
        }: {
          id: number
          action: 'approve' | 'reject'
          remark?: string
        }) => {
          const record = this.records.find((r) => r.id === id)
          if (!record) {
            return { content: [{ type: 'text', text: `未找到 ID 为 ${id} 的价保申请` }] }
          }
          if (record.status !== 'pending') {
            return {
              content: [{ type: 'text', text: `申请 ${id} 当前状态为「${this.statusLabels[record.status]}」，无法再次审核` }]
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

        // 获取单条价保申请详情
        'price-protection-detail': async ({ id }: { id: number }) => {
          const record = this.records.find((r) => r.id === id)
          if (!record) {
            return { content: [{ type: 'text', text: `未找到 ID 为 ${id} 的价保申请` }] }
          }
          return { content: [{ type: 'text', text: JSON.stringify(record, null, 2) }] }
        }
      }
    })
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

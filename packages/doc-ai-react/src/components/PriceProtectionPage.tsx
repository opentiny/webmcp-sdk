import { useState, useEffect } from 'react'
import { registerPageTool } from '@opentiny/next-sdk'
import priceData from './data/priceProtection.json'
import './PriceProtectionPage.css'

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

export default function PriceProtectionPage() {
  const [records, setRecords] = useState<PriceRecord[]>(priceData as PriceRecord[])

  const statusLabels: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    expired: '已过期'
  }

  const statusClass: Record<string, string> = {
    pending: 'tag-warning',
    approved: 'tag-success',
    rejected: 'tag-danger',
    expired: 'tag-info'
  }

  const DEFAULT_REMARKS = {
    approve: '审核通过，差价将在 3 个工作日内退回',
    reject: '不符合价保条件，不予受理'
  }

  const statusCount = (() => {
    const count = { pending: 0, approved: 0, rejected: 0, expired: 0 }
    records.forEach((r: PriceRecord) => {
      if (r.status in count) count[r.status as keyof typeof count]++
    })
    return count
  })()

  useEffect(() => {
    const cleanupPageTool = registerPageTool({
      route: '/price-protection',
      handlers: {
        'price-protection-query': async ({ status }: { status?: string }) => {
          const result = status ? records.filter((r: PriceRecord) => r.status === status) : records
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
        },
        'price-protection-review': async ({
          id,
          action,
          remark
        }: {
          id: number
          action: 'approve' | 'reject'
          remark?: string
        }) => {
          const record = records.find((r) => r.id === id)
          if (!record) {
            return { content: [{ type: 'text', text: `未找到 ID 为 ${id} 的价保申请` }] }
          }
          if (record.status !== 'pending') {
            return {
              content: [
                {
                  type: 'text',
                  text: `申请 ${id} 当前状态为「${statusLabels[record.status]}」，无法再次审核`
                }
              ]
            }
          }
          const updatedRecords = records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: action === 'approve' ? 'approved' : 'rejected',
                  remark: remark ?? (action === 'approve' ? DEFAULT_REMARKS.approve : DEFAULT_REMARKS.reject)
                }
              : r
          )
          setRecords(updatedRecords)
          return {
            content: [
              {
                type: 'text',
                text: `申请 ${id}（${records.find((r) => r.id === id)?.productName}）已${action === 'approve' ? '通过' : '拒绝'}，备注：${updatedRecords.find((r) => r.id === id)?.remark}`
              }
            ]
          }
        },
        'price-protection-detail': async ({ id }: { id: number }) => {
          const record = records.find((r) => r.id === id)
          if (!record) {
            return { content: [{ type: 'text', text: `未找到 ID 为 ${id} 的价保申请` }] }
          }
          return { content: [{ type: 'text', text: JSON.stringify(record, null, 2) }] }
        }
      }
    })

    return () => {
      cleanupPageTool()
    }
  }, [])

  const handleApprove = (record: PriceRecord) => {
    const updatedRecords = records.map((r) =>
      r.id === record.id ? { ...r, status: 'approved', remark: DEFAULT_REMARKS.approve } : r
    )
    setRecords(updatedRecords)
  }

  const handleReject = (record: PriceRecord) => {
    const updatedRecords = records.map((r) =>
      r.id === record.id ? { ...r, status: 'rejected', remark: DEFAULT_REMARKS.reject } : r
    )
    setRecords(updatedRecords)
  }

  return (
    <div className="price-protection-page">
      <div className="page-header">
        <h3>价保管理</h3>
        <div className="header-stats">
          <span className="stat-item pending">待审核 {statusCount.pending}</span>
          <span className="stat-item approved">已通过 {statusCount.approved}</span>
          <span className="stat-item rejected">已拒绝 {statusCount.rejected}</span>
          <span className="stat-item expired">已过期 {statusCount.expired}</span>
        </div>
      </div>
      <div className="page-content">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>#</th>
              <th style={{ width: '180px' }}>订单号</th>
              <th>商品名称</th>
              <th>购买价格</th>
              <th>当前价格</th>
              <th>可退差价</th>
              <th style={{ width: '110px' }}>申请日期</th>
              <th style={{ width: '110px' }}>到期日期</th>
              <th style={{ width: '90px' }}>状态</th>
              <th>备注</th>
              <th style={{ width: '150px' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, i) => (
              <tr key={record.id}>
                <td>{i + 1}</td>
                <td>{record.orderId}</td>
                <td>{record.productName}</td>
                <td>¥{record.buyPrice}</td>
                <td>¥{record.currentPrice}</td>
                <td>
                  <span className="diff-price">¥{record.diffPrice}</span>
                </td>
                <td>{record.applyDate}</td>
                <td>{record.expireDate}</td>
                <td>
                  <span className={`tag ${statusClass[record.status]}`}>
                    {statusLabels[record.status] ?? record.status}
                  </span>
                </td>
                <td>
                  <span className="remark-text">{record.remark || '—'}</span>
                </td>
                <td>
                  {record.status === 'pending' ? (
                    <>
                      <button className="action-btn btn-success" onClick={() => handleApprove(record)}>
                        通过
                      </button>
                      <button
                        className="action-btn btn-danger"
                        style={{ marginLeft: '6px' }}
                        onClick={() => handleReject(record)}>
                        拒绝
                      </button>
                    </>
                  ) : (
                    <span className="no-action">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

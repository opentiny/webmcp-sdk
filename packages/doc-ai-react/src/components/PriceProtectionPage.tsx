import { useEffect, useRef, useState } from 'react'
import { priceProtectionList, addPriceProtectionOrder, type PriceProtectionOrder } from '../mock'
import PriceProtectionModal from './PriceProtectionModal'

export function Component() {
  const modalRef = useRef<any>(null)
  const [orders, setOrders] = useState<PriceProtectionOrder[]>([])
  const [reviewDialog, setReviewDialog] = useState({
    visible: false,
    action: 'approve' as 'approve' | 'reject',
    orderId: '',
    id: '',
    remark: ''
  })

  useEffect(() => {
    setOrders([...priceProtectionList])
  }, [])

  const handleManualAdd = () => {
    modalRef.current?.openModal({ customerName: '', orderId: '', amount: 0, reason: '' })
  }

  const handleApprove = (row: PriceProtectionOrder) => {
    setReviewDialog({
      visible: true,
      action: 'approve',
      orderId: row.orderId,
      id: row.id,
      remark: ''
    })
  }

  const handleReject = (row: PriceProtectionOrder) => {
    setReviewDialog({
      visible: true,
      action: 'reject',
      orderId: row.orderId,
      id: row.id,
      remark: ''
    })
  }

  const confirmReview = () => {
    const order = orders.find((o) => o.id === reviewDialog.id)
    if (order && order.status === 'Pending') {
      order.status = reviewDialog.action === 'approve' ? 'Approved' : 'Rejected'
      if (reviewDialog.remark) {
        order.remark = reviewDialog.remark
      }
      setOrders([...orders])
    }
    setReviewDialog({ ...reviewDialog, visible: false })
  }

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      Pending: '待处理',
      Approved: '已通过',
      Rejected: '已拒绝'
    }
    return map[status] || status
  }

  return (
    <div className="price-protection-view">
      <div className="page-header">
        <div className="header-left">
          <h2>价保单监控</h2>
          <p className="subtitle">跟踪并审批客户提起的价保申请订单</p>
        </div>
        <div className="header-right">
          <button className="btn-add" onClick={handleManualAdd}>
            ＋ 新增价保申请
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="tiny-grid">
          <thead>
            <tr>
              <th width="60">#</th>
              <th width="180">价保单号</th>
              <th width="150">原订单号</th>
              <th width="100">客户姓名</th>
              <th width="110" align="right">
                补偿金额
              </th>
              <th width="180">价保原因</th>
              <th width="110" align="center">
                当前状态
              </th>
              <th width="175">提起时间</th>
              <th width="150" align="center">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => (
              <tr key={order.id}>
                <td>{index + 1}</td>
                <td>{order.id}</td>
                <td>{order.orderId}</td>
                <td>{order.customerName}</td>
                <td align="right">
                  <span className="amount">￥{order.amount}</span>
                </td>
                <td>{order.reason}</td>
                <td align="center">
                  <span className={`status-bubble ${order.status.toLowerCase()}`}>{getStatusLabel(order.status)}</span>
                </td>
                <td>{order.createdAt}</td>
                <td align="center">
                  {order.status === 'Pending' ? (
                    <div className="row-actions">
                      <button className="act-btn approve" onClick={() => handleApprove(order)}>
                        通过
                      </button>
                      <button className="act-btn reject" onClick={() => handleReject(order)}>
                        驳回
                      </button>
                    </div>
                  ) : (
                    <span className="action-done">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PriceProtectionModal ref={modalRef} />

      {reviewDialog.visible && (
        <div className="modal-overlay" onClick={() => setReviewDialog({ ...reviewDialog, visible: false })}>
          <div className="modal-content review-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{reviewDialog.action === 'approve' ? '确认审批通过' : '确认驳回'}</h3>
            </div>
            <div className="modal-body">
              <p>
                即将对价保申请 <strong>{reviewDialog.orderId}</strong> 执行
                <strong className={reviewDialog.action === 'approve' ? 'text-success' : 'text-danger'}>
                  {reviewDialog.action === 'approve' ? '审批通过' : '驳回'}
                </strong>
                操作。
              </p>
              <div className="form-item">
                <label>备注（可选）</label>
                <textarea
                  rows={2}
                  value={reviewDialog.remark}
                  onChange={(e) => setReviewDialog({ ...reviewDialog, remark: e.target.value })}
                  placeholder="填写审批备注"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setReviewDialog({ ...reviewDialog, visible: false })}>
                取消
              </button>
              <button
                className={`btn-confirm ${reviewDialog.action === 'approve' ? 'btn-success' : 'btn-danger'}`}
                onClick={confirmReview}>
                确认{reviewDialog.action === 'approve' ? '通过' : '驳回'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Component

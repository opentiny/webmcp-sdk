import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { addPriceProtectionOrder } from '../mock'

export interface PriceProtectionModalProps {
  customerName?: string
  orderId?: string
  amount?: number
  reason?: string
}

export interface PriceProtectionModalRef {
  openModal: (params: PriceProtectionModalProps) => Promise<string>
}

const PriceProtectionModal = forwardRef<PriceProtectionModalRef, {}>((_props, ref) => {
  const [visible, setVisible] = useState(false)
  const [formData, setFormData] = useState({ customerName: '', orderId: '', amount: 0, reason: '' })
  const currentResolve = useRef<((result: string) => void) | null>(null)

  const openModal = (params: PriceProtectionModalProps) => {
    if (currentResolve.current) {
      currentResolve.current('❌ 用户发起了新的操作，前置价保申请已取消。')
    }
    setFormData({
      customerName: params.customerName || '',
      orderId: params.orderId || '',
      amount: params.amount || 0,
      reason: params.reason || ''
    })
    setVisible(true)
    return new Promise<string>((resolve) => {
      currentResolve.current = resolve
    })
  }

  useImperativeHandle(ref, () => ({ openModal }))

  const handleConfirm = () => {
    if (!formData.customerName) {
      alert('客户姓名不能为空')
      return
    }
    if (!formData.orderId) {
      alert('原订单号不能为空')
      return
    }
    if (!formData.amount || formData.amount <= 0) {
      alert('补偿金额必须大于 0')
      return
    }
    if (!formData.reason) {
      alert('申请事由不能为空')
      return
    }
    addPriceProtectionOrder({
      customerName: formData.customerName,
      orderId: formData.orderId,
      amount: formData.amount,
      reason: formData.reason
    })
    currentResolve.current?.(
      `价保单已建立：订单 ${formData.orderId}，补偿 ￥${formData.amount}，客户：${formData.customerName}。`
    )
    setVisible(false)
    currentResolve.current = null
  }

  const handleCancel = () => {
    currentResolve.current?.('已驳回该笔价保申请。')
    setVisible(false)
    currentResolve.current = null
  }

  const handleClose = () => {
    if (currentResolve.current) {
      currentResolve.current('❌ 对话框已关闭，操作取消。')
      currentResolve.current = null
    }
  }

  if (!visible) return null

  return (
    <div className="modal-overlay pp-dialog-overlay" onClick={handleClose}>
      <div className="modal-content pp-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header pp-header">
          <h3>价保申请审核</h3>
        </div>
        <div className="modal-body">
          <div className="ai-banner">
            <div className="ai-avatar">🤖</div>
            <div className="ai-text">
              <div className="ai-label">AI 业务助手</div>
              <div className="ai-desc">已捕获客户价保诉求，请核实并确认以下信息后提交审批。</div>
            </div>
          </div>

          <div className="form-container">
            <div className="form-item">
              <label>客户姓名</label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="例如：张三"
              />
            </div>
            <div className="form-item">
              <label>原订单号</label>
              <input
                type="text"
                value={formData.orderId}
                onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                placeholder="例如：ORD-5X9A2B"
              />
            </div>
            <div className="form-item">
              <label>补偿金额</label>
              <input
                type="number"
                min="0.01"
                step="10"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="form-item">
              <label>申请事由</label>
              <textarea
                rows={3}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="例如：百亿补贴大促降价保底"
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={handleCancel}>
            驳回申请
          </button>
          <button className="btn-confirm" onClick={handleConfirm}>
            <span className="btn-icon">✓</span> 审核通过并建单
          </button>
        </div>
      </div>
    </div>
  )
})

export default PriceProtectionModal

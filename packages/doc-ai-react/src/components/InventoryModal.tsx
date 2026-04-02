import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { addInventory } from '../mock'

export interface InventoryModalProps {
  productName?: string
  quantity?: number
  warehouse?: string
}

export interface InventoryModalRef {
  openModal: (params: InventoryModalProps) => Promise<string>
}

const InventoryModal = forwardRef<InventoryModalRef, {}>((_props, ref) => {
  const [visible, setVisible] = useState(false)
  const [formData, setFormData] = useState({
    productName: '',
    quantity: 1,
    warehouse: '北京一号仓'
  })

  const currentResolve = useRef<((result: string) => void) | null>(null)

  const openModal = (params: InventoryModalProps) => {
    if (currentResolve.current) {
      currentResolve.current('❌ 用户发起了新的操作，前置入库已取消。')
    }
    setFormData({
      productName: params.productName || '',
      quantity: params.quantity || 1,
      warehouse: params.warehouse || '北京一号仓'
    })
    setVisible(true)

    return new Promise<string>((resolve) => {
      currentResolve.current = resolve
    })
  }

  useImperativeHandle(ref, () => ({
    openModal
  }))

  const handleConfirm = () => {
    if (!formData.productName) {
      alert('商品名称不能为空')
      return
    }

    // 更新 Mock 数据
    addInventory({
      productName: formData.productName,
      sku: `SKU-AUTO-${Math.floor(Math.random() * 10000)}`,
      quantity: formData.quantity,
      warehouse: formData.warehouse
    })

    if (currentResolve.current) {
      currentResolve.current(
        `📦 成功！已将 ${formData.quantity} 件 ${formData.productName} 入库到 ${formData.warehouse}。`
      )
    }

    setVisible(false)
    currentResolve.current = null
  }

  const handleCancel = () => {
    if (currentResolve.current) {
      currentResolve.current('❌ 用户取消了入库操作。')
    }
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
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📦 新增入库单核对</h3>
        </div>
        <div className="modal-body">
          <div className="alert-info">
            <span className="icon">🤖</span>
            <div className="text">
              <strong>AI 业务助手</strong> 已为您提取了入库请求。请核实下方商品数量及存放仓库，确认无误后点击执行。
            </div>
          </div>

          <div className="form-container">
            <div className="form-item">
              <label>商品名称</label>
              <input
                type="text"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                placeholder="例如：iPhone 15 Pro Max"
              />
            </div>
            <div className="form-item">
              <label>入库数量</label>
              <input
                type="number"
                min="1"
                max="99999"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="form-item">
              <label>存放仓库</label>
              <select
                value={formData.warehouse}
                onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}>
                <option value="北京一号仓">北京一号仓</option>
                <option value="上海二号仓">上海二号仓</option>
                <option value="广州中心仓">广州中心仓</option>
                <option value="深圳坂田仓">深圳坂田仓</option>
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={handleCancel}>
            取消本次入库
          </button>
          <button className="btn-confirm" onClick={handleConfirm}>
            确认并执行入库
          </button>
        </div>
      </div>
    </div>
  )
})

export default InventoryModal

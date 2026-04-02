import { useEffect, useState } from 'react'
import { orderList, type OrderItem } from '../mock'

export function Component() {
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [searchText, setSearchText] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    setOrders([...orderList])
  }, [])

  const statusOptions = [
    { label: '待发货', value: 'Pending' },
    { label: '已发货', value: 'Shipped' },
    { label: '已签收', value: 'Delivered' },
    { label: '已退款', value: 'Refunded' },
    { label: '已取消', value: 'Cancelled' }
  ]

  const statusLabelMap: Record<string, string> = {
    Pending: '待发货',
    Shipped: '已发货',
    Delivered: '已签收',
    Refunded: '已退款',
    Cancelled: '已取消'
  }

  const filteredOrders = orders.filter((o) => {
    const matchStatus = !filterStatus || o.status === filterStatus
    const searchLower = searchText.toLowerCase()
    const matchSearch =
      !searchText || o.id.toLowerCase().includes(searchLower) || o.customerName.toLowerCase().includes(searchLower)
    return matchStatus && matchSearch
  })

  return (
    <div className="orders-view">
      <div className="page-header">
        <div className="header-left">
          <h2>订单管理</h2>
          <p className="subtitle">查询和追踪客户订单，支持按状态筛选</p>
        </div>
        <div className="header-right">
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ width: '140px', marginRight: '12px' }}>
            <option value="">所有状态</option>
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            className="search-input"
            type="text"
            placeholder="搜索订单号或客户名"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '220px' }}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="tiny-grid">
          <thead>
            <tr>
              <th width="60">#</th>
              <th width="150">订单号</th>
              <th width="100">客户姓名</th>
              <th width="150">联系电话</th>
              <th width="220">商品名称</th>
              <th width="70" align="center">
                数量
              </th>
              <th width="120" align="right">
                订单金额
              </th>
              <th width="110">支付方式</th>
              <th width="110" align="center">
                状态
              </th>
              <th width="180">下单时间</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order, index) => (
              <tr key={order.id}>
                <td>{index + 1}</td>
                <td>
                  <span className="order-id">{order.id}</span>
                </td>
                <td>{order.customerName}</td>
                <td>{order.customerPhone}</td>
                <td>{order.productName}</td>
                <td align="center">{order.quantity}</td>
                <td align="right">
                  <span className="amount">¥{order.totalAmount.toLocaleString()}</span>
                </td>
                <td>{order.paymentMethod}</td>
                <td align="center">
                  <span className={`status-tag ${order.status.toLowerCase()}`}>{statusLabelMap[order.status]}</span>
                </td>
                <td>{order.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Component

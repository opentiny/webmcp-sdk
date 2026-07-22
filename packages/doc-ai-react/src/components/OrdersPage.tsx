import { useEffect, useState } from 'react'
import type { ModelContext } from '@mcp-b/webmcp-types'
import { orderList, type OrderItem } from '../mock'

export function Component() {
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [searchText, setSearchText] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    setOrders([...orderList])

    const ORDER_QUERY_TOOL = 'order_query'
    const ORDER_DETAIL_TOOL = 'order_detail'
    const controller = new AbortController()
    const modelContext = (document as unknown as { modelContext?: ModelContext }).modelContext

    if (modelContext?.registerTool) {
      modelContext.registerTool(
        {
        name: ORDER_QUERY_TOOL,
        title: '查询订单',
      description: '【订单管理工具】查询电商订单列表，可按订单号、客户姓名或状态筛选，不传参数则返回全部订单。',
      inputSchema: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: '按订单号精确查询，如 ORD-5X9A2B' },
          customerName: { type: 'string', description: '按客户姓名模糊查询' },
          status: {
            type: 'string',
            enum: ['Pending', 'Shipped', 'Delivered', 'Refunded', 'Cancelled'],
            description: '按订单状态筛选'
          }
        }
      },
      execute: async ({
        orderId,
        customerName,
        status
      }: {
        orderId?: string
        customerName?: string
        status?: string
      }) => {
        let result = orderList as OrderItem[]
        if (orderId) result = result.filter((o) => o.id.toLowerCase().includes(orderId.toLowerCase()))
        if (customerName)
          result = result.filter((o) => o.customerName.toLowerCase().includes(customerName.toLowerCase()))
        if (status) result = result.filter((o) => o.status === status)

        // 同步更新页面筛选框
        if (status) setFilterStatus(status)
        if (orderId || customerName) setSearchText(orderId ?? customerName ?? '')

        const text =
          result.length === 0
            ? '未找到符合条件的订单。'
            : `找到 ${result.length} 条订单：\n${result
                .map(
                  (o) =>
                    `- ${o.id}｜${o.customerName}｜${o.productName}｜¥${o.totalAmount}｜${statusLabelMap[o.status]}`
                )
                .join('\n')}`
        return { content: [{ type: 'text', text }] }
      }
    },
    { signal: controller.signal }
  )

    modelContext.registerTool(
      {
        name: ORDER_DETAIL_TOOL,
        title: '订单详情',
      description: '【订单管理工具】根据订单号获取完整的订单详情，包括商品、金额、物流、收货人信息等。',
      inputSchema: {
        type: 'object',
        properties: {
          orderId: { type: 'string', description: '要查询的订单号，如 ORD-5X9A2B' }
        },
        required: ['orderId']
      },
      execute: async ({ orderId }: { orderId: string }) => {
        const order = orderList.find((o) => o.id === orderId)
        if (!order) {
          return { content: [{ type: 'text', text: `未找到订单号为 ${orderId} 的订单。` }] }
        }
        // 高亮该订单
        setSearchText(orderId)
        const text = `订单详情（${orderId}）：
- 客户：${order.customerName}（${order.customerPhone}）
- 商品：${order.productName} × ${order.quantity}
- 金额：¥${order.totalAmount.toLocaleString()}
- 支付：${order.paymentMethod}
- 状态：${statusLabelMap[order.status]}
- 下单时间：${order.createdAt}${order.shippedAt ? `\n- 发货时间：${order.shippedAt}` : ''}`
        return { content: [{ type: 'text', text }] }
      }
    },
    { signal: controller.signal }
  )
    }

    return () => {
      controller.abort()
    }
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

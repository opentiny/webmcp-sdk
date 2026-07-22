import { Component, OnInit, OnDestroy, computed, signal } from '@angular/core'
import type { ModelContext } from '@mcp-b/webmcp-types'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { orderList, type OrderItem } from '../../../mock'

const ORDER_QUERY_TOOL = 'order_query'
const ORDER_DETAIL_TOOL = 'order_detail'

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})
export class OrdersComponent implements OnInit, OnDestroy {
  orderList = orderList
  searchText = signal('')
  filterStatus = signal('')
  private abortController = new AbortController()

  statusOptions = [
    { label: '待发货', value: 'Pending' },
    { label: '已发货', value: 'Shipped' },
    { label: '已签收', value: 'Delivered' },
    { label: '已退款', value: 'Refunded' },
    { label: '已取消', value: 'Cancelled' }
  ]

  statusLabelMap: Record<string, string> = {
    Pending: '待发货',
    Shipped: '已发货',
    Delivered: '已签收',
    Refunded: '已退款',
    Cancelled: '已取消'
  }

  filteredOrders = computed(() => {
    return this.orderList().filter((o: OrderItem) => {
      const matchStatus = !this.filterStatus() || o.status === this.filterStatus()
      const searchLower = this.searchText().toLowerCase()
      const matchSearch =
        !this.searchText() ||
        o.id.toLowerCase().includes(searchLower) ||
        o.customerName.toLowerCase().includes(searchLower)
      return matchStatus && matchSearch
    })
  })

  ngOnInit() {
    const modelContext =
      (document as unknown as { modelContext?: ModelContext }).modelContext
    if (modelContext?.registerTool) {
      modelContext.registerTool(
        {
          name: ORDER_QUERY_TOOL,

          title: '查询订单',
          description: '【订单管理工具】查询电商订单列表，可按订单号、客户姓名或状态筛选，不传参数则返回全部订单。',
          inputSchema: {
            type: 'object',
            properties: {
              orderId: {
                type: 'string',
                description: '订单号（可选）'
              },
              customerName: {
                type: 'string',
                description: '客户姓名（可选）'
              },
              status: {
                type: 'string',
                enum: ['Pending', 'Shipped', 'Delivered', 'Refunded', 'Cancelled'],
                description: '订单状态（可选）'
              }
            }
          },
          execute: async (params: { orderId?: string; customerName?: string; status?: string }) => {
            let result = this.orderList() as OrderItem[]
            if (params.orderId)
              result = result.filter((o) => o.id.toLowerCase().includes(params.orderId!.toLowerCase()))
            if (params.customerName)
              result = result.filter((o) => o.customerName.toLowerCase().includes(params.customerName!.toLowerCase()))
            if (params.status) result = result.filter((o) => o.status === params.status)

            // 同步更新页面筛选框
            if (params.status) this.filterStatus.set(params.status)
            if (params.orderId || params.customerName) this.searchText.set(params.orderId ?? params.customerName ?? '')

            const text =
              result.length === 0
                ? '未找到符合条件的订单。'
                : `找到 ${result.length} 条订单：\n${result
                    .map(
                      (o) =>
                        `- ${o.id}｜${o.customerName}｜${o.productName}｜¥${o.totalAmount}｜${this.statusLabelMap[o.status]}`
                    )
                    .join('\n')}`
            return { content: [{ type: 'text', text }] }
          }
        },
        { signal: this.abortController.signal }
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
          execute: async (params: { orderId: string }) => {
            const order = this.orderList().find((o: OrderItem) => o.id === params.orderId)
            if (!order) {
              return { content: [{ type: 'text', text: `未找到订单号为 ${params.orderId} 的订单。` }] }
            }
            // 高亮该订单
            this.searchText.set(params.orderId)
            const text = `订单详情（${params.orderId}）：
- 客户：${order.customerName}（${order.customerPhone}）
- 商品：${order.productName} × ${order.quantity}
- 金额：¥${order.totalAmount.toLocaleString()}
- 支付：${order.paymentMethod}
- 状态：${this.statusLabelMap[order.status]}
- 下单时间：${order.createdAt}${order.shippedAt ? `\n- 发货时间：${order.shippedAt}` : ''}`
            return { content: [{ type: 'text', text }] }
          }
        },
        { signal: this.abortController.signal }
      )
    }
  }

  ngOnDestroy() {
    this.abortController.abort()
  }
}

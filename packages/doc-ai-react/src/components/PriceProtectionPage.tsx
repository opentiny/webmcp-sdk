import { useEffect, useRef, useState } from 'react'
import type { ModelContext } from '@mcp-b/webmcp-types'
import { priceProtectionList, type PriceProtectionOrder } from '../mock'
import PriceProtectionModal, { type PriceProtectionModalRef, type PriceProtectionModalProps } from './PriceProtectionModal'

export function Component() {
  const modalRef = useRef<PriceProtectionModalRef>(null)
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

    const PRICE_PROTECTION_QUERY_TOOL = 'price-protection-query'
    const PRICE_PROTECTION_REVIEW_TOOL = 'price-protection-review'
    const PRICE_PROTECTION_DETAIL_TOOL = 'price-protection-detail'
    const ADD_PRICE_PROTECTION_TOOL = 'add_price_protection'
    const controller = new AbortController()
    const modelContext = (document as unknown as { modelContext?: ModelContext }).modelContext

    if (modelContext?.registerTool) {
      modelContext.registerTool(
        {
      name: PRICE_PROTECTION_QUERY_TOOL,
      title: '查询价保申请',
      description: '查询商品价保申请列表，可按状态筛选（pending/approved/rejected/expired），不传 status 则返回全部',
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'approved', 'rejected', 'expired'],
            description: '申请状态，不传则查询全部'
          }
        }
      },
      execute: async ({ status }: { status?: string }) => {
        const list = status
          ? priceProtectionList.filter((o) => o.status.toLowerCase() === status.toLowerCase())
          : priceProtectionList
        const text = `查询到 ${list.length} 条价保申请：\n${JSON.stringify(list, null, 2)}`
        return { content: [{ type: 'text', text }] }
      }
    },
    { signal: controller.signal }
  )

    modelContext.registerTool(
      {
      name: PRICE_PROTECTION_REVIEW_TOOL,
      title: '审批价保申请',
      description: '对待审核的价保申请进行审批，支持通过（approve）或拒绝（reject），可附加备注',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            pattern: '^PP-\\d{8}-\\d{2}$',
            description: '价保申请 ID'
          },
          action: {
            type: 'string',
            enum: ['approve', 'reject'],
            description: '审批动作：approve=通过，reject=拒绝'
          },
          remark: { type: 'string', description: '审批备注（可选）' }
        },
        required: ['id', 'action']
      },
      execute: async ({
        id,
        action,
        remark
      }: {
        id: string | number
        action: 'approve' | 'reject'
        remark?: string
      }) => {
        const order = priceProtectionList.find((o) => o.id === String(id))
        if (!order) {
          return { content: [{ type: 'text', text: `未找到 ID 为 ${id} 的价保申请。` }] }
        }
        if (order.status !== 'Pending') {
          return { content: [{ type: 'text', text: `申请单状态为「${order.status}」，无法重复审核。` }] }
        }
        order.status = action === 'approve' ? 'Approved' : 'Rejected'
        if (remark) {
          order.remark = remark
        }
        const remarkText = remark ? `，备注：${remark}` : ''
        return {
          content: [
            { type: 'text', text: `价保申请 ${order.id} 已${action === 'approve' ? '通过' : '拒绝'}${remarkText}。` }
          ]
        }
      }
    },
    { signal: controller.signal }
  )

    modelContext.registerTool(
      {
      name: PRICE_PROTECTION_DETAIL_TOOL,
      title: '价保申请详情',
      description: '根据申请 ID 获取单条价保申请的完整详情',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            pattern: '^PP-\\d{8}-\\d{2}$',
            description: '价保申请 ID'
          }
        },
        required: ['id']
      },
      execute: async ({ id }: { id: string | number }) => {
        const order = priceProtectionList.find((o) => o.id === String(id))
        const text = order ? `价保申请详情：\n${JSON.stringify(order, null, 2)}` : `未找到 ID 为 ${id} 的价保申请。`
        return { content: [{ type: 'text', text }] }
      }
    },
    { signal: controller.signal }
  )

    modelContext.registerTool(
      {
      name: ADD_PRICE_PROTECTION_TOOL,
      title: '申请价保补偿',
      description:
        '【价保监控工具】帮助电商管理员处理顾客因降价提出的补差价请求（价保申请）。注意：在调用本工具前，你必须先使用 get_skill_content 工具读取相关的技能文档，严禁凭空构造参数或跳过业务规则直接调用。',
      inputSchema: {
        type: 'object',
        properties: {
          isSkillRead: {
            type: 'boolean',
            description:
              '是否已经通过 get_skill_content 读取过技能文档？必须阅读文档后才允许传 true。如果你还没有阅读文档，严禁调用此工具。'
          },
          customerName: { type: 'string', description: '提出价保申请的顾客姓名' },
          orderId: { type: 'string', description: '需要价保补偿的原订单编号' },
          amount: { type: 'number', description: '申请补偿的差价金额' },
          reason: { type: 'string', description: '顾客申请价保的原因' }
        },
        required: ['isSkillRead', 'customerName', 'orderId', 'amount', 'reason']
      },
      execute: async (params: PriceProtectionModalProps) => {
        if (!params.isSkillRead) {
          return {
            content: [
              {
                type: 'text',
                text: '错误：在调用此工具前，你必须先使用 get_skill_content 读取相关技能文档。请先阅读技能文档后再重新调用。'
              }
            ]
          }
        }
        if (!modalRef.current) {
          return { content: [{ type: 'text', text: '错误：价保弹窗未加载，当前页面可能已被销毁。' }] }
        }
        const result = await modalRef.current.openModal(params)
        return { content: [{ type: 'text', text: result }] }
      }
    },
    { signal: controller.signal }
  )
    }

    return () => {
      controller.abort()
    }
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

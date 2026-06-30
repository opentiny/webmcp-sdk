import { useEffect, useRef, useState } from 'react'
import type { ModelContext } from '@mcp-b/webmcp-types'
import { inventoryList, type InventoryItem } from '../mock'
import InventoryModal, { type InventoryModalRef, type InventoryModalProps } from './InventoryModal'

export function Component() {
  const modalRef = useRef<InventoryModalRef>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])

  useEffect(() => {
    // 初始化时复制数据，避免直接修改 mock 数据
    setInventory([...inventoryList])

    const ADD_INVENTORY_TOOL = 'add_inventory'
    const controller = new AbortController()
    const modelContext = (document as unknown as { modelContext?: ModelContext }).modelContext || 
                         (navigator as unknown as { modelContext?: ModelContext }).modelContext

    if (modelContext?.registerTool) {
      modelContext.registerTool(
        {
          name: ADD_INVENTORY_TOOL,
          description: '【入库管理工具】帮助电商管理员将采购的商品新增入库存系统中',
          inputSchema: {
            type: 'object',
            properties: {
              productName: { type: 'string', description: '商品名称或型号，如：iPhone 15 Pro Max' },
              quantity: { type: 'number', description: '要入库的数量，必须大于0' },
              warehouse: { type: 'string', description: '入库存放的仓库名称，如：北京一号仓' }
            },
            required: ['productName', 'quantity', 'warehouse']
          },
          execute: async (params: InventoryModalProps) => {
            if (!modalRef.current) {
              return { content: [{ type: 'text', text: '错误：入库弹窗未加载，当前页面可能已被销毁。' }] }
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
    modalRef.current?.openModal({ productName: '', quantity: 1, warehouse: '' }).then((res: string) => {
      console.log(res)
      // 更新列表显示
      setInventory([...inventoryList])
    })
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'In Stock':
        return '库存充足'
      case 'Low Stock':
        return '库存预警'
      case 'Out of Stock':
        return '缺货'
      default:
        return status
    }
  }

  return (
    <div className="inventory-view">
      <div className="page-header">
        <div className="header-left">
          <h2>库存管理</h2>
          <p className="subtitle">管理商品库存，支持 AI 辅助快速建仓与数量更新</p>
        </div>
        <div className="header-right">
          <button className="btn-add" onClick={handleManualAdd}>
            ＋ 手动新增入库
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="tiny-grid">
          <thead>
            <tr>
              <th width="60">#</th>
              <th width="120">库存单号</th>
              <th width="180">商品名称</th>
              <th width="160">SKU 编码</th>
              <th width="140">仓库</th>
              <th width="100" align="right">
                在库数量
              </th>
              <th width="120">状态</th>
              <th width="180">最后更新时间</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.id}</td>
                <td>{item.productName}</td>
                <td>{item.sku}</td>
                <td>{item.warehouse}</td>
                <td align="right">
                  <strong>{item.quantity}</strong>
                </td>
                <td>
                  <span className={`status-tag ${item.status.replace(/ /g, '-').toLowerCase()}`}>
                    {getStatusLabel(item.status)}
                  </span>
                </td>
                <td>{item.lastUpdated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InventoryModal ref={modalRef} />
    </div>
  )
}

export default Component

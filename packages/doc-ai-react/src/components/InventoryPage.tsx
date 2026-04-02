import { useEffect, useRef, useState } from 'react'
import { inventoryList, type InventoryItem } from '../mock'
import InventoryModal from './InventoryModal'

const ADD_INVENTORY_TOOL = 'add_inventory'

export function Component() {
  const modalRef = useRef<any>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])

  useEffect(() => {
    // 初始化时复制数据，避免直接修改 mock 数据
    setInventory([...inventoryList])
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

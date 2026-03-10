import { useState, useEffect } from 'react'
import { registerPageTool } from '@opentiny/next-sdk'
import productsData from './data/products.json'
import './ComprehensivePage.css'

type Product = {
  id: number
  name: string
  price: number
  stock: number
  category: 'phones' | 'laptops' | 'tablets' | string
  status: 'on' | 'off' | string
  description?: string
  image?: string
}

export default function ComprehensivePage() {
  const [products, setProducts] = useState<Product[]>(productsData as Product[])

  const categoryLabels: Record<string, string> = {
    phones: '手机',
    laptops: '笔记本',
    tablets: '平板'
  }

  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null)
  const [editingValue, setEditingValue] = useState('')

  useEffect(() => {
    const cleanupPageTool = registerPageTool({
      handlers: {
        'product-guide': async ({ productId }: { productId: string }) => {
          const product = products.find((p) => String(p.id) === productId)
          const text = product
            ? `产品信息：${JSON.stringify(product, null, 2)}`
            : `未找到产品 ID 为 ${productId} 的商品`
          return { content: [{ type: 'text', text }] }
        }
      }
    })

    return () => {
      cleanupPageTool()
    }
  }, [products])

  const startEdit = (id: number, field: string, value: string | number) => {
    setEditingCell({ id, field })
    setEditingValue(String(value))
  }

  const saveEdit = (product: Product) => {
    if (!editingCell) return
    const { field } = editingCell
    const updatedProducts = products.map((p) => {
      if (p.id === editingCell.id) {
        const updated = { ...p }
        if (field === 'price' || field === 'stock') {
          ;(updated as Record<string, unknown>)[field] = Number(editingValue)
        } else {
          ;(updated as Record<string, unknown>)[field] = editingValue
        }
        return updated
      }
      return p
    })
    setProducts(updatedProducts)
    setEditingCell(null)
  }

  const cancelEdit = () => {
    setEditingCell(null)
  }

  const isEditing = (id: number, field: string) => {
    return editingCell?.id === id && editingCell?.field === field
  }

  const toggleStatus = (product: Product) => {
    const updatedProducts = products.map((p) =>
      p.id === product.id ? { ...p, status: p.status === 'on' ? 'off' : 'on' } : p
    )
    setProducts(updatedProducts)
  }

  return (
    <div className="products-page">
      <div className="page-header">
        <h3>商品管理</h3>
      </div>
      <div className="page-content">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>#</th>
              <th>商品名称</th>
              <th>价格</th>
              <th>库存</th>
              <th>分类</th>
              <th>状态</th>
              <th style={{ width: '120px' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, i) => (
              <tr key={product.id}>
                <td>{i + 1}</td>
                <td>
                  {isEditing(product.id, 'name') ? (
                    <input
                      className="cell-input"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => saveEdit(product)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(product)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      className="editable-cell"
                      onClick={() => startEdit(product.id, 'name', product.name)}>
                      {product.name}
                    </button>
                  )}
                </td>
                <td>
                  {isEditing(product.id, 'price') ? (
                    <input
                      className="cell-input"
                      type="number"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => saveEdit(product)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(product)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="editable-cell"
                      onClick={() => startEdit(product.id, 'price', product.price)}>
                      ¥{product.price}
                    </button>
                  )}
                </td>
                <td>
                  {isEditing(product.id, 'stock') ? (
                    <input
                      className="cell-input"
                      type="number"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => saveEdit(product)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(product)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="editable-cell"
                      onClick={() => startEdit(product.id, 'stock', product.stock)}>
                      {product.stock}
                    </button>
                  )}
                </td>
                <td>{categoryLabels[product.category] ?? product.category}</td>
                <td>
                  <span className={`tag ${product.status === 'on' ? 'tag-success' : 'tag-warning'}`}>
                    {product.status === 'on' ? '上架' : '下架'}
                  </span>
                </td>
                <td>
                  <button
                    className={`action-btn ${product.status === 'on' ? 'btn-danger' : 'btn-success'}`}
                    onClick={() => toggleStatus(product)}>
                    {product.status === 'on' ? '下架' : '上架'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import productsData from './data/products.json'
import priceData from './data/priceProtection.json'
import './HomePage.css'

type Product = {
  id: number
  name: string
  price: number
  stock: number
  category: string
  status: 'on' | 'off' | string
}

type PriceRecord = {
  id: number
  orderId: string
  productName: string
  diffPrice: number
  status: string
}

export default function HomePage() {
  const navigate = useNavigate()

  const categoryLabels: Record<string, string> = {
    phones: '手机',
    laptops: '笔记本',
    tablets: '平板'
  }

  const stats = {
    total: productsData.length,
    on: productsData.filter((p: Product) => p.status === 'on').length,
    off: productsData.filter((p: Product) => p.status === 'off').length,
    categories: new Set(productsData.map((p: Product) => p.category)).size
  }

  const categoryStats = (() => {
    const map: Record<string, number> = {}
    productsData.forEach((p: Product) => {
      map[p.category] = (map[p.category] || 0) + 1
    })
    return Object.entries(map).map(([value, count]) => ({
      value,
      label: categoryLabels[value] ?? value,
      count
    }))
  })()

  const recentProducts = [...(productsData as Product[])].sort((a, b) => b.id - a.id).slice(0, 5)

  const priceStats = {
    pending: priceData.filter((r: PriceRecord) => r.status === 'pending').length,
    totalDiff: priceData
      .filter((r: PriceRecord) => r.status === 'pending')
      .reduce((sum: number, r: PriceRecord) => sum + r.diffPrice, 0)
  }

  const pendingPriceRecords = (priceData as PriceRecord[]).filter((r) => r.status === 'pending').slice(0, 4)

  const getCategoryBarWidth = (count: number): string => {
    return stats.total > 0 ? `${(count / stats.total) * 100}%` : '0%'
  }

  return (
    <div className="home-page">
      <div className="page-header">
        <div className="header-title">
          <h2>商品管理系统</h2>
          <p>统一管理您的商品信息，支持 AI 助手智能操作</p>
        </div>
        <div className="header-actions">
          <button onClick={() => navigate('/comprehensive')} className="btn-primary">
            商品管理
          </button>
          <button onClick={() => navigate('/price-protection')} className="btn-secondary">
            价保管理
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">📦</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">商品总数</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon on">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.on}</div>
            <div className="stat-label">上架中</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon off">⏸</div>
          <div className="stat-info">
            <div className="stat-value">{stats.off}</div>
            <div className="stat-label">已下架</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon category">🗂</div>
          <div className="stat-info">
            <div className="stat-value">{stats.categories}</div>
            <div className="stat-label">商品分类</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon price-pending">🛡</div>
          <div className="stat-info">
            <div className="stat-value">{priceStats.pending}</div>
            <div className="stat-label">价保待审核</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon price-total">💰</div>
          <div className="stat-info">
            <div className="stat-value">¥{priceStats.totalDiff}</div>
            <div className="stat-label">待退差价总额</div>
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="panel">
          <div className="panel-header">分类概览</div>
          <div className="category-list">
            {categoryStats.map((cat) => (
              <div key={cat.value} className="category-item">
                <span className="category-name">{cat.label}</span>
                <div className="category-bar-wrap">
                  <div className="category-bar" style={{ width: getCategoryBarWidth(cat.count) }}></div>
                </div>
                <span className="category-count">{cat.count} 件</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            近期商品
            <button onClick={() => navigate('/comprehensive')} className="panel-link">
              查看全部 →
            </button>
          </div>
          <div className="product-list">
            {recentProducts.map((product) => (
              <div key={product.id} className="product-item">
                <div className="product-info">
                  <div className="product-name">{product.name}</div>
                  <div className="product-meta">
                    {categoryLabels[product.category] ?? product.category} · ¥{product.price}
                  </div>
                </div>
                <span className={`status-badge ${product.status}`}>{product.status === 'on' ? '上架' : '下架'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            价保申请
            <button onClick={() => navigate('/price-protection')} className="panel-link">
              查看全部 →
            </button>
          </div>
          <div className="product-list">
            {pendingPriceRecords.length > 0 ? (
              pendingPriceRecords.map((record) => (
                <div key={record.id} className="product-item">
                  <div className="product-info">
                    <div className="product-name">{record.productName}</div>
                    <div className="product-meta">
                      {record.orderId} · 可退 ¥{record.diffPrice}
                    </div>
                  </div>
                  <span className="status-badge pending">待审核</span>
                </div>
              ))
            ) : (
              <div className="empty-tip">暂无待审核申请</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

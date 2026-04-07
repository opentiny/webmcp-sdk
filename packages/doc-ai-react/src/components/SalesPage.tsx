import { useEffect, useState } from 'react'

export function Component() {
  const [activeRange, setActiveRange] = useState('30days')

  useEffect(() => {
    const SALES_RECORD_QUERY_TOOL = 'sales_record_query'
    // 按时间范围的模拟销售摘要数据
    const salesSummary = {
      '7days': { totalSales: 28400, orders: 312, returnRate: '1.8%' },
      '30days': { totalSales: 128450, orders: 1342, returnRate: '2.4%' },
      'year': { totalSales: 1542600, orders: 16080, returnRate: '2.1%' }
    }

    navigator.modelContext.registerTool({
      name: SALES_RECORD_QUERY_TOOL,
      title: '查询商品销售记录',
      description: '【销售数据展示工具】帮助管理员查询最近一段时间的商品销售趋势、统计图表数据',
      inputSchema: {
        type: 'object',
        properties: {
          timeRange: {
            type: 'string',
            enum: ['7days', '30days', 'year'],
            description: '查询时间范围'
          }
        }
      },
      execute: async ({ timeRange }: { timeRange?: '7days' | '30days' | 'year' }) => {
        const range = timeRange ?? '30days'
        setActiveRange(range)
        const s = salesSummary[range]
        const label = range === '7days' ? '近7天' : range === '30days' ? '近30天' : '过去一年'
        const text = `${label}销售数据：\n- 总销售额：¥${s.totalSales.toLocaleString()}\n- 总订单数：${s.orders}\n- 退货率：${s.returnRate}\n\n详细图表已更新，可在左侧查看。`
        return { content: [{ type: 'text', text }] }
      }
    })

    return () => {
      navigator.modelContext.unregisterTool(SALES_RECORD_QUERY_TOOL)
    }
  }, [])
  return (
    <div className="sales-container">
      <div className="header">
        <h2>商品销售记录</h2>
        <p className="subtitle">近 30 天销售趋势与数据总览</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg,#6366f1,#3b82f6)' }}>
            💰
          </div>
          <div className="stat-body">
            <div className="stat-label">总销售额</div>
            <div className="stat-value">¥128,450</div>
            <div className="stat-trend positive">▲ 12.5% 较上月</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg,#0ea5e9,#06b6d4)' }}>
            📦
          </div>
          <div className="stat-body">
            <div className="stat-label">总订单数</div>
            <div className="stat-value">1,342 单</div>
            <div className="stat-trend positive">▲ 8.2% 较上月</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg,#10b981,#34d399)' }}>
            🛒
          </div>
          <div className="stat-body">
            <div className="stat-label">客单价</div>
            <div className="stat-value">¥95.7</div>
            <div className="stat-trend positive">▲ 3.8% 较上月</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg,#f59e0b,#fbbf24)' }}>
            ↩️
          </div>
          <div className="stat-body">
            <div className="stat-label">退货率</div>
            <div className="stat-value">2.4%</div>
            <div className="stat-trend negative">▼ 0.5% 较上月</div>
          </div>
        </div>
      </div>

      <div className="charts-section">
        <div className="chart-card wide">
          <div className="chart-header">
            <h3>销售额趋势</h3>
            <div className="tab-group">
              <span
                className={`tab ${activeRange === '7days' ? 'active' : ''}`}
                onClick={() => setActiveRange('7days')}>
                近 7 天
              </span>
              <span
                className={`tab ${activeRange === '30days' ? 'active' : ''}`}
                onClick={() => setActiveRange('30days')}>
                近 30 天
              </span>
              <span className={`tab ${activeRange === 'year' ? 'active' : ''}`} onClick={() => setActiveRange('year')}>
                全年
              </span>
            </div>
          </div>
          <div className="chart-placeholder">图表区域（可使用 echarts/recharts 等库）</div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>各品类销售占比</h3>
          </div>
          <div className="chart-placeholder">饼图区域</div>
        </div>
      </div>

      <div className="table-section">
        <div className="section-header">
          <h3>热销商品排行</h3>
          <span className="badge">Top 5</span>
        </div>
        <table className="rank-table">
          <thead>
            <tr>
              <th>#</th>
              <th>商品名称</th>
              <th>品类</th>
              <th>销售量</th>
              <th>销售额</th>
              <th>占比</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <span className="rank-badge top">1</span>
              </td>
              <td className="product-name">iPhone 15 Pro Max 256G</td>
              <td>
                <span className="category-tag">手机数码</span>
              </td>
              <td>312</td>
              <td className="amount">¥31,188</td>
              <td>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '24%', background: '#6366f1' }} />
                </div>
                <span className="ratio-text">24%</span>
              </td>
            </tr>
            <tr>
              <td>
                <span className="rank-badge top">2</span>
              </td>
              <td className="product-name">MacBook Pro M3 Max 1T</td>
              <td>
                <span className="category-tag">电脑办公</span>
              </td>
              <td>88</td>
              <td className="amount">¥21,999</td>
              <td>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '17%', background: '#3b82f6' }} />
                </div>
                <span className="ratio-text">17%</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Component

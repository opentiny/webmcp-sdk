import { Outlet, Link } from 'react-router-dom'
import './App.css'

// 布局组件
function AppLayout() {
  return (
    <div className="app-container">
      <div className="app-left">
        <header className="app-header">
          <div className="logo">
            <div className="logo-icon">
              <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                <circle cx="14" cy="9" r="3" fill="white" opacity="0.95" />
                <circle cx="8" cy="19" r="2.2" fill="white" opacity="0.9" />
                <circle cx="20" cy="19" r="2.2" fill="white" opacity="0.9" />
                <line x1="14" y1="12" x2="9" y2="17" stroke="white" strokeWidth="1.4" opacity="0.7" />
                <line x1="14" y1="12" x2="19" y2="17" stroke="white" strokeWidth="1.4" opacity="0.7" />
              </svg>
            </div>
            <h1>电商智能管理系统</h1>
          </div>
          <div className="header-actions">
            <span className="user-greeting">欢迎，管理员</span>
            <div className="avatar">管</div>
          </div>
        </header>

        <div className="app-body">
          <aside className="app-sidebar">
            <nav className="nav-menu">
              <Link to="/" className="nav-item">
                概览大盘
              </Link>
              <Link to="/inventory" className="nav-item">
                库存管理
              </Link>
              <Link to="/price-protection" className="nav-item">
                价保监控
              </Link>
              <Link to="/orders" className="nav-item">
                订单管理
              </Link>
              <Link to="/sales" className="nav-item">
                商品销售记录
              </Link>
              <Link to="/finance" className="nav-item">
                财务管理
              </Link>
            </nav>

            <div className="sidebar-footer">
              <div className="sys-status">
                <div className="status-dot"></div>
                <span>系统运行正常</span>
              </div>
            </div>
          </aside>

          <main className="app-main">
            <div className="router-wrapper">
              {/* 路由内容将通过 Outlet 渲染 */}
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default AppLayout

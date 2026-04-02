import { RouterProvider } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

import { createMcpServer } from './mcp-servers'
import { router } from './router'
import './App.css'

function App() {
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  useEffect(() => {
    // 启动 MCP Server
    createMcpServer()
  }, [])

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
              <a href="/" className="nav-item">
                概览大盘
              </a>
              <a href="/inventory" className="nav-item">
                库存管理
              </a>
              <a href="/price-protection" className="nav-item">
                价保监控
              </a>
              <a href="/orders" className="nav-item">
                订单管理
              </a>
              <a href="/sales" className="nav-item">
                商品销售记录
              </a>
              <a href="/finance" className="nav-item">
                财务管理
              </a>
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
              <RouterProvider router={router}></RouterProvider>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default App

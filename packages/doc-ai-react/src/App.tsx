import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { setNavigator } from '@opentiny/next-sdk'
import HomePage from './components/HomePage'
import ComprehensivePage from './components/ComprehensivePage'
import PriceProtectionPage from './components/PriceProtectionPage'
import { createMcpServer } from './mcp-servers'
import './App.css'

// 路由管理器组件 - 在 Router 上下文中设置导航器
function RouterManager() {
  const navigate = useNavigate()

  useEffect(() => {
    // 设置导航器
    setNavigator(async (route) => {
      debugger
      await navigate(route)
    })
    // 启动 MCP Server（创建 MessageChannel 服务端并等待 iframe 连接）
    createMcpServer()
  }, [navigate])

  return null
}

function App() {
  return (
    <BrowserRouter>
      {/* 路由管理器 - 设置全局导航器 */}
      <RouterManager />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/comprehensive" element={<ComprehensivePage />} />
        <Route path="/price-protection" element={<PriceProtectionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

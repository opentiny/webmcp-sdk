import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { setNavigator } from '@opentiny/next-sdk'
import HomePage from './components/HomePage'
import { createMcpServer } from './mcp-servers'
import './App.css'

// 路由管理器组件 - 在 Router 上下文中设置导航器
function RouterManager() {
  const navigate = useNavigate()

  useEffect(() => {
    // 设置导航器
    setNavigator(async (route) => {
      await navigate(route)
    })
    // 启动 MCP Server（创建 MessageChannel 服务端并等待 iframe 连接）
    createMcpServer()
  }, [])

  return null
}

function App() {
  return (
    <BrowserRouter>
      {/* 路由管理器 - 设置全局导航器 */}
      <RouterManager />
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

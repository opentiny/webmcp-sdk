import { createRoot } from 'react-dom/client'
import { initializeBuiltinWebMCP, setNavigator } from '@opentiny/next-sdk'
import './index.css'
import App from './App.tsx'
import { router } from './router.tsx'
import { createMcpServer } from './mcp-servers/index.ts'

// 1. 注册导航器，供 page-tool-bridge 在工具调用时自动跳转到对应路由
setNavigator(async (route) => {
  await router.navigate(route)
})

// 2. 激活浏览器内置 WebMCP 服务 (含低版本浏览器 Polyfill)
initializeBuiltinWebMCP()

// 3. 本地 MCP Server 启动：失败则直接抛出（核心功能）
await createMcpServer()

// 4. 渲染根组件
createRoot(document.getElementById('root')!).render(<App />)

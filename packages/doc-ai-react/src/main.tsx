import { createRoot } from 'react-dom/client'
import { initializeBuiltinWebMCP } from '@opentiny/next-sdk'
import './index.css'
import App from './App.tsx'
import { createMcpServer } from './mcp-servers/index.ts'

// 1. 激活浏览器内置 WebMCP 服务 (含低版本浏览器 Polyfill)
initializeBuiltinWebMCP()

// 2. 注册自配导航工具等 MCP 能力
await createMcpServer()

// 3. 渲染根组件
createRoot(document.getElementById('root')!).render(<App />)

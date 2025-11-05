import { WebMcpServer, ContentScriptServerTransport, z } from '@opentiny/next-sdk'
import getMcpToolByHostname from '../mcp-servers'

const getCookieData = () => {
  const cookie = document.cookie
  const cookieData = cookie.split('; ').reduce(
    (acc, cookie) => {
      const [key, value] = cookie.split('=')
      acc[key] = value
      return acc
    },
    {} as Record<string, string>
  )
  return cookieData
}

export const createMcpServer = async (tabId: number) => {
  const serverInfo = {
    name: 'demo-server',
    version: '1.0.0'
  }

  const cookieData = getCookieData()
  const server = new WebMcpServer(serverInfo)

  // 获取当前页面域名
  const hostname = window.location.hostname
  const mcpTool = getMcpToolByHostname(hostname)

  // 如果找到匹配的工具配置，则注册
  if (mcpTool) {
    console.log('找到匹配的 MCP 工具配置，正在注册...')
    mcpTool({ server, z, cookie: cookieData })
  } else {
    console.log('当前域名没有配置 MCP 工具')
  }

  const _sessionId = localStorage.getItem('mcp-sessionId')
  const serverTransport = new ContentScriptServerTransport(_sessionId, tabId)
  const sessionId = serverTransport.sessionId
  localStorage.setItem('mcp-sessionId', sessionId)

  await server.connect(serverTransport)

  // 向插件注册server
  serverTransport.notifyRegistration(serverInfo)

  return sessionId
}

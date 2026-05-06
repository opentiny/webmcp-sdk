import { WebMcpClient } from '@opentiny/next-sdk'

const client = new WebMcpClient()

const SESSION_ID_KEY = 'web-agent-session-id'

const cachedSessionId: string | undefined = localStorage.getItem(SESSION_ID_KEY) ?? undefined

export const useWebAgentServer = async () => {
  // 使用公共注册函数，统一传递代理后的 server

  const { sessionId, transport } = await client.connect({
    sessionId: cachedSessionId,
    agent: true,
    builtin: true,
    url: 'http://localhost:3000/api/v1/webmcp/mcp'
  })

  transport.onclose = () => {
    console.log('WebMcpClient closed')
  }

  transport.onerror = (error) => {
    console.error('WebMcpClient error:', error)
  }
  console.log('WebMcpClient sessionId:', sessionId)
  // 持久化到 localStorage，刷新页面后可复用
  if (sessionId) {
    localStorage.setItem(SESSION_ID_KEY, sessionId)
  }
  return { sessionId }
}

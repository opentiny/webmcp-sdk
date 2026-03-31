import { WebMcpServer, WebMcpClient, withPageTools } from '@opentiny/next-sdk'
import { registerAllTools } from './common'

const rawServer = new WebMcpServer()
const client = new WebMcpClient()

// 用 withPageTools 包装后，registerTool 第三个参数支持路由配置对象
export const server = withPageTools(rawServer)

const SESSION_ID_KEY = 'web-agent-session-id'

const cachedSessionId: string | undefined = localStorage.getItem(SESSION_ID_KEY) ?? undefined

export const useWebAgentServer = async () => {
  // 使用公共注册函数，统一传递代理后的 server
  registerAllTools(server)

  const { sessionId, transport } = await client.connect({
    sessionId: cachedSessionId,
    agent: true,
    builtin: true,
    url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp'
  })


  // 持久化到 localStorage，刷新页面后可复用
  if (sessionId) {
    localStorage.setItem(SESSION_ID_KEY, sessionId)
  }
  return { sessionId }
}

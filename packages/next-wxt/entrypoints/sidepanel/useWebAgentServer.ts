import { WebMcpClient } from '@opentiny/next-sdk'
import { createMcpServer } from './mcpServer'

const AGENT_ROOT = 'https://agent.opentiny.design/api/v1/webmcp-trial/'

export const useWebAgentServer = async () => {
  const { clientTransport } = await createMcpServer()
  const client = new WebMcpClient(
    { name: 'mcp-web-client', version: '1.0.0' },
    { capabilities: { roots: { listChanged: true }, sampling: {}, elicitation: {} } }
  )

  await client.connect(clientTransport)

  const { sessionId: _sessionId } = await client.connect({
    url: AGENT_ROOT + 'mcp',
    sessionId: localStorage.getItem('mcp-sessionId') || undefined,
    agent: true,
    onError: (error: Error) => {
      console.error('Connect proxy error:', error)
    }
  })
  console.log('sessionId', _sessionId)
  localStorage.setItem('mcp-sessionId', _sessionId)
}

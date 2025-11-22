import { WebMcpClient } from '@opentiny/next-sdk'
import { createMcpServer } from './mcpServer'

const AGENT_ROOT = 'https://agent.opentiny.design/api/v1/webmcp-trial/'
const MAX_RETRY_COUNT = 5
const RETRY_DELAY = 3000

export const useWebAgentServer = async (): Promise<string> => {
  const { clientTransport } = await createMcpServer()
  const client = new WebMcpClient(
    { name: 'mcp-web-client', version: '1.0.0' },
    { capabilities: { roots: { listChanged: true }, sampling: {}, elicitation: {} } }
  )

  await client.connect(clientTransport)

  const connectType = import.meta.env.VITE_WEB_AGENT_CONNECT_TYPE
  let retryCount = 0
  let isReconnecting = false
  let latestSessionId: string | null = localStorage.getItem('mcp-sessionId')

  // 获取连接类型
  const getConnectType = (): 'sse' | 'socket' | 'stream' => {
    if (connectType === 'sse') return 'sse'
    if (connectType === 'socket') return 'socket'
    return 'stream'
  }

  // 创建连接配置
  const createConnectOptions = (onError: (error: Error) => void) => ({
    url: AGENT_ROOT + connectType,
    sessionId: localStorage.getItem('mcp-sessionId') || undefined,
    agent: true,
    type: getConnectType(),
    onError
  })

  // 处理连接成功
  const handleConnectSuccess = (sessionId: string, isRetry: boolean = false) => {
    console.log(`【useWebAgentServer】${isRetry ? '重连' : '连接'}成功，sessionId:`, sessionId)
    localStorage.setItem('mcp-sessionId', sessionId)
    latestSessionId = sessionId
    retryCount = 0
    isReconnecting = false
  }

  // 统一连接函数
  const connectToAgent = async (isRetry: boolean = false): Promise<string> => {
    try {
      const { sessionId } = await client.connect(createConnectOptions(handleError))
      handleConnectSuccess(sessionId, isRetry)
      return sessionId
    } catch (error) {
      console.error(`【useWebAgentServer】${isRetry ? '重连' : '连接'}失败:`, error)
      if (isRetry) {
        isReconnecting = false
      }
      reconnect()
      if (!isRetry) {
        throw error
      }
      return Promise.reject(error)
    }
  }

  // 重连函数
  const reconnect = async () => {
    if (isReconnecting || retryCount >= MAX_RETRY_COUNT) {
      if (retryCount >= MAX_RETRY_COUNT) {
        console.error(`【useWebAgentServer】已达到最大重连次数 ${MAX_RETRY_COUNT}，停止重连`)
      }
      return
    }

    isReconnecting = true
    retryCount++
    console.log(`【useWebAgentServer】准备第 ${retryCount} 次重连，延迟 ${RETRY_DELAY}ms`)

    setTimeout(() => {
      console.log(`【useWebAgentServer】开始第 ${retryCount} 次重连`)
      connectToAgent(true)
    }, RETRY_DELAY)
  }

  // 错误处理函数
  const handleError = (error: Error) => {
    console.error('【useWebAgentServer】Connect proxy error:', error)
    reconnect()
  }

  // 初始连接
  await connectToAgent(false)

  if (!latestSessionId) {
    throw new Error('【useWebAgentServer】未能获取有效的 sessionId')
  }

  return latestSessionId
}

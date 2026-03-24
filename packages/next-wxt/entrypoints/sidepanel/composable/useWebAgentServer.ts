import { WebMcpClient } from '@opentiny/next-sdk/core'
import { StorageKeys } from '../utils/storage-keys'
import { createMcpServer } from '../mcpServer'
import { AGENT_ROOT } from '../const'
import { getWebAgentUrl } from '../model-manage/model-storage'

const MAX_RETRY_COUNT = 5
const RETRY_DELAY = 3000

let _reconnectFn: (() => Promise<string>) | null = null

export const forceWebAgentReconnect = async () => {
  if (_reconnectFn) {
    return await _reconnectFn()
  }
  throw new Error('WebAgentServer 未初始化')
}

export const useWebAgentServer = async (): Promise<string> => {
  const getDynamicFinalAgentRoot = async () => {
    const customWebAgentUrl = await getWebAgentUrl()
    let finalAgentRoot = AGENT_ROOT
    if (customWebAgentUrl && customWebAgentUrl.trim() !== '') {
      try {
        const customUrl = new URL(customWebAgentUrl)
        if (customUrl.pathname && customUrl.pathname.length > 1) {
          finalAgentRoot = customWebAgentUrl.trim()
          if (!finalAgentRoot.endsWith('/')) {
            finalAgentRoot += '/'
          }
        } else {
          finalAgentRoot = finalAgentRoot.replace(/^https?:\/\/[^\/]+/, customUrl.origin)
        }
      } catch (err) {
        console.error('【useWebAgentServer】无效的自定义 URL 配置:', customWebAgentUrl)
        throw new Error(`无效的 Web-Agent 地址: ${customWebAgentUrl}`)
      }
    }
    return finalAgentRoot
  }

  const { clientTransport } = await createMcpServer()
  const client = new WebMcpClient(
    { name: 'mcp-web-client', version: '1.0.0' },
    { capabilities: { roots: { listChanged: true }, sampling: {}, elicitation: {} } }
  )

  await client.connect(clientTransport)

  const connectType = import.meta.env.VITE_WEB_AGENT_CONNECT_TYPE
  let retryCount = 0
  let isReconnecting = false
  // 从存储加载 sessionId（使用 browser.storage.local）
  const storageResult = await browser.storage.local.get(StorageKeys.MCP_SESSION_ID)
  let latestSessionId: string | null = (storageResult[StorageKeys.MCP_SESSION_ID] as string) || null

  // 获取连接类型
  const getConnectType = (): 'sse' | 'socket' | 'stream' => {
    if (connectType === 'sse') return 'sse'
    if (connectType === 'socket') return 'socket'
    return 'stream'
  }

  // 创建连接配置
  const createConnectOptions = (url: string, onError: (error: Error) => void) => ({
    url: url + connectType,
    sessionId: latestSessionId || undefined,
    agent: true,
    type: getConnectType(),
    onError
  })

  // 处理连接成功（使用 browser.storage.local 同步存储）
  const handleConnectSuccess = async (sessionId: string, isRetry: boolean = false) => {
    console.log(`【useWebAgentServer】${isRetry ? '重连' : '连接'}成功，sessionId:`, sessionId)
    await browser.storage.local.set({ [StorageKeys.MCP_SESSION_ID]: sessionId })
    latestSessionId = sessionId
    retryCount = 0
    isReconnecting = false
  }

  const setStatus = (status: 'connecting' | 'connected' | 'error') => {
    browser.storage.local.set({ [StorageKeys.MCP_STATUS]: status }).catch(() => {})
  }

  // 统一连接函数
  const connectToAgent = async (isRetry: boolean = false, forceFresh: boolean = false): Promise<string> => {
    if (!isRetry) setStatus('connecting')
    try {
      if (forceFresh) {
        latestSessionId = null
      }
      const finalUrl = await getDynamicFinalAgentRoot()
      const { sessionId } = await client.connect(createConnectOptions(finalUrl, handleError))
      await handleConnectSuccess(sessionId, isRetry)
      setStatus('connected')
      return sessionId
    } catch (error) {
      console.error(`【useWebAgentServer】${isRetry ? '重连' : '连接'}失败:`, error)
      if (isRetry) {
        isReconnecting = false
      }
      reconnect()
      if (!isRetry) {
        setStatus('error')
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
        setStatus('error')
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

  _reconnectFn = async () => {
    console.log('【useWebAgentServer】主动断开并重连...')
    isReconnecting = false
    retryCount = 0
    try {
      await client.close()
    } catch (e) {}
    
    await browser.storage.local.remove(StorageKeys.MCP_SESSION_ID)
    return await connectToAgent(false, true)
  }

  // 错误处理函数
  const handleError = (error: Error) => {
    console.error('【useWebAgentServer】Connect proxy error:', error)
    setStatus('error')
    reconnect()
  }

  // 初始连接
  await connectToAgent(false)

  if (!latestSessionId) {
    throw new Error('【useWebAgentServer】未能获取有效的 sessionId')
  }

  return latestSessionId
}

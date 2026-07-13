import { WebMcpClient } from '@opentiny/next-sdk/core'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { StorageKeys } from '../utils/storage-keys'
import { AGENT_ROOT } from '../const'
import { getWebAgentUrl, getConnectType } from '../model-manage/model-storage'
import { forceRefreshTools, setupLocalTools } from '../mcpServer'

const MAX_RETRY_COUNT = 5
const RETRY_DELAY = 3000

let _reconnectFn: (() => Promise<string>) | null = null
let _currentTransport: Transport | null = null
/** 记录待触发的自动重连计时器，手动重连前应先取消 */
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null

export const forceWebAgentReconnect = async () => {
  if (_reconnectFn) {
    return await _reconnectFn()
  }
  throw new Error('WebAgentServer 未初始化')
}

// 当页面切换或工具注入完成后，通知远程 Web Agent 刷新工具列表
const notifyToolsListChanged = async () => {
  if (_currentTransport) {
    try {
      console.log('【notifyToolsListChanged】发送 notifications/tools/list_changed');
      await _currentTransport.send({
        jsonrpc: '2.0',
        method: 'notifications/tools/list_changed'
      })
    } catch (e) {
      console.warn('【notifyToolsListChanged】发送失败:', e);
    }
  } else {
    console.warn('【notifyToolsListChanged】_currentTransport为空，无法发送通知');
  }
}

// 工具同步完成后才触发通知，确保 Cursor 来 tools/list 时 nativeCtx 已有最新工具
import { onPageToolsUpdated } from '../mcpServer'
onPageToolsUpdated.add(() => {
  notifyToolsListChanged()
})



export const useWebAgentServer = async (): Promise<string> => {
  // 无论是在 Background 还是 Sidepanel，都需要确保当前上下文的 modelContext 就绪
  setupLocalTools()

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

  const client = new WebMcpClient(
    { name: 'mcp-web-client', version: '1.0.0' },
    { capabilities: { roots: { listChanged: true }, sampling: {}, elicitation: {} } }
  )

  let retryCount = 0
  let isReconnecting = false
  // 从存储加载 sessionId
  const storageResult = await browser.storage.local.get(StorageKeys.MCP_SESSION_ID)
  let latestSessionId: string | null = (storageResult[StorageKeys.MCP_SESSION_ID] as string) || null

  // 创建连接配置
  const createConnectOptions = (url: string, type: 'sse' | 'socket' | 'stream', onError: (error: Error) => void) => {
    const baseUrl = url.endsWith('/') ? url : url + '/'
    const suffix = type === 'sse' ? 'sse' : 'mcp'
    return {
      url: baseUrl + suffix,
      sessionId: latestSessionId || undefined,
      agent: true,
      builtin: true,
      type,
      onError
    }
  }

  const handleConnectSuccess = async (sessionId: string, isRetry: boolean = false) => {
    console.log(`【useWebAgentServer】${isRetry ? '重连' : '连接'}成功`)
    await browser.storage.local.set({ [StorageKeys.MCP_SESSION_ID]: sessionId })
    latestSessionId = sessionId
    retryCount = 0
    isReconnecting = false
    
    // 连接成功后主动刷新一次工具，确保 Agent 获取到的是绝对最新的
    if (typeof forceRefreshTools === 'function') {
      forceRefreshTools().catch(() => {})
    }
  }

  const setStatus = (status: 'connecting' | 'connected' | 'error') => {
    browser.storage.local.set({ [StorageKeys.MCP_STATUS]: status }).catch(() => {})
  }

  const connectToAgent = async (isRetry: boolean = false, forceFresh: boolean = false): Promise<string> => {
    if (!isRetry) setStatus('connecting')
    try {
      if (forceFresh) {
        latestSessionId = null
      } else {
        // 先去读取 localstorage 中的 sessionid
        const storageResult = await browser.storage.local.get(StorageKeys.MCP_SESSION_ID)
        if (storageResult[StorageKeys.MCP_SESSION_ID]) {
          latestSessionId = storageResult[StorageKeys.MCP_SESSION_ID] as string
        }
      }
      const finalUrl = await getDynamicFinalAgentRoot()
      const type = await getConnectType()
      const { transport, sessionId } = await client.connect(createConnectOptions(finalUrl, type, handleError))

      // 连接成功后，设置页面工具代理（拦截 tools/list 和 tools/call）
      _currentTransport = transport

      await handleConnectSuccess(sessionId, isRetry)
      setStatus('connected')
      return sessionId
    } catch (error) {
      console.warn(`【useWebAgentServer】${isRetry ? '重连' : '连接'}失败:`, error)
      if (isRetry) isReconnecting = false
      reconnect()
      if (!isRetry) {
        setStatus('error')
        throw error
      }
      // isRetry 失败时同样抛出错误，保持 Promise<string> 类型契约
      throw error
    }
  }

  const reconnect = async () => {
    if (isReconnecting || retryCount >= MAX_RETRY_COUNT) {
      if (retryCount >= MAX_RETRY_COUNT) {
        console.warn(`【useWebAgentServer】已达到最大重连次数 ${MAX_RETRY_COUNT}，停止重连`)
        setStatus('error')
      }
      return
    }
    isReconnecting = true
    retryCount++
    console.log(`【useWebAgentServer】准备第 ${retryCount} 次重连，延迟 ${RETRY_DELAY}ms`)
    _reconnectTimer = setTimeout(() => {
      _reconnectTimer = null
      console.log(`【useWebAgentServer】开始第 ${retryCount} 次重连`)
      connectToAgent(true).catch(() => {}) // 失败已在内部处理，不需要冒泡
    }, RETRY_DELAY)
  }

  _reconnectFn = async () => {
    console.log('【useWebAgentServer】主动断开并重连...')
    // 取消待触发的自动重连计时器，防止与手动重连并发
    if (_reconnectTimer !== null) {
      clearTimeout(_reconnectTimer)
      _reconnectTimer = null
    }
    // 重置自动重连状态，防止与手动重连竞态
    isReconnecting = false
    retryCount = 0
    try {
      await client.close()
    } catch (e) {}

    // 先去读取 localstorage 中的 sessionid
    const storageResult = await browser.storage.local.get(StorageKeys.MCP_SESSION_ID)
    if (storageResult[StorageKeys.MCP_SESSION_ID]) {
      latestSessionId = storageResult[StorageKeys.MCP_SESSION_ID] as string
    }

    // 使用独立逻辑：直接尝试连接，成功返回 sessionId，失败直接 throw（供 UI 感知）
    // 不复用 connectToAgent(false, ...) —— 那会在失败时同时触发 reconnect() 自动重试，造成竞态
    setStatus('connecting')
    try {
      const finalUrl = await getDynamicFinalAgentRoot()
      const type = await getConnectType()
      const { transport, sessionId } = await client.connect(createConnectOptions(finalUrl, type, handleError))
      _currentTransport = transport
      await handleConnectSuccess(sessionId, false)
      setStatus('connected')
      return sessionId
    } catch (error) {
      console.warn('【useWebAgentServer】手动重连失败:', error)
      setStatus('error')
      // 手动重连失败后，启动自动重试兜底
      reconnect()
      throw error
    }
  }

  const handleError = (error: Error) => {
    console.warn('【useWebAgentServer】Connect proxy error:', error)
    setStatus('error')
    reconnect()
  }

  await connectToAgent(false)

  if (!latestSessionId) {
    throw new Error('【useWebAgentServer】未能获取有效的 sessionId')
  }

  return latestSessionId
}

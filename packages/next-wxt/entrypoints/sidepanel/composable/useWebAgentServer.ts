import { WebMcpClient } from '@opentiny/next-sdk/core'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { StorageKeys } from '../utils/storage-keys'
import { AGENT_ROOT } from '../const'
import { getWebAgentUrl, getConnectType } from '../model-manage/model-storage'

const MAX_RETRY_COUNT = 5
const RETRY_DELAY = 3000

let _reconnectFn: (() => Promise<string>) | null = null

export const forceWebAgentReconnect = async () => {
  if (_reconnectFn) {
    return await _reconnectFn()
  }
  throw new Error('WebAgentServer 未初始化')
}

/**
 * 为 transport 设置页面工具代理。
 *
 * 运行在 background service worker 里，通过 browser.tabs + browser.scripting
 * 获取当前激活页面（MAIN world）注册的工具，并代理 tools/call 调用。
 * 不依赖 sidepanel 的 navigator.modelContextTesting，解决了跨环境工具获取问题。
 */
const setupPageToolsProxy = (transport: Transport) => {
  transport.onmessage = async (message: any) => {
    if (!message || typeof message !== 'object') return
    const { id, method } = message

    try {
      // ── MCP 握手 ──
      if (method === 'initialize') {
        await transport.send({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: { listChanged: true }, logging: {} },
            serverInfo: { name: 'browser-ext-page-proxy', version: '1.0.0' }
          }
        })
        return
      }

      if (method === 'notifications/initialized') return

      if (method === 'ping' || method === 'custom_ping') {
        await transport.send({ jsonrpc: '2.0', id, result: {} })
        return
      }

      if (method === 'logging/setLevel') {
        if (id !== undefined) await transport.send({ jsonrpc: '2.0', id, result: {} })
        return
      }

      // ── 获取工具列表 ──
      // 来源1：background 侧内置工具（从 extraTools.ts 提取，如 page-agent-tool、tabs-manager 等）
      // 来源2：当前激活页面 MAIN world 注册的域名专属工具（__nextSdkRegisteredTools）
      if (method === 'tools/list') {
        const { getBuiltinExtensionTools } = await import('../extraTools')
        const builtinToolsDef = getBuiltinExtensionTools()
        
        // 内置工具描述
        const builtinTools = builtinToolsDef.map((t: any) => ({
          name: t.name,
          description: t.description || '',
          inputSchema: t.inputSchema || { type: 'object', properties: {} }
        }))

        // 尝试合并当前激活页面 MAIN world 里注册的域名专属工具
        let pageTools: any[] = []
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
        if (tab?.id && tab.url?.startsWith('http')) {
          try {
            const injected = await browser.scripting.executeScript({
              target: { tabId: tab.id },
              world: 'MAIN',
              func: () => {
                const fn = (window as any).__nextSdkRegisteredTools
                return typeof fn === 'function' ? fn() : []
              }
            })
            const rawTools: any[] = injected[0]?.result ?? []
            // 过滤掉与内置工具同名的（避免重复）
            const builtinNames = new Set(builtinTools.map((t) => t.name))
            pageTools = rawTools
              .filter((t: any) => !builtinNames.has(t.name))
              .map((t: any) => {
                let schemaObj: any = {}
                if (typeof t.inputSchema === 'string') {
                  try { schemaObj = JSON.parse(t.inputSchema) } catch {}
                } else if (t.inputSchema && typeof t.inputSchema === 'object') {
                  schemaObj = t.inputSchema
                }
                return {
                  name: t.name,
                  description: t.description || '',
                  inputSchema: { type: 'object', properties: schemaObj.properties || {}, required: schemaObj.required || [] }
                }
              })
          } catch { /* 页面可能不支持，忽略 */ }
        }

        await transport.send({ jsonrpc: '2.0', id, result: { tools: [...builtinTools, ...pageTools] } })
        return
      }

      // ── 执行工具 ──
      if (method === 'tools/call') {
        const { name, arguments: args } = message.params || {}
        if (!name) throw Object.assign(new Error('Missing tool name'), { code: -32602 })

        // 优先匹配 background 侧内置工具（tabs-manager, page-agent-tool 等）
        const { getBuiltinExtensionTools } = await import('../extraTools')
        const builtinToolsDef = getBuiltinExtensionTools()
        const targetTool = builtinToolsDef.find((t: any) => t.name === name)

        if (targetTool) {
          try {
            const result = await targetTool.execute(args || {})
            // 如果 execute() 已经返回了 { content: [...] } 格式，则直接返回；否则包装一层
            const finalResult = result && typeof result === 'object' && 'content' in result
              ? result
              : { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }] }
            await transport.send({ jsonrpc: '2.0', id, result: finalResult })
          } catch (e: any) {
            await transport.send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `工具 ${name} 异常: ${e.message}` }] } })
          }
          return
        }

        // 如果不是内置工具，则尝试通过 MAIN world 的 executeTool 执行（域名专属工具）
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
        if (!tab?.id || !tab.url?.startsWith('http')) throw new Error('当前页面不支持工具调用（非 http/https）')

        const result = await browser.scripting.executeScript({
          target: { tabId: tab.id },
          world: 'MAIN',
          func: async (toolName: string, argsStr: string) => {
            const ctx = (navigator as any).modelContextTesting || (navigator as any).modelContext
            if (!ctx?.executeTool) return { content: [{ type: 'text', text: 'executeTool not available' }] }
            try {
              const r = await ctx.executeTool(toolName, argsStr)
              return r && typeof r === 'object' && 'content' in r
                ? r
                : { content: [{ type: 'text', text: typeof r === 'string' ? r : JSON.stringify(r) }] }
            } catch (e: any) {
              return { content: [{ type: 'text', text: `工具执行失败: ${e.message}` }] }
            }
          },
          args: [name, JSON.stringify(args || {})]
        })
        const finalResult = result[0]?.result ?? { content: [{ type: 'text', text: 'No result' }] }
        await transport.send({ jsonrpc: '2.0', id, result: finalResult })
        return
      }


      // ── 其他方法返回空 ──
      if (method === 'prompts/list') {
        await transport.send({ jsonrpc: '2.0', id, result: { prompts: [] } })
        return
      }
      if (method === 'resources/list') {
        await transport.send({ jsonrpc: '2.0', id, result: { resources: [] } })
        return
      }

      if (id !== undefined) {
        await transport.send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } })
      }
    } catch (err: any) {
      if (id !== undefined) {
        await transport.send({ jsonrpc: '2.0', id, error: { code: err.code || -32000, message: err.message || String(err) } })
      }
    }
  }
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

  const client = new WebMcpClient(
    { name: 'mcp-web-client', version: '1.0.0' },
    { capabilities: { roots: { listChanged: true }, sampling: {}, elicitation: {} } }
  )

  let retryCount = 0
  let isReconnecting = false
  // 从存储加载 sessionId
  const storageResult = await browser.storage.local.get(StorageKeys.MCP_SESSION_ID)
  let latestSessionId: string | null = (storageResult[StorageKeys.MCP_SESSION_ID] as string) || null

  // 创建连接配置（不再使用 builtin: true，由 setupPageToolsProxy 自定义处理）
  const createConnectOptions = (url: string, type: 'sse' | 'socket' | 'stream', onError: (error: Error) => void) => {
    const baseUrl = url.endsWith('/') ? url : url + '/'
    const suffix = type === 'sse' ? 'sse' : 'mcp'
    return {
      url: baseUrl + suffix,
      sessionId: latestSessionId || undefined,
      agent: true,
      type,
      onError
    }
  }

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

  const connectToAgent = async (isRetry: boolean = false, forceFresh: boolean = false): Promise<string> => {
    if (!isRetry) setStatus('connecting')
    try {
      if (forceFresh) latestSessionId = null
      const finalUrl = await getDynamicFinalAgentRoot()
      const type = await getConnectType()
      const { transport, sessionId } = await client.connect(createConnectOptions(finalUrl, type, handleError))

      // 连接成功后，设置页面工具代理（拦截 tools/list 和 tools/call）
      setupPageToolsProxy(transport)

      await handleConnectSuccess(sessionId, isRetry)
      setStatus('connected')
      return sessionId
    } catch (error) {
      console.error(`【useWebAgentServer】${isRetry ? '重连' : '连接'}失败:`, error)
      if (isRetry) isReconnecting = false
      reconnect()
      if (!isRetry) {
        setStatus('error')
        throw error
      }
      return Promise.reject(error)
    }
  }

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
    try { await client.close() } catch (e) {}
    await browser.storage.local.remove(StorageKeys.MCP_SESSION_ID)
    return await connectToAgent(false, true)
  }

  const handleError = (error: Error) => {
    console.error('【useWebAgentServer】Connect proxy error:', error)
    setStatus('error')
    reconnect()
  }

  await connectToAgent(false)

  if (!latestSessionId) {
    throw new Error('【useWebAgentServer】未能获取有效的 sessionId')
  }

  return latestSessionId
}


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
      // 来源1：background 侧内置工具（page-agent-tool，通过 PAGE_CONTROL → content script 执行，不受 CSP 限制）
      // 来源2：当前激活页面 MAIN world 注册的域名专属工具（__nextSdkRegisteredTools）
      if (method === 'tools/list') {
        // 内置工具描述（只含 name/description/inputSchema，execute 逻辑在 tools/call 里处理）
        const builtinTools = [
          {
            name: 'page-agent-tool',
            description: `用于分析和操作当前浏览器页面的通用工具。
每次执行 click、fill、select 动作前，**必须**先调用 browserState 获取页面最新状态。
- browserState：获取页面标题、URL、HTML 无障碍树内容（包含可操作元素及其索引）
- click：根据元素索引点击
- fill：根据元素索引填写文本
- select：根据元素索引选择下拉框选项
- scroll：滚动页面（不带 index：滚动整个文档；带 index：滚动该元素的最近可滚动祖先）
- executeJavascript：执行 JavaScript 代码`,
            inputSchema: {
              type: 'object',
              properties: {
                action: { type: 'string', enum: ['browserState', 'click', 'fill', 'select', 'scroll', 'executeJavascript'], description: '执行的动作名称' },
                index: { type: 'number', description: '元素索引（click/fill/select 时必须提供）' },
                text: { type: 'string', description: '文本内容（fill/select 时必须提供）' },
                down: { type: 'boolean', description: '上下滚动方向（scroll 时必须提供）' },
                right: { type: 'boolean', description: '水平滚动方向（scroll 时可选）' },
                numPages: { type: 'number', description: '滚动页数' },
                script: { type: 'string', description: 'JavaScript 代码（executeJavascript 时必须提供）' }
              },
              required: ['action']
            }
          }
        ]

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

        const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
        if (!tab?.id || !tab.url?.startsWith('http')) throw new Error('当前页面不支持工具调用（非 http/https）')

        // page-agent-tool：通过 tabs.sendMessage → content script 的 PageController 执行（不受 CSP 限制）
        if (name === 'page-agent-tool') {
          const a = args || {}

          const callPageControl = async (action: string, payload?: any[]) => {
            const res = await browser.tabs.sendMessage(tab.id!, { type: 'PAGE_CONTROL', action, payload: payload ?? [] })
            if (!res?.success) throw new Error(res?.error || 'PAGE_CONTROL 调用失败')
            return res.result
          }

          try {
            let result: any

            if (a.action === 'browserState') {
              await callPageControl('show_mask')
              result = await callPageControl('get_browser_state')
              await callPageControl('hide_mask')
              await callPageControl('clean_up_highlights')
              await transport.send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `浏览器状态: ${JSON.stringify(result)}` }] } })
            } else if (a.action === 'click') {
              await callPageControl('update_tree')   // 确保 DOM 已索引
              await callPageControl('show_mask')
              result = await callPageControl('click_element', [a.index])
              await callPageControl('hide_mask')
              await callPageControl('clean_up_highlights')
              await transport.send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `点击结果: ${JSON.stringify(result)}` }] } })
            } else if (a.action === 'fill') {
              await callPageControl('update_tree')   // 确保 DOM 已索引
              await callPageControl('show_mask')
              result = await callPageControl('input_text', [a.index, a.text])
              await callPageControl('hide_mask')
              await callPageControl('clean_up_highlights')
              await transport.send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `填写结果: ${JSON.stringify(result)}` }] } })
            } else if (a.action === 'select') {
              await callPageControl('update_tree')   // 确保 DOM 已索引
              await callPageControl('show_mask')
              result = await callPageControl('select_option', [a.index, a.text])
              await callPageControl('hide_mask')
              await callPageControl('clean_up_highlights')
              await transport.send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `选择结果: ${JSON.stringify(result)}` }] } })
            } else if (a.action === 'scroll') {
              await callPageControl('update_tree')   // 确保 DOM 已索引（带 index 的滚动需要）
              await callPageControl('show_mask')
              result = a.right
                ? await callPageControl('scroll_horizontally', [{ index: a.index, right: a.right, numPages: a.numPages, pixels: a.pixels }])
                : await callPageControl('scroll', [{ index: a.index, down: a.down, numPages: a.numPages, pixels: a.pixels }])
              await callPageControl('hide_mask')
              await callPageControl('clean_up_highlights')
              await transport.send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `滚动结果: ${JSON.stringify(result)}` }] } })
            } else if (a.action === 'executeJavascript') {
              result = await callPageControl('execute_javascript', [a.script])
              await transport.send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `脚本执行结果: ${JSON.stringify(result)}` }] } })
            } else {
              await transport.send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `未知动作: ${a.action}` }] } })
            }
          } catch (e: any) {
            await transport.send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `page-agent-tool 异常: ${e.message}` }] } })
          }
          return
        }

        // 其他域名专属工具：通过 MAIN world 的 executeTool 执行
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


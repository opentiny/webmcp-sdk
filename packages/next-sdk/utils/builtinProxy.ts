import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'

/** 浏览器内置 WebMCP 原生上下文接口 */
interface NativeModelContext {
  getTools(): Promise<NativeTool[]> | NativeTool[]
  executeTool(tool: NativeTool, argsStr: string): Promise<unknown>
}

/** 原生工具描述 */
interface NativeTool {
  name: string
  description?: string
  title?: string
  inputSchema?: unknown
}

/** JSON-RPC 消息基础结构 */
interface JsonRpcMessage {
  jsonrpc: string
  id?: string | number
  method?: string
  params?: {
    name?: string
    arguments?: Record<string, unknown>
    [key: string]: unknown
  }
}

/**
 * 建立原生的 JSON-RPC 拦截层：
 * 将发向 remote 的 MCP 请求拦截，代理给所在浏览器的 document.modelContext 上执行。
 */
export const setupBuiltinProxy = (transport: Transport) => {
  const getNativeCtx = (): NativeModelContext | null => {
    let ctx: NativeModelContext | null = null
    if (typeof document !== 'undefined') ctx = ctx || ((document as unknown as Record<string, unknown>).modelContext as NativeModelContext | null)
    if (typeof navigator !== 'undefined') ctx = ctx || ((navigator as unknown as Record<string, unknown>).modelContext as NativeModelContext | null)
    ctx = ctx || ((globalThis as unknown as Record<string, unknown>).modelContext as NativeModelContext | null)
    return ctx || null
  }

  transport.onmessage = async (message: JsonRpcMessage) => {
    if (!message || typeof message !== 'object') return
    const id = message.id
    const method = message.method

    try {
      if (method === 'initialize') {
        await transport.send({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: true },
              logging: {}
            },
            serverInfo: { name: 'browser-builtin-webmcp-proxy', version: '1.0.0' }
          }
        })
      } else if (method === 'notifications/initialized') {
        // Ignore
      } else if (method === 'ping' || method === 'custom_ping') {
        await transport.send({ jsonrpc: '2.0', id, result: {} })
      } else if (method === 'tools/list') {
        const nativeCtx = getNativeCtx()
        if (nativeCtx && nativeCtx.getTools) {
          const rawTools = await nativeCtx.getTools()
          const tools = rawTools.map((t: any) => {
            let schemaObj: any = {}
            if (typeof t.inputSchema === 'string') {
              try {
                schemaObj = JSON.parse(t.inputSchema)
              } catch (e) {
                console.error('Failed to parse inputSchema:', e)
              }
            } else if (typeof t.inputSchema === 'object' && t.inputSchema !== null) {
              schemaObj = t.inputSchema
            }
            return {
              name: t.name,
              description: t.description || '',
              inputSchema: {
                type: 'object',
                properties: schemaObj.properties || {},
                required: schemaObj.required || []
              }
            }
          })
          await transport.send({ jsonrpc: '2.0', id, result: { tools } })
        } else {
          await transport.send({ jsonrpc: '2.0', id, result: { tools: [] } })
        }
      } else if (method === 'tools/call') {
        const nativeCtx = getNativeCtx()
        if (nativeCtx && nativeCtx.executeTool) {
          if (!message.params || typeof message.params !== 'object' || !message.params.name) {
            const error: Error & { code?: number } = new Error('Invalid params: "name" is required and params must be an object')
            error.code = -32602 // Invalid params
            throw error
          }
          const { name, arguments: args } = message.params
          const tools = await (nativeCtx.getTools ? nativeCtx.getTools() : [])
          const toolObj = tools.find((t: any) => t.name === name)
          if (!toolObj) throw new Error(`Tool ${name} not found`)
          const result = await nativeCtx.executeTool(toolObj, JSON.stringify(args || {}))
          const finalResult =
            result && typeof result === 'object' && 'content' in result
              ? result
              : { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }] }
          await transport.send({ jsonrpc: '2.0', id, result: finalResult })
        } else {
          const error: Error & { code?: number } = new Error('executeTool not implemented in Browser built-in WebMCP')
          error.code = -32601 // Method not found
          throw error
        }
      } else if (method === 'logging/setLevel') {
        // 浏览器内置 WebMCP 不是标准 MCP Server，不支持日志级别设置。
        // 直接 mock 返回成功，避免严格的 MCP 客户端因未实现该方法而报错。
        await transport.send({ jsonrpc: '2.0', id, result: {} })
      } else if (method === 'prompts/list') {
        await transport.send({ jsonrpc: '2.0', id, result: { prompts: [] } })
      } else if (method === 'resources/list') {
        await transport.send({ jsonrpc: '2.0', id, result: { resources: [] } })
      } else if (id !== undefined) {
        // 对于其他不支持但带 id 的请求，返回规范要求的 -32601 Method not found
        await transport.send({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` }
        })
      }
    } catch (err: unknown) {
      if (id !== undefined) {
        const errObj = err as { code?: number; message?: string }
        await transport.send({
          jsonrpc: '2.0',
          id,
          error: { code: errObj.code || -32000, message: errObj.message || String(err) }
        })
      }
    }
  }
}

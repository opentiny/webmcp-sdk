import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'

/**
 * 建立原生的 JSON-RPC 拦截层：
 * 将发向 remote 的 MCP 请求拦截，代理给所在浏览器的 navigator.modelContextTesting 上执行。
 */
export const setupBuiltinProxy = (transport: Transport) => {
  const getNativeCtx = () => {
    return typeof navigator !== 'undefined'
      ? (navigator as any).modelContextTesting || (navigator as any).modelContext
      : null
  }

  transport.onmessage = async (message: any) => {
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
              logging: {},
              prompts: { listChanged: true },
              resources: { subscribe: true, listChanged: true }
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
        if (nativeCtx && nativeCtx.listTools) {
          const rawTools = await nativeCtx.listTools()
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
          const { name, arguments: args } = message.params
          const result = await nativeCtx.executeTool(name, JSON.stringify(args || {}))
          const finalResult =
            result && typeof result === 'object' && 'content' in result
              ? result
              : { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }] }
          await transport.send({ jsonrpc: '2.0', id, result: finalResult })
        } else {
          throw new Error('executeTool not implemented in Browser built-in WebMCP')
        }
      } else if (method === 'logging/setLevel') {
        const nativeCtx = getNativeCtx()
        if (nativeCtx && nativeCtx.setLogLevel) {
          await nativeCtx.setLogLevel(message.params.level)
          await transport.send({ jsonrpc: '2.0', id, result: {} })
        } else {
          // If not implemented, just return success to avoid crashing strict clients
          await transport.send({ jsonrpc: '2.0', id, result: {} })
        }
      } else if (id !== undefined) {
        // Generic fallback: Try to call the method directly on nativeCtx if it follows the same naming
        const nativeCtx = getNativeCtx()
        // Convert 'resources/list' to 'listResources' if needed, or handle directly
        if (nativeCtx) {
          // Check for direct method or generic dispatch
          if (typeof nativeCtx.request === 'function') {
            const result = await nativeCtx.request(method, message.params)
            await transport.send({ jsonrpc: '2.0', id, result })
            return
          }
        }

        // 符合协议：对于未处理且带有 id 的请求，返回 Method not found
        await transport.send({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` }
        })
      }
    } catch (err: any) {
      if (id !== undefined) {
        await transport.send({
          jsonrpc: '2.0',
          id,
          error: { code: err.code || -32000, message: err.message || String(err) }
        })
      }
    }
  }
}

import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'

/**
 * 建立原生的 JSON-RPC 拦截层：
 * 将发向 remote 的 MCP 请求拦截，代理给所在浏览器的 navigator.modelContextTesting 上执行。
 */
export const setupBuiltinProxy = (transport: Transport) => {
  transport.onmessage = async (message: any) => {
    if (!message || typeof message !== 'object') return
    const id = message.id
    try {
      if (message.method === 'initialize') {
        await transport.send({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'browser-builtin-webmcp-proxy', version: '1.0.0' }
          }
        })
      } else if (message.method === 'notifications/initialized') {
        // Ignore
      } else if (message.method === 'ping' || message.method === 'custom_ping') {
        await transport.send({ jsonrpc: '2.0', id, result: {} })
      } else if (message.method === 'tools/list') {
        const nativeCtx =
          typeof navigator !== 'undefined'
            ? (navigator as any).modelContextTesting || (navigator as any).modelContext
            : null
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
      } else if (message.method === 'tools/call') {
        const nativeCtx = typeof navigator !== 'undefined' ? navigator.modelContextTesting || navigator.modelContext : null
        if (nativeCtx && nativeCtx.executeTool) {
          const { name, arguments: args } = message.params
          const result = await nativeCtx.executeTool(name, JSON.stringify(args || {}))
          // 如果结果已经是 MCP 格式 ({ content: [...] })，直接转发；否则包装为 text
          const finalResult =
            result && typeof result === 'object' && 'content' in result
              ? result
              : { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result) }] }
          await transport.send({ jsonrpc: '2.0', id, result: finalResult })
        } else {
          await transport.send({
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: 'Browser built-in WebMCP not available' }
          })
        }
      } else if (id !== undefined) {
        // 符合协议：对于未处理且带有 id 的请求，返回 Method not found
        await transport.send({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${message.method}` }
        })
      }
    } catch (err: any) {
      if (id !== undefined) {
        await transport.send({ jsonrpc: '2.0', id, error: { code: -32000, message: err.message || String(err) } })
      }
    }
  }
}

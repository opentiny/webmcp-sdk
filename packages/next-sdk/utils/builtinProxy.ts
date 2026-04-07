import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'

/**
 * 建立原生的 JSON-RPC 拦截层：
 * 将发向 remote 的 MCP 请求拦截，代理给所在浏览器的 navigator.modelContextTesting 上执行。
 */
export const setupBuiltinProxy = (transport: Transport) => {
  const getNativeCtx = () => {
    if (typeof navigator === 'undefined') return null
    const nav = navigator as any
    return nav.modelContextTesting || null
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
          const error: any = new Error('executeTool not implemented in Browser built-in WebMCP')
          error.code = -32601 // Method not found
          throw error
        }
      } else if (method === 'logging/setLevel') {
        // 浏览器内置 WebMCP 不是标准 MCP Server，不支持日志级别设置。
        // 直接 mock 返回成功，避免严格的 MCP 客户端因未实现该方法而报错。
        await transport.send({ jsonrpc: '2.0', id, result: {} })
      } else if (id !== undefined) {
        // 浏览器内置 WebMCP 只实现了 tools 相关方法，其他带 id 的请求统一 mock 返回成功。
        // 这样可以保持与声明了完整 capabilities 的严格客户端的兼容性。
        await transport.send({ jsonrpc: '2.0', id, result: {} })
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

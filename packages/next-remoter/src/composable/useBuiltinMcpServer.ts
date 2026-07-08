import type { AgentModelProvider } from '@opentiny/next-sdk'

/**
 * 扩展的 document 类型，包含浏览器内置 WebMCP API
 */
type DocumentWithModelContext = Document & {
  modelContext?: object
}

/**
 * 检测当前浏览器是否支持内置 WebMCP（`document.modelContext`）。
 */
export function isBuiltinMcpSupported(): boolean {
  if (typeof document === 'undefined') return false
  const doc = document as DocumentWithModelContext
  return !!doc.modelContext
}

/**
 * 将浏览器内置 WebMCP（`document.modelContext`）作为一个 MCP Server
 * 注入到 AgentModelProvider，使 AI 可以调用浏览器原生工具。
 *
 * 特点：
 * - 类型为 `{ type: 'builtin', client: document.modelContext }`
 * - 工具列表通过 `await document.modelContext.getTools()` 获取
 * - 工具执行通过 `document.modelContext.executeTool(toolObj, input)` 代理
 *
 * @param agent - AgentModelProvider 实例
 * @param serverName - MCP server 名称，默认 'mcp-server-builtin-webmcp'
 * @returns Promise<boolean> 是否成功注入（浏览器不支持时返回 false）
 *
 * @example
 * ```ts
 * import { useBuiltinMcpServer } from '@opentiny/next-remoter/composable/useBuiltinMcpServer'
 *
 * const agent = new AgentModelProvider({ llmConfig })
 * await useBuiltinMcpServer(agent)
 * ```
 */
export async function useBuiltinMcpServer(
  agent: AgentModelProvider,
  serverName = 'mcp-server-builtin-webmcp'
): Promise<boolean> {
  if (typeof document === 'undefined') return false

  const doc = document as DocumentWithModelContext
  const client = doc.modelContext

  if (!client) {
    return false
  }

  const result = await agent.insertMcpServer(serverName, {
    type: 'builtin',
    client
  })

  return !!result
}

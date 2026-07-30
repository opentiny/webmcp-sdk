/**
 * 用户 MCP 脚本默认源码模板（MAIN world）
 */

export function createDefaultScriptSource(toolName = 'user_mcp_hello'): string {
  const guard = `__userMcp_${toolName}_registered`
  return `;(function () {
  var g = window;
  if (g[${JSON.stringify(guard)}]) return;
  var ctx = document.modelContext;
  if (!ctx || typeof ctx.registerTool !== 'function') {
    console.warn('[user-mcp-scripts] document.modelContext 未就绪');
    return;
  }
  ctx.registerTool({
    name: ${JSON.stringify(toolName)},
    title: '用户 MCP 示例',
    description: '由 Options「页面 MCP 脚本」注册的示例工具，返回当前页面标题。',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    },
    execute: async function () {
      return {
        content: [{ type: 'text', text: '页面标题：' + (document.title || '(空)') }]
      };
    }
  });
  g[${JSON.stringify(guard)}] = true;
})();
`
}

export function createDefaultScriptMeta(partial?: {
  name?: string
  description?: string
  matches?: string[]
}): {
  name: string
  description: string
  matches: string[]
  enabled: boolean
  replacesBuiltIn: boolean
  source: string
} {
  const name = partial?.name?.trim() || '我的页面工具'
  const toolSlug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 40) || 'user_mcp_hello'
  return {
    name,
    description: partial?.description ?? '在匹配站点注册 WebMCP 工具',
    matches: partial?.matches?.length ? partial.matches : ['*://example.com/*'],
    enabled: true,
    replacesBuiltIn: false,
    source: createDefaultScriptSource(toolSlug)
  }
}

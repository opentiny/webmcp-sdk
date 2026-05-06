import Ajv from 'ajv'
export * from './WebMcpServer'
export * from './WebMcpClient'
export { Ajv }
export { z } from 'zod'
export { AuthClientProvider } from '@opentiny/next'
export { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
export { UriTemplate } from '@modelcontextprotocol/sdk/shared/uriTemplate.js'
export { completable } from '@modelcontextprotocol/sdk/server/completable.js'
export { getDisplayName } from '@modelcontextprotocol/sdk/shared/metadataUtils.js'
export type * from 'zod'
export type * from '@opentiny/next'
export type * from '@modelcontextprotocol/sdk/types.js'
export type * from '@modelcontextprotocol/sdk/shared/protocol.js'
export type * from '@modelcontextprotocol/sdk/shared/transport.js'
export type * from '@modelcontextprotocol/sdk/client/sse.js'
export type * from '@modelcontextprotocol/sdk/client/streamableHttp.js'
export type * from '@modelcontextprotocol/sdk/server/mcp.js'

export * from './transport/ExtensionPageServerTransport'

// page-tools：供浏览器插件通过 scripting.executeScript 注入到第三方页面后初始化 WebMCP
export { initializeBuiltinWebMCP } from './page-tools/initialize-builtin-WebMCP'
export { setupModelContextBridge } from './page-tools/bridge'
export { registerPageAgentTool } from './page-tools/page-agent-tool'


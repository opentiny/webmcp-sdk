// 核心导出，仅包含无 DOM 依赖（Node.js / Service Worker 安全）的内容
import Ajv from 'ajv'
export { Ajv }
export { z } from 'zod'
export { AuthClientProvider } from '@opentiny/next'
export { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
export { UriTemplate } from '@modelcontextprotocol/sdk/shared/uriTemplate.js'
export { completable } from '@modelcontextprotocol/sdk/server/completable.js'
export { getDisplayName } from '@modelcontextprotocol/sdk/shared/metadataUtils.js'
export { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
export type * from 'zod'
export type * from '@opentiny/next'
export type * from '@modelcontextprotocol/sdk/types.js'
export type * from '@modelcontextprotocol/sdk/shared/protocol.js'
export type * from '@modelcontextprotocol/sdk/shared/transport.js'
export type * from '@modelcontextprotocol/sdk/client/sse.js'
export type * from '@modelcontextprotocol/sdk/client/streamableHttp.js'
export type * from '@modelcontextprotocol/sdk/server/mcp.js'

export * from './WebMcpServer'
export * from './WebMcpClient'

// 浏览器扩展自定义传输层（不包含对 window 依赖的模块）
export * from './transport/ExtensionClientTransport'

export { AgentModelProvider } from './agent/AgentModelProvider'
export { getAISDKTools } from './agent/utils/getAISDKTools'
export type * from './agent/type'
export { initializeBuiltinWebMCP } from './page-tools/initialize-builtin-WebMCP'

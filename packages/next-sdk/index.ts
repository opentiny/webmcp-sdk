// 从相关包中，导出一些常用变量，方便用户导入
import Ajv from 'ajv'
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

// 2大核心模块
export * from './WebMcpServer'
export * from './WebMcpClient'

// 浏览器扩展自定义传输层
export * from './transport/ExtensionClientTransport'
export * from './transport/ExtensionPageServerTransport'
export * from './transport/ExtensionContentServerTransport'

// 快速创建一个悬浮图标和菜单，是扫码和聊天框的入口
export { createRemoter } from './remoter/createRemoter'

// 一个通用的ai-sdk的agent封装
export { AgentModelProvider } from './agent/AgentModelProvider'

// 快速 从官方 mcp 或 WebMcpClient 这2种client中， 抽取成 ai-sdk 所需要的 tool的对象
export { getAISDKTools } from './agent/utils/getAISDKTools'

// 方便的二维码类
export { QrCode, type QrCodeOption } from './remoter/QrCode'
export type * from './agent/type'

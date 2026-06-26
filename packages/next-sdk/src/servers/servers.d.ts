import type { ToolSet } from 'ai'
interface BaseServer {
  /** 服务id */
  id?: string
  /** 服务名称 */
  name: string

  /** 动态更新的服务工具集 */
  tools?: ToolSet
}

/** 同页面服务, 每个Agent中只能有一个。 */
export interface PageServer extends BaseServer {
  type: 'page'
  window?: Window
  client?: ModelClient
}

export interface StreamableHttpServer extends BaseServer {
  type: 'http'
  /** 请求url, 可包含sessionId */
  url: string
  /** 请求头 */
  headers?: Record<string, string>

  client?: MCPClient
}

export interface SSEServer extends BaseServer {
  type: 'sse'
  /** 请求url, 可包含sessionId */
  url: string
  /** 请求头 */
  headers?: Record<string, string>

  client?: MCPClient
}
export type RemoteServer = StreamableHttpServer | SSEServer
export type NextMcpServer = PageServer | StreamableHttpServer | SSEServer

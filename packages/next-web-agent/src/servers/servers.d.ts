import type { ToolSet } from "ai";
interface BaseServer {
  /** 服务id */
  id?: string;
  /** 服务名称 */
  name: string;

  client?: any;
  /** 动态更新的服务工具集 */
  tools?: ToolSet;
}

/** 同页面服务, 每个Agent中只能有一个。 */
export interface PageServer extends BaseServer {
  type: "page";
  endpoint?: string;
}

/** iframe 服务, 每个Agent中只能有一个。 */
export interface IframeServer extends BaseServer {
  type: "iframe";
  endpoint?: string;
}

export interface StreamableHttpServer extends BaseServer {
  type: "streamable-http";
  /** 请求url, 可包含sessionId */
  url: string;
  /** 请求头 */
  headers?: Record<string, string>;
}

export interface SSEServer extends BaseServer {
  type: "sse";
  /** 请求url, 可包含sessionId */
  url: string;
  /** 请求头 */
  headers?: Record<string, string>;
}
export type RemoteServer = IframeServer | StreamableHttpServer | SSEServer;

export type NextMcpServer = PageServer | IframeServer | StreamableHttpServer | SSEServer;

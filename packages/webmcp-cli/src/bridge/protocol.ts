/**
 * WebSocket 桥接核心协议常量与类型定义
 *
 * 供 CLI（@opentiny/webmcp-cli）与浏览器扩展端（tiny-robot-wxt）共享复用。
 */

/** 默认本地 WebSocket 桥接服务端口 */
export const DEFAULT_WS_PORT = 18999

/** 协议版本号：主版本号（major）不兼容时两端均拒绝握手 */
export const PROTOCOL_VERSION = '1.1.0'

/** WebSocket 关闭状态码定义（4000~4999 私有保留区间） */
export const WS_CLOSE_CODE = {
  /** 被新接入的扩展连接平滑替换（旧连接触发退避重连） */
  REPLACED: 4000,
  /** 认证未通过（未提供 Token、Token 错误或 HMAC 签名校验失败） */
  UNAUTHORIZED: 4001,
  /** 协议主版本号不匹配 */
  PROTOCOL_MISMATCH: 4002
} as const

export type WsCloseCode = (typeof WS_CLOSE_CODE)[keyof typeof WS_CLOSE_CODE]

/** JSON-RPC 业务错误码定义 */
export const BRIDGE_ERROR_CODE = {
  /** 请求执行超时 */
  REQUEST_TIMEOUT: -32000,
  /** 命令执行超时 */
  EXECUTION_TIMEOUT: -32001,
  /** 命令或系统操作执行失败 */
  EXECUTION_FAILED: -32002,
  /** 无效参数（如 command 为空） */
  INVALID_PARAMS: -32602,
  /** 不支持的方法 */
  METHOD_NOT_FOUND: -32601,
  /** 扩展尚未连接至桥接服务 */
  EXTENSION_NOT_CONNECTED: -32051,
  /** 侧边栏尚未就绪或已关闭 */
  SIDEPANEL_NOT_READY: -32050
} as const

export type BridgeErrorCode = (typeof BRIDGE_ERROR_CODE)[keyof typeof BRIDGE_ERROR_CODE]

/** 核心 JSON-RPC 方法名常量 */
export const BRIDGE_METHODS = {
  TOOL_CALL: 'tool/call',
  SUB_AGENT_RUN: 'sub_agent/run',
  BROWSER_TABS: 'browser/tabs',
  BROWSER_STATE: 'browser/state',
  SKILLS_LIST: 'skills/list',
  SKILLS_GET: 'skills/get',
  SKILLS_READ_RESOURCE: 'skills/read_resource',
  SYSTEM_BASH: 'system/bash',
  SYSTEM_PICK_DIRECTORY: 'system/pick_directory'
} as const

export type BridgeMethod = (typeof BRIDGE_METHODS)[keyof typeof BRIDGE_METHODS]

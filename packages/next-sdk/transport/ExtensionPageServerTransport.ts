import type { Transport, TransportSendOptions } from '@modelcontextprotocol/sdk/shared/transport.js'
import { type JSONRPCMessage, JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js'
import { randomUUID } from '../utils/uuid'

declare const window: Window & typeof globalThis
declare const document: Document

/**
 * 服务器注册信息接口
 */
export interface ServerInfo {
  name: string
  version: string
  description?: string
  url?: string
  title?: string
}

/**
 * Chrome 扩展服务端 Transport
 * 用于页面脚本中的 MCP Server（通过 content script 作为桥梁）
 * 实现标准的 MCP Transport 接口
 *
 * 使用 sessionId 进行消息路由
 * 支持固定 sessionId，避免页面刷新时 sessionId 改变
 */
export class ExtensionServerTransport implements Transport {
  // MCP Transport 必需的回调
  onmessage?: (message: JSONRPCMessage) => void // 接收到消息时的回调
  onerror?: (error: Error) => void // 发生错误时的回调
  onclose?: () => void // 连接关闭时的回调

  // 会话ID，用于标识此 transport 实例并路由消息
  readonly sessionId: string

  // 内部状态
  private _messageListener: ((event: MessageEvent) => void) | null = null
  private _isStarted: boolean = false
  private _isClosed: boolean = false
  private _lastRegistration: ServerInfo | null = null // 最后一次注册信息（用于 Sidepanel 刷新后重新注册）

  constructor(sessionId: string | null = null) {
    // 如果提供了 sessionId，使用提供的；否则随机生成
    if (sessionId) {
      this.sessionId = sessionId
    } else {
      this.sessionId = randomUUID()
    }

    window.addEventListener('message', (event) => {
      if (event.data.type === 'sidepanel-ready') {
        if (this._lastRegistration && this._isStarted) {
          this.notifyRegistration(this._lastRegistration).catch((error) => {
            console.error('❌️ 重新注册失败:', error)
          })
        }
      }
    })
  }

  /**
   * 启动 transport，开始监听消息
   * @returns {Promise<void>}
   */
  async start() {
    // 防止重复启动
    if (this._isStarted) {
      return
    }

    if (this._isClosed) {
      throw new Error('❌️ server Transport 已关闭，无法重新启动')
    }

    window.addEventListener('message', (event) => {
      if (event.data.type === 'mcp-client-to-server') {
        const data = event.data.data
        if (data.sessionId !== this.sessionId) {
          console.error('❌️ sessionId 不匹配')
          return
        }
        if (!data.mcpMessage) {
          console.error('❌️ 消息缺少 mcpMessage 字段')
          return
        }
        const mcpMessage = JSONRPCMessageSchema.parse(data.mcpMessage)
        this.onmessage?.(mcpMessage)
      }
    })

    this._isStarted = true
  }

  /**
   * 发送消息到 MCP Client
   * @param {Object} message - JSONRPC 消息对象
   * @returns {Promise<void>}
   */
  async send(message: JSONRPCMessage, _options?: TransportSendOptions): Promise<void> {
    // 检查状态
    if (!this._isStarted) {
      const error = new Error('server Transport 未启动，无法发送消息')
      if (this.onerror) {
        this.onerror(error)
      }
      throw error
    }

    if (this._isClosed) {
      const error = new Error('server Transport 已关闭，无法发送消息')
      if (this.onerror) {
        this.onerror(error)
      }
      throw error
    }

    window.postMessage(
      {
        type: 'mcp-server-to-client',
        data: {
          sessionId: this.sessionId,
          mcpMessage: message
        }
      },
      '*'
    )
  }

  /**
   * 通知 Sidepanel 此 Server 已启动并准备接受连接
   * @param {Object} serverInfo - 服务器信息
   * @param {string} serverInfo.name - 服务器名称
   * @param {string} serverInfo.version - 服务器版本
   * @param {string} [serverInfo.description] - 服务器描述
   * @returns {Promise<void>}
   */
  async notifyRegistration(serverInfo: ServerInfo): Promise<void> {
    if (!this._isStarted) {
      console.error('❌️ Transport 未启动，无法发送注册通知')
      return
    }

    // 保存注册信息，用于 Sidepanel 刷新后重新注册
    this._lastRegistration = serverInfo

    try {
      window.postMessage(
        {
          type: 'mcp-server-register',
          data: {
            sessionId: this.sessionId,
            serverInfo: {
              ...serverInfo,
              url: window.location.origin,
              title: document.title
            }
          }
        },
        '*'
      )
    } catch (error) {
      console.error('❌️ 注册 server 失败, sessionId=${this.sessionId}', error)

      if (this.onerror) {
        this.onerror(error instanceof Error ? error : new Error(String(error)))
      }
    }
  }

  /**
   * 关闭 transport
   * @returns {Promise<void>}
   */
  async close() {
    // 防止重复关闭
    if (this._isClosed) {
      return
    }

    try {
      // 移除消息监听器
      if (this._messageListener) {
        window.removeEventListener('message', this._messageListener)
        this._messageListener = null
      }

      this._isClosed = true
      this._isStarted = false

      // 触发关闭回调
      if (this.onclose) {
        this.onclose()
      }
    } catch (error) {
      console.error('❌️ server Transport 关闭时发生错误:', error)

      if (this.onerror) {
        this.onerror(error instanceof Error ? error : new Error(String(error)))
      }
      throw error
    }
  }
}

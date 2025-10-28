import type { Transport, TransportSendOptions } from '@modelcontextprotocol/sdk/shared/transport.js'
import { type JSONRPCMessage, JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js'
// @ts-ignore
import { setNamespace, sendMessage, onMessage } from 'webext-bridge/window'

declare const window: Window & typeof globalThis
declare const document: Document

/**
 * 服务器注册信息接口
 */
export interface ServerInfo {
  /**
   * 服务器名称
   */
  name: string

  /**
   * 服务器版本
   */
  version: string

  /**
   * 服务器描述（可选）
   */
  description?: string

  /**
   * 服务器 URL（由 transport 自动添加）
   */
  url?: string

  /**
   * 页面标题（由 transport 自动添加）
   */
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
  private _messageListener: ((event: MessageEvent) => void) | null = null // 消息监听器引用
  private _isStarted: boolean = false // 是否已启动
  private _isClosed: boolean = false // 是否已关闭
  private _lastRegistration: ServerInfo | null = null // 最后一次注册信息（用于 Sidepanel 刷新后重新注册）

  constructor(sessionId: string | null = null) {
    // 会话ID，用于标识此 transport 实例并路由消息
    // 如果提供了 sessionId，使用提供的；否则随机生成
    setNamespace('ExtensionServerTransport-namespace')
    if (sessionId) {
      this.sessionId = sessionId
    } else {
      this.sessionId = `server-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    }

    // 设置监听器
    this._setupMessageListener()
  }

  /**
   * 设置消息监听器
   */
  private _setupMessageListener(): void {
    onMessage('sidepanel-ready', ({ sender, data }) => {
      if (this._lastRegistration && this._isStarted) {
        this.notifyRegistration(this._lastRegistration).catch((error) => {
          console.error('[ExtensionServerTransport] 重新注册失败:', error)
        })
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
      throw new Error('Transport 已关闭，无法重新启动')
    }

    try {
      // 注册消息监听器
      onMessage('mcp-client-to-server', ({ sender, data }) => {
        try {
          // 调用 MCP Server 的消息处理器
          if (this.onmessage) {
            const mcpMessage = JSONRPCMessageSchema.parse((data as any).mcpMessage)
            this.onmessage(mcpMessage)
            console.log('[ExtensionServerTransport] ✅ 消息已处理')
          } else {
            console.warn('[ExtensionServerTransport] onmessage 回调未设置')
          }
        } catch (error) {
          console.error('[ExtensionServerTransport] 处理消息时发生错误:', error)
          if (this.onerror) {
            this.onerror(error instanceof Error ? error : new Error(String(error)))
          }
        }
      })

      this._isStarted = true
    } catch (error) {
      console.error('[ExtensionServerTransport] 启动失败:', error)
      if (this.onerror) {
        this.onerror(error instanceof Error ? error : new Error(String(error)))
      }
      throw error
    }
  }

  /**
   * 发送消息到 MCP Client
   * @param {Object} message - JSONRPC 消息对象
   * @returns {Promise<void>}
   */
  async send(message: JSONRPCMessage, _options?: TransportSendOptions): Promise<void> {
    // 检查状态
    if (!this._isStarted) {
      const error = new Error('Transport 未启动，无法发送消息')
      console.error('[ExtensionServerTransport]', error.message)
      if (this.onerror) {
        this.onerror(error)
      }
      throw error
    }

    if (this._isClosed) {
      const error = new Error('Transport 已关闭，无法发送消息')
      console.error('[ExtensionServerTransport]', error.message)
      if (this.onerror) {
        this.onerror(error)
      }
      throw error
    }

    try {
      // 通过 window.postMessage 发送到 content script
      // 使用 window.location.origin 确保只发送到同源
      // 携带 sessionId 以便正确路由到对应的 client
      // window.postMessage(
      //   { type: 'mcp-server-to-client', sessionId: this.sessionId, mcpMessage: message },
      //   window.location.origin
      // )
      sendMessage(
        'mcp-server-to-client',
        {
          sessionId: this.sessionId,
          mcpMessage: message
        } as any,
        'content-script'
      )

      console.log('[ExtensionServerTransport] ✅ 响应已发送')
    } catch (error) {
      console.error('[ExtensionServerTransport] 发送消息失败:', error)
      const wrappedError = error instanceof Error ? error : new Error(String(error))
      if (this.onerror) {
        this.onerror(wrappedError)
      }
      throw wrappedError
    }
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
      console.warn('[ExtensionServerTransport] Transport 未启动，无法发送注册通知')
      return
    }

    // 保存注册信息，用于 Sidepanel 刷新后重新注册
    this._lastRegistration = serverInfo

    try {
      // window.postMessage( { type: 'mcp-server-register', sessionId: this.sessionId, serverInfo: { ...serverInfo, url: window.location.origin, title: document.title } }, window.location.origin )
      // 测试发送到 content-script

      sendMessage(
        'mcp-server-register',
        {
          sessionId: this.sessionId,
          serverInfo: {
            ...serverInfo,
            url: window.location.origin,
            title: document.title
          }
        },
        'content-script'
      )
    } catch (error) {
      console.error('[ExtensionServerTransport] 发送注册通知失败:', error)
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
      console.error('[ExtensionServerTransport] 关闭时发生错误:', error)
      if (this.onerror) {
        this.onerror(error instanceof Error ? error : new Error(String(error)))
      }
      throw error
    }
  }
}

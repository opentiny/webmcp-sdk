import type { Transport, TransportSendOptions } from '@modelcontextprotocol/sdk/shared/transport.js'
import { type JSONRPCMessage, JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js'
import { v4 as uuidv4 } from 'uuid'

declare const document: Document
declare const chrome: any

/**
 * 服务器注册信息接口
 */
export interface ContentScriptServerInfo {
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
export class ContentScriptServerTransport implements Transport {
  // MCP Transport 必需的回调
  onmessage?: (message: JSONRPCMessage) => void // 接收到消息时的回调
  onerror?: (error: Error) => void // 发生错误时的回调
  onclose?: () => void // 连接关闭时的回调

  // 会话ID，用于标识此 transport 实例并路由消息
  readonly sessionId: string

  // 内部状态
  private _isStarted: boolean = false
  private _isClosed: boolean = false
  private _lastRegistration: ContentScriptServerInfo | null = null // 最后一次注册信息（用于 Sidepanel 刷新后重新注册）

  constructor(sessionId: string | null = null) {
    // 如果提供了 sessionId，使用提供的；否则随机生成
    if (sessionId) {
      this.sessionId = sessionId
    } else {
      this.sessionId = uuidv4()
    }

    chrome.runtime.onMessage.addListener((message: any) => {
      if (message.type === 'sidepanel-ready') {
        if (this._lastRegistration && this._isStarted) {
          this.notifyRegistration(this._lastRegistration).catch((error) => {
            console.log('[ContentScriptServerTransport] 通知 Sidepanel 此 Server 已启动并准备接受连接失败', error)
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
    console.log('[ContentScriptServerTransport] 启动 start', this.sessionId)
    // 防止重复启动
    if (this._isStarted) {
      return
    }

    if (this._isClosed) {
      throw new Error('❌️ server Transport 已关闭，无法重新启动')
    }

    chrome.runtime.onMessage.addListener((message: any) => {
      if (message.type === 'mcp-client-to-server') {
        const data: any = message.data
        if (data.sessionId !== this.sessionId) {
          return { success: false, error: 'sessionId 不匹配' }
        }
        if (!data.mcpMessage) {
          return { success: false, error: '消息缺少 mcpMessage 字段' }
        }
        try {
          const mcpMessage = JSONRPCMessageSchema.parse(data.mcpMessage)
          this.onmessage?.(mcpMessage)
        } catch (error) {
          console.log('[ContentScriptServerTransport] 处理消息时发生错误:', error)
        }
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
    console.log('[ContentScriptServerTransport] 开始执行send方法', message)
    // 检查状态
    if (!this._isStarted) {
      const error = new Error('server Transport 未启动，无法发送消息')
      console.log('[ContentScriptServerTransport] 发送消息失败:', error)
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

    try {
      console.log('[ContentScriptServerTransport] 发送消息到 MCP Client', message)
      chrome.runtime.sendMessage({
        type: 'mcp-server-to-client',
        data: {
          sessionId: this.sessionId,
          mcpMessage: message
        }
      })
    } catch (error) {
      console.log('[ContentScriptServerTransport] 发送消息失败:', error)
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
  async notifyRegistration(serverInfo: ContentScriptServerInfo): Promise<void> {
    if (!this._isStarted) {
      return
    }

    // 保存注册信息，用于 Sidepanel 刷新后重新注册
    this._lastRegistration = serverInfo
    chrome.runtime.sendMessage({
      type: 'mcp-server-register',
      data: {
        sessionId: this.sessionId,
        serverInfo: {
          ...serverInfo,
          url: window.location.origin,
          title: document.title
        }
      }
    })
  }

  /**
   * 关闭 transport
   * @returns {Promise<void>}
   */
  async close() {
    console.log('[ContentScriptServerTransport] 开始执行close方法', this.sessionId)
    // 防止重复关闭
    if (this._isClosed) {
      return
    }

    try {
      this._isClosed = true
      this._isStarted = false

      // 触发关闭回调
      if (this.onclose) {
        this.onclose()
      }
    } catch (error) {
      if (this.onerror) {
        this.onerror(error instanceof Error ? error : new Error(String(error)))
      }
      throw error
    }
  }
}

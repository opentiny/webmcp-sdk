import type { Transport, TransportSendOptions } from '@modelcontextprotocol/sdk/shared/transport.js'
import { type JSONRPCMessage, JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js'
import { randomUUID } from '../utils/uuid'
import { onWindowMessage, sendWindowMessage } from './messages'

declare const window: Window & typeof globalThis
declare const document: Document

/** 服务器注册信息接口 */
export interface ServerInfo {
  name: string
  version: string
  description?: string
  url?: string
  title?: string
}

/**
 * Chrome 扩展服务端 Transport 用于【页面脚本】中的标准的 MCP Transport 接口
 * 使用 sessionId 进行消息路由
 * 支持固定 sessionId，避免页面刷新时 sessionId 改变
 */
export class ExtensionPageServerTransport implements Transport {
  // MCP Transport 必需的回调
  onmessage?: (message: JSONRPCMessage) => void // 接收到消息时的回调
  onerror?: (error: Error) => void // 发生错误时的回调
  onclose?: () => void // 连接关闭时的回调

  // 会话ID，用于标识此 transport 实例并路由消息
  readonly sessionId: string
  readonly tabId: number

  // 内部状态
  private _messageListener1: () => void
  private _messageListener2: () => void
  private _isStarted: boolean = false
  private _isClosed: boolean = false
  private _lastRegistration: ServerInfo | null = null // 最后一次注册信息（用于 Sidepanel 刷新后重新注册）
  private _throwError(whenFn: () => boolean, message: string) {
    if (whenFn()) {
      const error = new Error(message)
      console.log(message, error)
      if (this.onerror) {
        this.onerror(error)
      }
      throw error
    }
  }

  constructor(sessionId: string | null = null, tabId: number) {
    // 如果提供了 sessionId，使用提供的；否则随机生成
    this.sessionId = sessionId || randomUUID()
    this.tabId = tabId

    this._messageListener1 = onWindowMessage(
      'sidepanel-ready-to-page',
      () => {
        if (this._lastRegistration && this._isStarted) {
          this.notifyRegistration(this._lastRegistration).catch((error) => {
            console.error('【Page Svr Transport】 notifyRegistration失败:', error)
          })
        }
      },
      'content->page'
    )

    this._messageListener2 = onWindowMessage(
      'mcp-client-to-server-to-page',
      (data) => {
        if (data.sessionId !== this.sessionId || data.tabId !== this.tabId) return

        console.log('【Page Svr Transport】 即将处理 mcpMessage', data.mcpMessage)
        const mcpMessage = JSONRPCMessageSchema.parse(data.mcpMessage)
        this.onmessage?.(mcpMessage)

        // 判断是否为工具调用
        const toolName = data.mcpMessage.params?.name
        if (toolName) {
          sendWindowMessage(
            'update-page-app-message',
            { status: 'run', message: data.mcpMessage.params?.name },
            'page->content'
          )
        }
      },
      'content->page'
    )
  }

  /** 启动 transport，开始监听消息  */
  async start() {
    if (this._isStarted) return
    if (this._isClosed) throw new Error('【Page Svr Transport】 已关闭，无法重新启动')

    this._isStarted = true
  }

  /** 发送消息到 MCP Client */
  async send(message: JSONRPCMessage, _options?: TransportSendOptions): Promise<void> {
    // 检查状态
    this._throwError(() => !this._isStarted, '【Page Svr Transport】 未启动，无法发送消息')
    this._throwError(() => this._isClosed, '【Page Svr Transport】 已关闭，无法发送消息')

    sendWindowMessage(
      'mcp-server-to-client-from-page',
      {
        sessionId: this.sessionId,
        mcpMessage: message
      },
      'page->content'
    )

    // 判断是否为工具调用成功了!
    if ('result' in message && message.result?.content) {
      sendWindowMessage(
        'update-page-app-message',
        { status: 'ready', message: '' },
        'page->content' // 此处应该是 content->content， 但为了和pageServerTransport统一。
      )
    }
  }

  /** 通知 Sidepanel 此 Server 已启动并准备接受连接 */
  async notifyRegistration(serverInfo: ServerInfo): Promise<void> {
    this._throwError(() => !this._isStarted, '【Page Svr Transport】 未启动，无法注册消息')
    this._lastRegistration = serverInfo

    try {
      sendWindowMessage(
        'mcp-server-register-from-page',
        {
          sessionId: this.sessionId,
          serverInfo: {
            ...serverInfo,
            url: window.location.origin,
            title: document.title
          }
        },
        'page->content'
      )
    } catch (error) {
      this._throwError(() => true, '【Page Svr Transport】 注册 server 失败' + String(error))
    }
  }

  /** 关闭 transport */
  async close() {
    if (this._isClosed) return

    try {
      this._messageListener1 && this._messageListener1()
      this._messageListener2 && this._messageListener2()

      this._isClosed = true
      this._isStarted = false
      this.onclose && this.onclose()
    } catch (error) {
      this._throwError(() => true, '【Page Svr Transport】 关闭时发生错误' + String(error))
    }
  }
}

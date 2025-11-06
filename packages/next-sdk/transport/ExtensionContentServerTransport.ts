import type { Transport, TransportSendOptions } from '@modelcontextprotocol/sdk/shared/transport.js'
import { type JSONRPCMessage, JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js'
import { randomUUID } from '../utils/uuid'
import { onRuntimeMessage, sendRuntimeMessage, sendWindowMessage } from './messages'

declare const document: Document
declare const chrome: any

/** 服务器注册信息接口 */
export interface ContentScriptServerInfo {
  /** 服务器名称 */
  name: string
  /** 服务器版本 */
  version: string
  /** 服务器描述（可选） */
  description?: string
  /** 服务器 URL（由 transport 自动添加） */
  url?: string
  /** 页面标题（由 transport 自动添加） */
  title?: string
}

/**
 * Chrome 扩展的页面Content Script中,实现标准的 MCP Transport
 * 使用 sessionId 进行消息路由的唯一标识
 */
export class ContentScriptServerTransport implements Transport {
  // MCP Transport 必需的回调
  onmessage?: (message: JSONRPCMessage) => void // 接收到消息时的回调
  onerror?: (error: Error) => void // 发生错误时的回调
  onclose?: () => void // 连接关闭时的回调

  // 会话ID，用于标识此 transport 实例并路由消息
  readonly sessionId: string
  readonly tabId: number

  // 内部状态
  private _isStarted: boolean = false
  private _isClosed: boolean = false
  private _lastRegistration: ContentScriptServerInfo | null = null // 最后一次注册信息（用于 Sidepanel 刷新后重新注册）
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

    onRuntimeMessage(
      'sidepanel-ready',
      () => {
        if (this._lastRegistration && this._isStarted) {
          this.notifyRegistration(this._lastRegistration).catch((error) => {
            console.log('[ContentScriptServerTransport] notifyRegistration 失败', error)
          })
        }
      },
      'side->content',
      this.tabId
    )
  }

  /** 启动 transport，开始监听MCP client 消息   */
  async start() {
    console.log('[ContentScriptServerTransport] 启动 start', this.sessionId)
    // 防止重复启动
    if (this._isStarted) return

    if (this._isClosed) throw new Error('❌️ content server Transport 已关闭，无法重新启动')

    onRuntimeMessage(
      'mcp-client-to-server',
      (data: any) => {
        if (data.sessionId !== this.sessionId || data.tabId !== this.tabId) return

        try {
          console.log('content server transport 即将处理 mcpMessage', data.mcpMessage)
          const mcpMessage = JSONRPCMessageSchema.parse(data.mcpMessage)
          this.onmessage?.(mcpMessage)

          // 判断是否为工具调用
          const toolName = data.mcpMessage.params?.name
          if (toolName) {
            sendWindowMessage(
              'update-page-app-message',
              { status: 'run', message: data.mcpMessage.params?.name },
              'page->content' // 此处应该是 content->content， 但为了和pageServerTransport统一。
            )
          }
        } catch (error) {
          console.log('[ContentScriptServerTransport] 处理消息时发生错误:', error)
        }
      },
      'side->content',
      this.tabId
    )

    this._isStarted = true
  }

  /** 发送消息到 MCP Client */
  async send(message: JSONRPCMessage, _options?: TransportSendOptions): Promise<void> {
    // 检查状态
    this._throwError(() => !this._isStarted, 'server Transport 未启动，无法发送消息')
    this._throwError(() => this._isClosed, 'server Transport 已关闭，无法发送消息')

    try {
      console.log('[ContentScriptServerTransport] 发送消息到 MCP Client', message)
      sendRuntimeMessage(
        'mcp-server-to-client',
        {
          sessionId: this.sessionId,
          mcpMessage: message
        },
        'content->side'
      )

      // 判断是否为工具调用成功了!
      if ('result' in message && message.result?.content) {
        sendWindowMessage(
          'update-page-app-message',
          { status: 'ready', message: '' },
          'page->content' // 此处应该是 content->content， 但为了和pageServerTransport统一。
        )
      }
    } catch (error) {
      this._throwError(() => true, 'server Transport 发送消息失败' + String(error))
    }
  }

  /** 通知 Sidepanel 此 Server 已启动并准备接受连接 */
  async notifyRegistration(serverInfo: ContentScriptServerInfo): Promise<void> {
    if (!this._isStarted) return

    // 保存注册信息，用于 Sidepanel 刷新后重新注册
    this._lastRegistration = serverInfo

    sendRuntimeMessage(
      'mcp-server-register',
      {
        sessionId: this.sessionId,
        serverInfo: {
          ...serverInfo,
          url: window.location.origin,
          title: document.title
        }
      },
      'content->side'
    )
  }

  async close() {
    if (this._isClosed) return

    try {
      this._isClosed = true
      this._isStarted = false
      if (this.onclose) {
        this.onclose()
      }
    } catch (error) {
      this._throwError(() => true, 'server Transport close失败' + String(error))
    }
  }
}

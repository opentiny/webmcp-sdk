import type { Transport, TransportSendOptions } from '@modelcontextprotocol/sdk/shared/transport.js'
import { type JSONRPCMessage, JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js'
import { onRuntimeMessage, sendRuntimeMessage } from './messages'

declare const chrome: any

/**
 * Chrome 扩展客户端 Transport, 用于 Sidepanel 中的标准的 MCP Transport 接口
 * 使用 targetSessionId 连接到特定的 Server
 */
export class ExtensionClientTransport implements Transport {
  // MCP Transport 必需的回调
  onmessage?: (message: JSONRPCMessage) => void // 接收到消息时的回调
  onerror?: (error: Error) => void // 发生错误时的回调
  onclose?: () => void // 连接关闭时的回调

  readonly targetSessionId: string
  private _messageListener: () => void

  // 内部状态
  private _isStarted: boolean = false // 是否已启动
  private _isClosed: boolean = false // 是否已关闭
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

  constructor(targetSessionId: string) {
    this.targetSessionId = targetSessionId

    /** 监听 server 消息 */
    this._messageListener = onRuntimeMessage(
      'mcp-server-to-client',
      (data: { sessionId: string; mcpMessage: any }) => {
        try {
          if (data.sessionId !== this.targetSessionId) return

          const mcpMessage = JSONRPCMessageSchema.parse(data.mcpMessage)
          this.onmessage?.(mcpMessage)
        } catch (error) {
          console.log('【Client Transport】处理server消息错误：', error)
        }
      },
      'content->bg'
    )
  }

  /** 启动 transport，开始监听消息   */
  async start() {
    this._throwError(() => this._isClosed, '【Client Transport】 未启动，无法重新启动')
    this._isStarted = true
  }

  /** 发送消息到 MCP Server  */
  async send(message: JSONRPCMessage, _options?: TransportSendOptions): Promise<void> {
    this._throwError(() => !this._isStarted, '【Client Transport】 未启动，无法发送消息')
    this._throwError(() => this._isClosed, '【Client Transport】 已关闭，无法发送消息')

    // 查询 当前sessionId的最后一个tabid
    let tabId: number | undefined
    if (chrome.sessionRegistry) {
      const sessionInfo = chrome.sessionRegistry.get(this.targetSessionId)
      if (sessionInfo && sessionInfo.tabIds.length > 0) {
        tabId = sessionInfo.tabIds[sessionInfo.tabIds.length - 1]
      }
    } else {
      tabId = await chrome.runtime.sendMessage({ type: 'get-session-tab-id', sessionId: this.targetSessionId })
    }

    this._throwError(() => !tabId, `【Client Transport】后台未找到活动的tabId用于${this.targetSessionId}`)

    sendRuntimeMessage(
      'mcp-client-to-server',
      { sessionId: this.targetSessionId, tabId, mcpMessage: message },
      'bg->content'
    )
  }

  /** 关闭 transport   */
  async close() {
    if (this._isClosed) return

    try {
      this._isClosed = true
      this._isStarted = false
      this._messageListener && this._messageListener()
      this.onclose && this.onclose()
    } catch (error) {
      this._throwError(() => true, '【Client Transport】 关闭时发生错误')
    }
  }
}

import type { Transport, TransportSendOptions } from '@modelcontextprotocol/sdk/shared/transport.js'
import { type JSONRPCMessage, JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js'
import { sendMessage } from 'webext-bridge/popup'

// Chrome 扩展 API 类型声明
declare const chrome: any
declare const browser: any

/**
 * Chrome 扩展客户端 Transport
 * 用于 Sidepanel 中的 MCP Client
 * 实现标准的 MCP Transport 接口
 * 使用 targetSessionId 连接到特定的 Server
 */
export class ExtensionClientTransport implements Transport {
  // MCP Transport 必需的回调
  onmessage?: (message: JSONRPCMessage) => void // 接收到消息时的回调
  onerror?: (error: Error) => void // 发生错误时的回调
  onclose?: () => void // 连接关闭时的回调

  // 目标 sessionId，用于连接到特定的 Server（必需参数）
  readonly targetSessionId: string

  private _tabId: number | null = null
  private _messageListener: (messageOption: any) => void = () => {}

  // 内部状态
  private _isStarted: boolean = false // 是否已启动
  private _isClosed: boolean = false // 是否已关闭

  constructor(targetSessionId: string) {
    // 目标 sessionId，用于连接到特定的 Server（必需参数）
    if (!targetSessionId) {
      throw new Error('targetSessionId is required for ExtensionClientTransport')
    }

    this.targetSessionId = targetSessionId
  }

  // 转发日志
  private async _pageLog(message: string, extra: any = {}) {
    await sendMessage('client-transport-log-event', { message, extra }, 'content-script')
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

    if (this._tabId) {
      const tabIdIsExists = await chrome.tabs.query({ id: this._tabId })
      if (tabIdIsExists.length === 0) {
        throw new Error('Transport 未找到对应的标签页')
      }
    }

    try {
      const sessionInfo = browser.sessionRegistry.get(this.targetSessionId)
      const tabIds = sessionInfo?.tabIds
      const tabId = tabIds && tabIds.length > 0 ? tabIds[tabIds.length - 1] : null

      this._tabId = tabId
      if (!this._tabId) {
        throw new Error('❌️ Server 未注册或已关闭')
      }

      this._messageListener = (messageOption: any) => {
        if (messageOption.type === 'mcp-server-to-client') {
          const data: any = messageOption.data
          if (data.sessionId !== this.targetSessionId) {
            this._pageLog('❌️ 消息缺少 sessionId 不匹配')
            return { success: false, error: 'sessionId 不匹配' }
          }
          if (!data.mcpMessage) {
            this._pageLog('❌️ 消息缺少 mcpMessage 字段')
            return { success: false, error: '消息缺少 mcpMessage 字段' }
          }

          try {
            const mcpMessage = JSONRPCMessageSchema.parse(data.mcpMessage)
            this.onmessage?.(mcpMessage)
            return { success: true }
          } catch (error) {
            this._pageLog('❌️ 处理消息时发生错误:', error)
            return { success: false, error: '处理消息时发生错误' }
          }
        }
      }

      browser.runtime.onMessage.addListener(this._messageListener)

      this._isStarted = true
    } catch (error) {
      this._pageLog(' 启动失败:', error)
      if (this.onerror) {
        this.onerror(error instanceof Error ? error : new Error(String(error)))
      }
      throw error
    }
  }

  /**
   * 发送消息到 MCP Server
   * @param {Object} message - JSONRPC 消息对象
   * @returns {Promise<void>}
   */
  async send(message: JSONRPCMessage, _options?: TransportSendOptions): Promise<void> {
    // 检查状态
    if (!this._isStarted) {
      const error = new Error('Transport 未启动，无法发送消息')
      this._pageLog('Transport 未启动，无法发送消息')

      if (this.onerror) {
        this.onerror(error)
      }
      throw error
    }

    if (this._isClosed) {
      const error = new Error('Transport 已关闭，无法发送消息')
      this._pageLog('Transport 已关闭，无法发送消息')
      if (this.onerror) {
        this.onerror(error)
      }
      throw error
    }

    try {
      // 向所有标签页广播消息（因为不知道 Server 在哪个标签页）
      await sendMessage(
        'mcp-client-to-server',
        {
          sessionId: this.targetSessionId,
          mcpMessage: message
        } as any,
        `content-script@${this._tabId}`
      )
    } catch (error) {
      this._pageLog('发送消息失败:', error)
      const wrappedError = error instanceof Error ? error : new Error(String(error))
      if (this.onerror) {
        this.onerror(wrappedError)
      }
      throw wrappedError
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

    if (this._messageListener) {
      browser.runtime.onMessage.removeListener(this._messageListener)
      this._messageListener = () => {}
    }

    try {
      this._isClosed = true
      this._isStarted = false

      // 触发关闭回调
      if (this.onclose) {
        this.onclose()
      }
    } catch (error) {
      this._pageLog('关闭时发生错误:', error)
      if (this.onerror) {
        this.onerror(error instanceof Error ? error : new Error(String(error)))
      }
      throw error
    }
  }
}

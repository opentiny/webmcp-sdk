import type { Transport, TransportSendOptions } from '@modelcontextprotocol/sdk/shared/transport.js'
import { type JSONRPCMessage, JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js'
import { onMessage, sendMessage } from 'webext-bridge/popup'
// Chrome 扩展 API 类型声明
declare const chrome: any
declare const browser: any

/**
 * Chrome 扩展客户端 Transport
 * 用于 Sidepanel 中的 MCP Client
 * 实现标准的 MCP Transport 接口
 *
 * 使用 targetSessionId 连接到特定的 Server
 */
export class ExtensionClientTransport implements Transport {
  // MCP Transport 必需的回调
  onmessage?: (message: JSONRPCMessage) => void // 接收到消息时的回调
  onerror?: (error: Error) => void // 发生错误时的回调
  onclose?: () => void // 连接关闭时的回调

  // 目标 sessionId，用于连接到特定的 Server（必需参数）
  readonly targetSessionId: string

  // 会话ID，用于标识此 transport 实例
  readonly sessionId: string

  // 连接超时配置
  private _connectTimeout: number = 5000 // 连接超时（5秒）

  private _tabId: number | null = null

  // 内部状态
  private _isStarted: boolean = false // 是否已启动
  private _isClosed: boolean = false // 是否已关闭

  _stopOnMessage: null | (() => void) = null

  constructor(targetSessionId: string) {
    // 目标 sessionId，用于连接到特定的 Server（必需参数）
    if (!targetSessionId) {
      throw new Error('targetSessionId is required for ExtensionClientTransport')
    }

    this.targetSessionId = targetSessionId

    // 会话ID，用于标识此 transport 实例
    this.sessionId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    this._stopOnMessage = onMessage('mcp-server-to-client', (messageOption) => {
      const data: any = messageOption.data
      // 检查 sessionId 是否匹配
      if (data.sessionId !== this.targetSessionId) {
        return { success: false, error: 'sessionId 不匹配' }
      }

      if (!data.mcpMessage) {
        console.error('[ExtensionClientTransport] 消息缺少 mcpMessage 字段')
        return { success: false, error: '消息缺少 mcpMessage 字段' }
      }

      try {
        // 调用 MCP Client 的消息处理器
        if (this.onmessage) {
          const mcpMessage = JSONRPCMessageSchema.parse(data.mcpMessage)
          this.onmessage(mcpMessage)
          return { success: true }
        } else {
          console.warn('[ExtensionClientTransport] onmessage 回调未设置')
          return { success: false, error: 'onmessage 回调未设置' }
        }
      } catch (error) {
        console.error('[ExtensionClientTransport] 处理消息时发生错误:', error)
        if (this.onerror) {
          this.onerror(error instanceof Error ? error : new Error(String(error)))
        }
        return { success: false, error: '处理消息时发生错误' }
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

    if (this._tabId) {
      const tabIdIsExists = await chrome.tabs.query({ id: this._tabId })
      if (tabIdIsExists.length === 0) {
        throw new Error('Transport 未找到对应的标签页')
      }
    }

    try {
      const tabId = browser.sessionRegistry.get(this.targetSessionId)?.tabId
      this._tabId = tabId ?? null
      if (!this._tabId) {
        throw new Error('Server 未注册或已关闭')
      }

      this._isStarted = true
    } catch (error) {
      console.error('[ExtensionClientTransport] 启动失败:', error)
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
      console.error('[ExtensionClientTransport]', error.message)
      if (this.onerror) {
        this.onerror(error)
      }
      throw error
    }

    if (this._isClosed) {
      const error = new Error('Transport 已关闭，无法发送消息')
      console.error('[ExtensionClientTransport]', error.message)
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
      console.error('[ExtensionClientTransport] 发送消息失败:', error)
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
    debugger
    // 防止重复关闭
    if (this._isClosed) {
      return
    }

    try {
      this._isClosed = true
      this._isStarted = false
      this._stopOnMessage && this._stopOnMessage()

      // 触发关闭回调
      if (this.onclose) {
        this.onclose()
      }
    } catch (error) {
      console.error('[ExtensionClientTransport] 关闭时发生错误:', error)
      if (this.onerror) {
        this.onerror(error instanceof Error ? error : new Error(String(error)))
      }
      throw error
    }
  }
}

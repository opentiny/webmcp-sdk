import type { Transport, TransportSendOptions } from '@modelcontextprotocol/sdk/shared/transport.js'
import { type JSONRPCMessage, JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js'

// Chrome 扩展 API 类型声明
declare const chrome: any

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

  // 内部状态
  private _messageListener: ((message: any, sender: any, sendResponse: any) => boolean) | null = null // 消息监听器引用
  private _isStarted: boolean = false // 是否已启动
  private _isClosed: boolean = false // 是否已关闭

  constructor(targetSessionId: string) {
    // 目标 sessionId，用于连接到特定的 Server（必需参数）
    if (!targetSessionId) {
      throw new Error('targetSessionId is required for ExtensionClientTransport')
    }

    this.targetSessionId = targetSessionId

    // 会话ID，用于标识此 transport 实例
    this.sessionId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
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
      // 创建消息监听器
      this._messageListener = (message, sender, sendResponse) => {
        // 只处理来自目标 sessionId 的 MCP 消息
        if (message.type === 'mcp-server-to-client') {
          // 检查 sessionId 是否匹配
          if (message.sessionId !== this.targetSessionId) {
            console.log('[ExtensionClientTransport] sessionId 不匹配，忽略')
            return true
          }

          if (!message.mcpMessage) {
            console.error('[ExtensionClientTransport] 消息缺少 mcpMessage 字段')
            return true
          }

          try {
            // 调用 MCP Client 的消息处理器
            if (this.onmessage) {
              const mcpMessage = JSONRPCMessageSchema.parse(message.mcpMessage)
              this.onmessage(mcpMessage)
            } else {
              console.warn('[ExtensionClientTransport] onmessage 回调未设置')
            }
          } catch (error) {
            console.error('[ExtensionClientTransport] 处理消息时发生错误:', error)
            if (this.onerror) {
              this.onerror(error instanceof Error ? error : new Error(String(error)))
            }
          }
        }

        return true // 保持消息通道打开（异步响应）
      }

      // 注册消息监听器
      chrome.runtime.onMessage.addListener(this._messageListener)

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
      // 每个页面的 content script 会根据 sessionId 路由到正确的 Server
      const tabs = await chrome.tabs.query({})
      console.log('[ExtensionClientTransport] 向', tabs.length, '个标签页广播消息')

      let sent = false
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs
            .sendMessage(tab.id, {
              type: 'mcp-client-to-server',
              sessionId: this.targetSessionId,
              mcpMessage: message
            })
            .then(() => {
              if (!sent) {
                sent = true
                console.log('[ExtensionClientTransport] ✅ 消息已发送到标签页:', tab.id)
              }
            })
            .catch((error: Error) => {
              // 某些标签页没有 content script，忽略
              if (!error.message.includes('Receiving end does not exist')) {
                console.error('[ExtensionClientTransport] 发送到标签页', tab.id, '失败:', error)
              }
            })
        }
      }
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
    // 防止重复关闭
    if (this._isClosed) {
      return
    }

    try {
      // 移除消息监听器
      if (this._messageListener) {
        chrome.runtime.onMessage.removeListener(this._messageListener)
        this._messageListener = null
      }

      this._isClosed = true
      this._isStarted = false

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

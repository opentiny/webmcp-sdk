import { onMessage, sendMessage } from 'webext-bridge/content-script'

export default defineContentScript({
  // matches: ["<all_urls>"],
  // matches: ["*://*/*"],
  matches: ['*://*/*'],
  runAt: 'document_end',
  async main() {
    /**
     * Content Script 作为消息桥梁
     * 负责在页面脚本（MCP Server）和 Sidepanel（MCP Client）之间转发 MCP 消息
     * 使用 sessionId 进行消息路由
     */

    // ============================================
    // 1. 监听来自页面脚本的消息（MCP Server → MCP Client）
    // ============================================
    window.addEventListener('message', (event) => {
      // 验证消息来源（必须来自当前窗口）
      if (event.source !== window) {
        return
      }

      // 检查消息数据是否存在
      if (!event.data || !event.data.type) {
        return
      }

      // 处理 MCP Server 发送的消息，转发到 Sidepanel
      if (event.data.type === 'mcp-server-to-client') {
        if (!event.data.mcpMessage) {
          console.error('[main.js] 消息缺少 mcpMessage 字段')
          return
        }

        // 转发到 Sidepanel
        chrome.runtime
          .sendMessage({
            type: 'mcp-server-to-client',
            sessionId: event.data.sessionId,
            mcpMessage: event.data.mcpMessage
          })
          .then(() => {
            console.log('[main.js] ✅ 消息已转发到 Sidepanel')
          })
          .catch((error) => {
            // 如果 Sidepanel 未打开，静默忽略
            if (
              !error.message.includes('message channel closed') &&
              !error.message.includes('Receiving end does not exist')
            ) {
              console.error('[main.js] 转发消息失败:', error)
            }
          })
      }

      // 处理 MCP Server 注册消息，转发到 Sidepanel
      if (event.data.type === 'mcp-server-register') {
        if (!event.data.serverInfo) {
          console.error('[main.js] 注册消息缺少 serverInfo 字段')
          return
        }

        // 转发注册消息到 Sidepanel
        chrome.runtime
          .sendMessage({
            type: 'mcp-server-register',
            sessionId: event.data.sessionId,
            serverInfo: event.data.serverInfo
          })
          .catch((error) => {
            // 如果 Sidepanel 未打开，静默忽略
            if (
              !error.message.includes('message channel closed') &&
              !error.message.includes('Receiving end does not exist')
            ) {
              console.error('[main.js] 转发注册失败:', error)
            }
          })
      }
    })

    // ============================================
    // 2. 监听来自 Sidepanel 的消息（MCP Client → MCP Server）
    // ============================================
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // 处理 Sidepanel 就绪消息（用于重新发现服务器）
      if (message.type === 'sidepanel-ready') {
        // 转发到页面脚本
        window.postMessage(
          {
            type: 'sidepanel-ready',
            timestamp: message.timestamp
          },
          window.location.origin
        )

        sendResponse({ success: true })
        return true
      }

      // 处理 MCP Client 发送的消息，转发到页面脚本
      if (message.type === 'mcp-client-to-server') {
        if (!message.mcpMessage) {
          console.error('[main.js] 消息缺少 mcpMessage 字段')
          sendResponse({ success: false, error: '缺少 mcpMessage 字段' })
          return true
        }

        try {
          // 转发到页面脚本
          window.postMessage(
            {
              type: 'mcp-client-to-server',
              sessionId: message.sessionId,
              mcpMessage: message.mcpMessage
            },
            window.location.origin
          )

          console.log('[main.js] ✅ 消息已转发到页面')
          sendResponse({ success: true })
        } catch (error) {
          console.error('[main.js] 转发失败:', error)
          sendResponse({ success: false, error: error.message })
        }
      }

      return true
    })

    // 1、 内容脚本初始化，若匹配
    const initWebMCP = async () => {
      const originUrl = window.location.origin
      const replay = await sendMessage('initWebMCP', { originUrl }, 'background')

      contentLog(replay.msg)()
    }

    await initWebMCP()
  }
})

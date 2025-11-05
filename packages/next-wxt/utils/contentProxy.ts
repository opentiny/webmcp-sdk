export const createContentProxy = () => {
  window.addEventListener('message', (event) => {
    if (event.data.type === 'mcp-server-to-client') {
      const { sessionId, mcpMessage } = event.data.data
      browser.runtime.sendMessage({
        type: 'mcp-server-to-client',
        data: {
          sessionId,
          mcpMessage
        } as any
      })
    }

    if (event.data.type === 'mcp-server-register') {
      const { sessionId, serverInfo } = event.data.data
      browser.runtime.sendMessage({
        type: 'mcp-server-register',
        data: {
          sessionId,
          serverInfo
        } as any
      })
    }
  })

  browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'mcp-client-to-server') {
      const { sessionId, mcpMessage } = message.data
      window.postMessage({ type: 'mcp-client-to-server', data: { sessionId, mcpMessage } }, '*')
    }

    if (message.type === 'sidepanel-ready') {
      const { timestamp } = message.data
      window.postMessage({ type: 'sidepanel-ready', data: { timestamp } }, '*')
    }
  })
}

export const createContentProxy = (tabId: number) => {
  // 页面 ===》 content
  onWindowMessage(
    'mcp-server-to-client-from-page',
    (data) => sendRuntimeMessage('mcp-server-to-client', data, 'content->side'),
    'page->content'
  )

  onWindowMessage(
    'mcp-server-register-from-page',
    (data) => sendRuntimeMessage('mcp-server-register', data, 'content->side'),
    'page->content'
  )

  // side ====> content
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'mcp-client-to-server') {
      const { sessionId, mcpMessage } = message.data
      window.postMessage({ type: 'mcp-client-to-server', data: { sessionId, mcpMessage } }, '*')
    }
  })

  onRuntimeMessage(
    'mcp-client-to-server',
    (data) => sendWindowMessage('mcp-client-to-server-to-page', data, 'content->page'),
    'side->content',
    tabId
  )

  onRuntimeMessage(
    'sidepanel-ready',
    () => sendWindowMessage('sidepanel-ready-to-page', {}, 'content->page'),
    'side->content',
    tabId
  )
}

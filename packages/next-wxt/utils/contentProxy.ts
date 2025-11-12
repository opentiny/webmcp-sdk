export const createContentProxy = (tabId: number) => {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'execute-tool-from-sidepanel-to-content') {
      window.postMessage(message, '*')
      return true
    }
  })

  window.addEventListener('message', (event) => {
    if (event.data.type === 'define-tool-from-page-to-content') {
      debugger
      sendRuntimeMessage('define-tool-from-content-to-sidepanel', event.data.data, 'content->side')
    }
  })
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

  // 回复Main Page 当前的tabId
  onWindowMessage(
    'ask-tabid',
    () => sendWindowMessage('answer-tabid', { tabId }, 'content->page'), //
    'page->content'
  )
}

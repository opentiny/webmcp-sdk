export const createContentProxy = (tabId: number) => {
  console.log('【Content Proxy】 createContentProxy', tabId)
  const pendingToolResponses = new Map<string, (response: any) => void>() // 保存等待返回的执行请求

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'execute-tool-from-sidepanel-to-content') {
      const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}` // 生成简单唯一ID
      pendingToolResponses.set(requestId, sendResponse)
      const toolName = message.data?.[0] // 取得工具名称，触发页面动画
      if (toolName) {
        sendWindowMessage('update-page-app-message', { status: 'run', message: toolName }, 'page->content')
      }
      window.postMessage({ ...message, requestId }, '*')
      return true
    }
  })

  onWindowMessage(
    'execute-tool-from-content-to-sidepanel',
    (data) => {
      const { requestId, result } = data
      const responder = pendingToolResponses.get(requestId)
      if (responder) {
        responder(result)
        pendingToolResponses.delete(requestId)
        sendWindowMessage('update-page-app-message', { status: 'ready', message: '' }, 'page->content') // 工具执行完成后恢复动画状态
      }
    },
    'page->content'
  )

  window.addEventListener('message', (event) => {
    if (event.data.type === 'define-tool-from-page-to-content') {
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
    () => {
      sendWindowMessage('answer-tabid', { tabId }, 'content->page')
      console.log('【Content Proxy】 ask-tabid', tabId)
    },
    'page->content'
  )
}

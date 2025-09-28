// 设置侧边栏行为
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => {
    console.error('设置侧边栏行为失败:', error)
  })
})

const USER_SCRIPT_ID = 'default'

const init = async (url, originUrl) => {
  const script = await fetch(url).then((res) => res.text())
  const existingScripts = await chrome.userScripts.getScripts({
    ids: [url]
  })

  if (existingScripts.length > 0) {
    // Update existing script.
    await chrome.userScripts.update([
      {
        id: url,
        matches: [`${originUrl}/*`],
        js: [{ code: script }],
        world: 'MAIN'
      }
    ])

    return { type: 'update' }
  } else {
    // Register new script.
    await chrome.userScripts.register([
      {
        id: url,
        matches: [`${originUrl}/*`],
        js: [{ code: script }],
        world: 'MAIN'
      }
    ])

    return { type: 'register' }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'initWebMCP') {
    console.log('收到 initWebMCP 消息:', message.data)

    // 异步处理，使用 sendResponse 回调
    init(message.data.url, message.data.originUrl)
      .then(() => {
        console.log('WebMCP 初始化成功')
        sendResponse({ success: true })
      })
      .catch((error) => {
        console.error('WebMCP 初始化失败:', error)
        sendResponse({ success: false, error: error.message })
      })

    // 返回 true 表示异步处理，保持消息通道开放
    return true
  }
})

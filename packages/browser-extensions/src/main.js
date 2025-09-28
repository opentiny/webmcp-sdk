const initWebMCP = () => {
  const urlToolsMap = {
    'https://opentiny.design': chrome.runtime.getURL('src/mcp-servers/opentiny.design/index.js')
  }

  const originUrl = window.location.origin

  const url = urlToolsMap[originUrl]
  if (!url) {
    return
  }

  chrome.runtime.sendMessage(
    {
      type: 'initWebMCP',
      data: {
        url,
        originUrl
      }
    },
    (response) => {
      // 使用回调函数接收 service worker 的响应
      if (response && response.success) {
        console.log('WebMCP 初始化成功')

        // 将 WebMCP 对象注入到页面的 window 对象，供 userScripts 使用
        try {
          // 直接注入 next-sdk.js 到页面环境，让 WebMCP 在页面中重新初始化
          const script = document.createElement('script')
          script.src = chrome.runtime.getURL('src/vendor/next-sdk.js')
          script.onload = () => {
            console.log('next-sdk.js 已成功注入到页面环境，WebMCP 现在可在页面中使用')
          }
          script.onerror = () => {
            console.error('注入 next-sdk.js 到页面环境失败')
          }

          // 注入到页面文档中
          ;(document.head || document.documentElement).appendChild(script)

          console.log('WebMCP 注入脚本已执行')
        } catch (error) {
          console.error('注入 WebMCP 到页面环境失败:', error)
        }
      } else if (response && response.error) {
        console.error('WebMCP 初始化失败:', response.error)
      } else {
        console.error('未收到有效的响应')
      }
    }
  )
}

initWebMCP()

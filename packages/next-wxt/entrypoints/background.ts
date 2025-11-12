export default defineBackground(() => {
  // 未整改该事件，因为此处需要返回值
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'inject-mcp-scripts') {
      const { hostname } = message
      try {
        injectMainScript(hostname).then((success: boolean) => {
          sendResponse({ success, hostname })
        })
      } catch (error: any) {
        console.error('脚本注入失败:', error)
        sendResponse({ success: false, hostname, error })
      }
      return true
    }

    if (message.type === 'inject-tools-script') {
      const { hostname } = message
      try {
        injectToolsScript(hostname).then((success: boolean) => {
          sendResponse({ success, hostname })
        })
      } catch (error: any) {
        console.error('脚本注入失败:', error)
        sendResponse({ success: false, hostname, error })
      }
      return true
    }
  })

  onRuntimeMessage(
    'focus-current-tab',
    async (_, sender) => await browser.tabs.update(sender.tab?.id, { active: true }),
    'content->bg'
  )

  // 自动返回sender 给 content-script
  onRuntimeMessage('who-am-i', () => {}, 'content->bg')
})

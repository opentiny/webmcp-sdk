export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'inject-mcp-scripts') {
      const { hostname } = message
      try {
        injectMainScript(hostname).then((success: boolean) => {
          sendResponse({ success, hostname })
        })
      } catch (error: any) {
        sendResponse({ success: false, hostname, error })
      }
      return true
    }
  })

  onRuntimeMessage(
    'inject-mcp-scripts',
    async (_, sender) => await browser.tabs.update(sender.tab?.id, { active: true }),
    'content->bg'
  )

  onRuntimeMessage(
    'focus-current-tab',
    async (_, sender) => await browser.tabs.update(sender.tab?.id, { active: true }),
    'content->bg'
  )

  // 自动返回sender 给 content-script
  onRuntimeMessage('who-am-i', () => {}, 'content->bg')
})

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message.type === 'focus-current-tab') {
      const id = sender.tab?.id
      try {
        await browser.tabs.update(id, { active: true })
      } catch (error) {
        console.error('切换页签失败', error)
      }
      return
    }

    if (message.type === 'initWebMCP') {
      const { hostname } = message.data
      try {
        const success = await injectMainScript(hostname)
        return Promise.resolve({ success, hostname, timestamp: Date.now() })
      } catch (error: any) {
        console.error('脚本注入失败:', error)
        return Promise.resolve({ success: false, error: error?.message || '未知错误' })
      }
    }
  })

  // 自动返回sender 给 content-script
  onRuntimeMessage('who-am-i', () => {}, 'content->bg')
})

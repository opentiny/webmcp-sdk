export default defineBackground(() => {
  browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message.type === 'page-app-message-to-background') {
      const id = sender.tab?.id
      try {
        await browser.tabs.update(id, { active: true })
      } catch (error) {
        console.error('切换页签失败', error)
      }
    }
  })
})

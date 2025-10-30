import { onMessage } from 'webext-bridge/background'

export default defineBackground(() => {
  initLog().then(() => {
    insertLog('background', 'Hello background!', { id: browser.runtime.id })

    // 1、监听子页面initWebMCP 消息
    onMessage('initWebMCP', async ({ data }) => {
      const { originUrl } = data
      insertLog('background', `${originUrl} 页面initWebMCP,即将插入页面js `)

      return (await injectMainScript(originUrl as keyof typeof injectUrls))
        ? { success: true, msg: 'initWebMCP 初始化成功,已插入脚本:' + originUrl }
        : { success: false, msg: `initWebMCP 初始化,插入脚本${originUrl}失败` }
    })

    // 2、监听页签聚焦请求
    onMessage('focus-tab', async ({ sender }) => {
      const { tabId } = sender
      try {
        const tab = await browser.tabs.get(tabId)

        await browser.windows.update(tab.windowId, { focused: true })
        await browser.tabs.update(tabId, { active: true })

        insertLog('background', `已切换到 tab ${tabId}`)
      } catch (error) {
        insertLog('background', `切换页签失败`, error as any)
      }
    })
  })
})

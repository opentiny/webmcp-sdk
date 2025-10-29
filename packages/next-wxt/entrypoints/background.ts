import { onMessage } from 'webext-bridge/background'

export default defineBackground(() => {
  // 1、监听子页面initWebMCP 消息
  onMessage('initWebMCP', async ({ data }) => {
    const { originUrl } = data
    console.log(`${originUrl} 页面initWebMCP,即将插入页面js `)

    return (await injectMainScript(originUrl as keyof typeof injectUrls))
      ? { success: true, msg: 'WebMCP 初始化成功,已插入脚本:' + originUrl }
      : { success: false, msg: `WebMCP 初始化,插入脚本${originUrl}失败` }
  })

  // 2、监听页签聚焦请求
  onMessage('focus-tab', async ({ sender }) => {
    const { tabId } = sender as { tabId: number }
    try {
      // 获取 tab 信息以得到 windowId
      const tab = await browser.tabs.get(tabId)

      // 先聚焦窗口
      await browser.windows.update(tab.windowId, { focused: true })

      // 再激活页签
      await browser.tabs.update(tabId, { active: true })

      console.log(`已切换到 tab ${tabId}`)
    } catch (error) {
      console.error('切换页签失败:', error)
    }
  })
})

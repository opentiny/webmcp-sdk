import { onMessage } from 'webext-bridge/background'

export default defineBackground(async () => {
  console.log('Hello background!', { id: browser.runtime.id })

  // 1、监听子页面initWebMCP 消息
  onMessage('initWebMCP', async ({ data }) => {
    const { originUrl } = data
    bgLog(`${originUrl} 页面initWebMCP `)()

    return (await injectMainScript(originUrl as keyof typeof injectUrls))
      ? { success: true, msg: 'WebMCP 初始化成功,已插入脚本:' + originUrl }
      : { success: false, msg: `WebMCP 初始化,插入脚本${originUrl}失败` }
  })
})

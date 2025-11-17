import { z } from '@opentiny/next-sdk'
import { tool } from 'ai'

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const openUrl = tool({
  description: '打开新网址',
  inputSchema: z.object({
    url: z.string().url()
  }),
  execute: async ({ url }) => {
    await browser.tabs.create({ url })

    // 等待 content script 初始化完成并注册到 hostNameMap
    await (browser as any).waitForHostInit(url)
    // await delay(1000) // 等待新页面的工具注册

    return { data: '打开网址成功' }
  }
})

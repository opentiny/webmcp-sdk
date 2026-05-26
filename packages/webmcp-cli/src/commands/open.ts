import { connectBrowser, getTargetPage } from '../browser'
import pc from 'picocolors'

export async function openCommand(url: string, { tabid, newTab }: { tabid?: number, newTab?: boolean }) {
  const browser = await connectBrowser()
  try {
    let page;
    if (newTab) {
      page = await browser.newPage()
    } else {
      page = await getTargetPage(browser, tabid)
    }

    // 格式化 URL，补全协议
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    console.log(pc.cyan(`正在打开: ${url}`))
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    
    return {
      success: true,
      url: page.url(),
      title: await page.title()
    }
  } finally {
    await browser.disconnect()
  }
}

import { connectBrowser, getTargetPage, injectIntoPage } from '../browser'
import pc from 'picocolors'

export async function openCommand(url: string, { tabid, newTab }: { tabid?: string, newTab?: boolean }) {
  const browser = await connectBrowser()
  try {
    let page;
    if (newTab) {
      page = await browser.newPage()
    } else {
      // 仅用于获取目标 page 对象，不在这里注入（注入要在导航完成后）
      const pages = await browser.pages()
      page = pages.length > 0 ? pages[pages.length - 1] : await browser.newPage()
      if (tabid !== undefined && tabid >= 0 && tabid < pages.length) {
        page = pages[tabid]
      }
    }

    // 格式化 URL，补全协议
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    console.log(pc.cyan(`正在打开: ${url}`))
    // 先导航到目标页面
    await page.goto(url, { waitUntil: 'domcontentloaded' })

    // 导航完成后再注入 polyfill + 域名工具（此时 hostname 已是目标域名）
    await injectIntoPage(page)

    return {
      success: true,
      url: page.url(),
      title: await page.title()
    }
  } finally {
    await browser.disconnect()
  }
}

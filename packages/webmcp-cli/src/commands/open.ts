import { connectBrowser, getTargetPage, injectIntoPage } from '../browser'
import pc from 'picocolors'

export async function openCommand(url: string, { tabid, newTab }: { tabid?: string, newTab?: boolean }) {
  const browser = await connectBrowser()
  try {
    let page;
    if (newTab) {
      console.log(pc.yellow('openCommand: 正在创建新页面...'))
      page = await browser.newPage()
    } else {
      console.log(pc.yellow('openCommand: 获取浏览器 targets...'))
      const targets = browser.targets()
      const pageTargets = targets.filter(t => {
        try {
          const type = (typeof t.type === 'function' ? t.type() : (t as any).type) || ''
          const urlStr = (typeof t.url === 'function' ? t.url() : (t as any).url) || ''
          return type === 'page' && !urlStr.startsWith('devtools://')
        } catch {
          return false
        }
      })
      console.log(pc.yellow(`openCommand: 普通页面 targets 数量: ${pageTargets.length}`))

      let selectedTarget;
      if (tabid !== undefined) {
        console.log(pc.yellow(`openCommand: 正在匹配指定的 tabid: ${tabid}...`))
        selectedTarget = pageTargets.find(t => {
          const tid = typeof (t as any)._getTargetInfo === 'function'
            ? (t as any)._getTargetInfo().targetId
            : ((t as any)._targetId || (t as any).targetId || '')
          return tid === tabid || tid.includes(tabid)
        })
      }

      if (selectedTarget) {
        console.log(pc.yellow('openCommand: 正在将匹配的 target 转换为 page...'))
        page = await selectedTarget.page()
      } else if (pageTargets.length > 0) {
        console.log(pc.yellow('openCommand: 正在将最后一个 target 转换为 page...'))
        page = await pageTargets[pageTargets.length - 1].page()
      }

      if (!page) {
        console.log(pc.yellow('openCommand: 没有找到可用 page，正在创建新页面...'))
        page = await browser.newPage()
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

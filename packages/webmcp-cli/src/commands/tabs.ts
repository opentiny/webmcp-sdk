import { connectBrowser, getTargetPage, injectIntoPage, getPageTargetId, findPageTargetByTabId, activateTabById } from '../browser'
import pc from 'picocolors'

function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url
  }
  return url
}

export async function tabsOpenCommand(url: string) {
  const browser = await connectBrowser()
  try {
    const page = await browser.newPage()
    url = normalizeUrl(url)

    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await injectIntoPage(page)
    await new Promise(resolve => setTimeout(resolve, 500))
    return {
      success: true,
      tabid: await getPageTargetId(page),
      url: page.url(),
      title: await page.title()
    }
  } finally {
    await browser.disconnect()
  }
}

export async function tabsCloseCommand(tabid: string) {
  const browser = await connectBrowser()
  try {
    const target = findPageTargetByTabId(browser, tabid)
    if (!target) {
      throw new Error(`Tab with targetId "${tabid}" not found.`)
    }

    const page = await target.page()
    if (!page) {
      throw new Error(`Tab with targetId "${tabid}" not found.`)
    }

    const closedTabid = await getPageTargetId(page).catch(() => tabid)
    await page.close()

    return {
      success: true,
      tabid: closedTabid
    }
  } finally {
    await browser.disconnect()
  }
}

export async function tabsSwitchCommand(tabid: string) {
  const browser = await connectBrowser()
  try {
    await activateTabById(browser, tabid)
    const page = await getTargetPage(browser, tabid)

    return {
      success: true,
      tabid: await getPageTargetId(page),
      url: page.url(),
      title: await page.title()
    }
  } finally {
    await browser.disconnect()
  }
}

export async function tabsBackCommand(tabid?: string) {
  const browser = await connectBrowser()
  try {
    const page = await getTargetPage(browser, tabid)
    const response = await page.goBack()

    if (!response) {
      return {
        success: false,
        error: '无法后退：已在历史记录起点',
        tabid: await getPageTargetId(page).catch(() => tabid),
        url: page.url(),
        title: await page.title()
      }
    }

    await injectIntoPage(page)

    return {
      success: true,
      tabid: await getPageTargetId(page),
      url: page.url(),
      title: await page.title()
    }
  } finally {
    await browser.disconnect()
  }
}

export async function tabsForwardCommand(tabid?: string) {
  const browser = await connectBrowser()
  try {
    const page = await getTargetPage(browser, tabid)
    const response = await page.goForward()

    if (!response) {
      return {
        success: false,
        error: '无法前进：已在历史记录末尾',
        tabid: await getPageTargetId(page).catch(() => tabid),
        url: page.url(),
        title: await page.title()
      }
    }

    await injectIntoPage(page)

    return {
      success: true,
      tabid: await getPageTargetId(page),
      url: page.url(),
      title: await page.title()
    }
  } finally {
    await browser.disconnect()
  }
}

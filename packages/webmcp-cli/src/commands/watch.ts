import type { Browser, Page, Target } from 'puppeteer-core'
import pc from 'picocolors'
import { connectBrowser, injectIntoPage } from '../browser'
import {
  clearWatcherPid,
  shouldPrepareWatcherUrl,
  writeWatcherPid,
} from '../watcher-process'
import { readInjectBundleOrThrow } from '../inject-bundle-path'
import { ensureWatcherPageListeners } from '../watcher-page-listeners'

const preparedPages = new WeakSet<Page>()

function getInjectScript(): string {
  return readInjectBundleOrThrow()
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** 当前文档是否可执行 inject（需 http/https；blank/newtab 仅 prepare 不 inject） */
function canInjectNow(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}

async function waitForPage(target: Target, attempts = 30): Promise<Page | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const page = await target.page()
      if (page) return page
    } catch {
      /* retry */
    }
    await sleep(100)
  }
  return null
}

async function preparePage(page: Page, script: string): Promise<void> {
  let url = ''
  try {
    url = page.url()
  } catch {
    return
  }
  if (!shouldPrepareWatcherUrl(url)) return

  try {
    const firstPrep = !preparedPages.has(page)
    if (firstPrep) {
      // 先占位并挂监听，再 await evaluateOnNewDocument（避免并发双挂）
      ensureWatcherPageListeners(page, () => {
        void safeInject(page)
      }, preparedPages)
      try {
        await page.evaluateOnNewDocument(script)
      } catch (err: unknown) {
        // chrome://newtab 上偶发失败：仍挂导航监听，导航到 http 后再 injectIntoPage
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(pc.yellow(`watcher: evaluateOnNewDocument 失败 (${url}): ${msg}`))
      }
    }
    await safeInject(page)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(pc.yellow(`watcher: 准备页面失败 (${url}): ${msg}`))
  }
}

async function safeInject(page: Page): Promise<void> {
  let url = ''
  try {
    url = page.url()
  } catch {
    return
  }
  if (!canInjectNow(url)) return
  try {
    await injectIntoPage(page)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(pc.yellow(`watcher: inject 跳过 (${url}): ${msg}`))
  }
}

async function handleTarget(target: Target, script: string): Promise<void> {
  try {
    if (target.type() !== 'page') return
    const page = await waitForPage(target)
    if (!page) {
      console.warn(pc.yellow('watcher: target 无 page 对象，放弃'))
      return
    }
    await preparePage(page, script)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(pc.yellow(`watcher: 处理 target 失败: ${msg}`))
  }
}

async function attachToBrowser(browser: Browser, script: string): Promise<void> {
  const pages = await browser.pages()
  for (const page of pages) {
    await preparePage(page, script)
  }

  browser.on('targetcreated', (target) => {
    void handleTarget(target, script)
  })

  // 新标签常先是 chrome://newtab，随后 URL 变化；补一次准备/注入
  browser.on('targetchanged', (target) => {
    void handleTarget(target, script)
  })
}

/**
 * 常驻守护：监听页签创建与导航并自动注入 WebMCP。
 * 由 ensureInjectWatcher 后台拉起，也可手动 `webmcp-cli watch`。
 */
export async function watchCommand(): Promise<void> {
  process.env.WEBMCP_WATCHER_CHILD = '1'
  writeWatcherPid(process.pid)

  const cleanup = () => {
    clearWatcherPid(process.pid)
  }
  process.on('exit', cleanup)
  process.on('SIGINT', () => {
    cleanup()
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    cleanup()
    process.exit(0)
  })

  const script = getInjectScript()
  console.log(pc.cyan('inject watcher: 正在连接浏览器…'))
  const browser = await connectBrowser()
  console.log(pc.green('inject watcher: 已连接，开始监听页签（含手动新开标签）'))

  await attachToBrowser(browser, script)

  const exitWatcher = (reason: string) => {
    console.log(pc.yellow(`inject watcher: ${reason}，退出`))
    cleanup()
    process.exit(0)
  }

  browser.on('disconnected', () => {
    exitWatcher('浏览器 CDP 已断开')
  })

  // 兜底：部分环境下关浏览器不一定立刻触发 disconnected，定期探活
  const HEALTH_INTERVAL_MS = 5_000
  const healthTimer = setInterval(() => {
    void (async () => {
      try {
        // puppeteer-core：连接断开后 connected 为 false；再调 version 会抛错
        if ((browser as Browser & { connected?: boolean }).connected === false) {
          clearInterval(healthTimer)
          exitWatcher('浏览器连接已失效')
          return
        }
        await browser.version()
      } catch {
        clearInterval(healthTimer)
        exitWatcher('浏览器探活失败（可能已关闭）')
      }
    })()
  }, HEALTH_INTERVAL_MS)
  // 不阻止进程退出
  if (typeof healthTimer.unref === 'function') healthTimer.unref()

  await new Promise<void>(() => {})
}

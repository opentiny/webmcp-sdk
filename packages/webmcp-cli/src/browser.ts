import puppeteer, { Browser, Page } from 'puppeteer-core'
import pc from 'picocolors'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'

const CDP_PORT = 9222
// 使用 localhost 以兼容 IPv4/IPv6 绑定
const CDP_URL = `http://localhost:${CDP_PORT}`

function getDefaultChromePath(): string | null {
  const platform = os.platform()
  if (platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  } else if (platform === 'win32') {
    const paths = [
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe'
    ]
    return paths.find(p => fs.existsSync(p)) || null
  } else {
    // Linux
    const paths = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser']
    return paths.find(p => fs.existsSync(p)) || null
  }
}

async function startChromeInBackground(): Promise<void> {
  const chromePath = getDefaultChromePath()
  if (!chromePath || !fs.existsSync(chromePath)) {
    throw new Error('无法在系统中找到 Chrome 浏览器的默认安装路径。')
  }

  console.log(pc.yellow(`正在启动后台 Chrome 实例 (端口: ${CDP_PORT})...`))
  
  // 用户可以通过 --workspace CLI 选项或 WEBMCP_WORKSPACE 环境变量自定义。
  const userDataDir = process.env.WEBMCP_WORKSPACE || path.join(os.homedir(), '.webmcp_chrome_profile')
  
  const child = spawn(
    chromePath,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check'
    ],
    {
      detached: true,
      stdio: 'ignore'
    }
  )

  child.unref() // 让子进程脱离父进程独立运行

  // 轮询等待 CDP 端口就绪
  for (let i = 0; i < 20; i++) {
    try {
      // 尝试 127.0.0.1 和 localhost，兼容不同 Node 版本的 fetch 行为
      const urls = [`http://localhost:${CDP_PORT}/json/version`, `http://127.0.0.1:${CDP_PORT}/json/version`]
      for (const url of urls) {
        try {
          const response = await fetch(url)
          if (response.ok) {
            console.log(pc.green('Chrome 启动并就绪。'))
            return
          }
        } catch (err) {}
      }
    } catch (e) {
      // 忽略连接错误，继续重试
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  throw new Error('Chrome 启动超时，无法连接到 CDP 端口。')
}

export async function connectBrowser(): Promise<Browser> {
  try {
    // 优先尝试通过 localhost 连接
    const browser = await puppeteer.connect({
      browserURL: `http://localhost:${CDP_PORT}`,
      defaultViewport: null,
    })
    return browser
  } catch (error: any) {
    try {
      // 尝试使用 127.0.0.1 连接（有时候 puppeteer 在某些系统对 localhost 解析异常）
      return await puppeteer.connect({
        browserURL: `http://127.0.0.1:${CDP_PORT}`,
        defaultViewport: null,
      })
    } catch (error2: any) {
      // 连接失败时，尝试唤起浏览器
      try {
        await startChromeInBackground()
        // 再次尝试连接
        try {
          return await puppeteer.connect({
            browserURL: `http://localhost:${CDP_PORT}`,
            defaultViewport: null,
          })
        } catch (e) {
          return await puppeteer.connect({
            browserURL: `http://127.0.0.1:${CDP_PORT}`,
            defaultViewport: null,
          })
        }
      } catch (launchError: any) {
        console.error(pc.red(`无法连接或启动浏览器: ${launchError.message}`))
        console.error(pc.yellow(`💡 提示：由于我们要使用你日常的默认浏览器（包含你的书签和登录态），如果你的 Chrome 目前正处于打开状态，它会拒绝使用带有调试端口的新参数启动。`))
        console.error(pc.yellow(`👉 解决办法：请先完全退出当前的 Chrome 浏览器（在 Mac 上按 Cmd+Q），然后再重新运行命令。`))
        throw new Error('Browser connection failed.')
      }
    }
  }
}

export async function getTargetPage(browser: Browser, tabid?: number): Promise<Page> {
  const pages = await browser.pages()
  if (pages.length === 0) {
    throw new Error('No open pages found.')
  }

  let targetPage: Page | undefined

  if (tabid !== undefined) {
    const target = browser.targets().find((t) => t.type() === 'page' && getNumericTabId((t as any)._targetId || '') === tabid)
    if (target) {
      const page = await target.page()
      if (page) targetPage = page
    }
    if (!targetPage && tabid >= 0 && tabid < pages.length) {
      targetPage = pages[tabid]
    }
    if (!targetPage) {
      throw new Error(`Tab with id ${tabid} not found.`)
    }
  } else {
    for (const page of pages) {
      const isVisible = await page.evaluate(() => document.visibilityState === 'visible').catch(() => false)
      if (isVisible) {
        targetPage = page
        break
      }
    }
    if (!targetPage) targetPage = pages[pages.length - 1]
  }

  // Inject polyfill and tools if not present
  await injectWebMCPPolyfillAndTools(targetPage)
  return targetPage
}

export function getNumericTabId(targetId: string): number {
  let hash = 0
  for (let i = 0; i < targetId.length; i++) {
    hash = (hash << 5) - hash + targetId.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 10000
}

async function injectWebMCPPolyfillAndTools(page: Page) {
  // Check if WebMCP environment already exists
  const isReady = await page.evaluate(() => {
    return !!(window as any).__webmcpcli_init
  }).catch(() => false)

  if (isReady) return // Already injected

  console.log(pc.cyan('当前页面尚未注入 WebMCP 环境，正在执行自动注入...'))

  const injectScriptPath = path.resolve(__dirname, 'inject-bundle.js')
  if (!fs.existsSync(injectScriptPath)) {
    throw new Error(`Cannot find inject-bundle.js at ${injectScriptPath}. Please ensure you run 'pnpm build:inject' first.`)
  }

  const scriptContent = fs.readFileSync(injectScriptPath, 'utf-8')

  // Inject the script into the page
  await page.evaluate(scriptContent).catch((err) => {
    console.error(pc.yellow('自动注入脚本执行失败: ' + err.message))
  })

  // Short delay to allow tools to register asynchronously if any
  await new Promise(resolve => setTimeout(resolve, 300))
}

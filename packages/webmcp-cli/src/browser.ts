import puppeteer, { Browser, Page } from 'puppeteer-core'
import pc from 'picocolors'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CDP_PORT = 9222
// 使用 localhost 以兼容 IPv4/IPv6 绑定
const CDP_URL = `http://localhost:${CDP_PORT}`

async function fetchWithTimeout(url: string, timeoutMs = 1500): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

function promiseWithTimeout<T>(promise: Promise<T>, timeoutMs = 5000, errorMsg = 'Operation timed out'): Promise<T> {
  let timeoutId: NodeJS.Timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMsg))
    }, timeoutMs)
  })
  
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId)
  })
}

async function checkCdpReady(url: string, retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetchWithTimeout(url, 1500)
      if (res.ok) return true
    } catch {}
    if (i < retries - 1) {
      await new Promise(r => setTimeout(r, 200))
    }
  }
  return false
}

async function killProcessOnPortIfZombie(port: number): Promise<void> {
  // 先检测端口是否还在正常响应 HTTP 请求
  const isResponding = await checkCdpReady(`http://127.0.0.1:${port}/json/version`, 1)
  if (isResponding) {
    console.log(pc.green(`connectBrowser: 端口 ${port} 上的浏览器实例仍在正常响应，跳过强杀，尝试直接接管。`))
    return
  }

  try {
    const platform = os.platform()
    const { execSync } = require('child_process')
    if (platform === 'darwin' || platform === 'linux') {
      console.log(pc.yellow(`正在检测并清理占用 ${port} 端口的残留僵尸进程...`))
      const pids = execSync(`lsof -t -i :${port}`).toString().trim()
      if (pids) {
        console.log(pc.yellow(`发现僵尸 PID: ${pids.split('\n').join(', ')}，正在强制终止...`))
        execSync(`kill -9 ${pids.split('\n').join(' ')}`)
        console.log(pc.green(`成功清理残留僵尸进程`))
      }
    } else if (platform === 'win32') {
      console.log(pc.yellow(`正在检测并清理 Windows 上占用 ${port} 端口的残留僵尸进程...`))
      const output = execSync(`netstat -ano | findstr :${port}`).toString().trim()
      if (output) {
        const lines = output.split('\n')
        const pids = new Set<string>()
        lines.forEach((line: string) => {
          const parts = line.trim().split(/\s+/)
          const pid = parts[parts.length - 1]
          if (pid && /^\d+$/.test(pid) && pid !== '0') {
            pids.add(pid)
          }
        })
        pids.forEach(pid => {
          console.log(pc.yellow(`发现 Windows 残留僵尸 PID: ${pid}，正在强制终止...`))
          execSync(`taskkill /F /PID ${pid}`)
        })
      }
    }
  } catch (e) {
    // 忽略找不到残留进程时的报错
  }
}

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
          const response = await fetchWithTimeout(url, 1000)
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
  const targetFilter = (target: any) => {
    try {
      const info = typeof target._getTargetInfo === 'function' ? target._getTargetInfo() : target
      const type = info.type || ''
      const url = info.url || ''
      
      // 过滤掉绝对不需要 attach 且容易发生死锁的后台/子框架 target
      if (
        type === 'service_worker' || 
        type === 'shared_worker' || 
        type === 'iframe' || 
        type === 'other' || 
        type === 'webview' ||
        type === 'background_page'
      ) {
        return false
      }
      
      // 过滤掉 devtools 和插件页面
      if (url.startsWith('devtools://') || url.startsWith('chrome-extension://')) {
        return false
      }
      
      return true
    } catch (e) {
      return false
    }
  }

  try {
    const is127Ready = await checkCdpReady(`http://127.0.0.1:${CDP_PORT}/json/version`, 3)
    if (!is127Ready) {
      throw new Error('127.0.0.1 CDP port not responding')
    }
    console.log(pc.yellow('connectBrowser: 正在尝试连接 127.0.0.1:9222...'))
    // 优先尝试通过 127.0.0.1 连接
    const browser = await promiseWithTimeout(
      puppeteer.connect({
        browserURL: `http://127.0.0.1:${CDP_PORT}`,
        defaultViewport: null,
        targetFilter,
      }),
      10000,
      'puppeteer.connect to 127.0.0.1 timed out'
    )
    console.log(pc.green('connectBrowser: 成功连接 127.0.0.1:9222'))
    return browser
  } catch (error: unknown) {
    try {
      const isLocalhostReady = await checkCdpReady(`http://localhost:${CDP_PORT}/json/version`, 3)
      if (!isLocalhostReady) {
        throw new Error('localhost CDP port not responding')
      }
      console.log(pc.yellow('connectBrowser: 正在尝试连接 localhost:9222...'))
      // 尝试使用 localhost 连接
      const browser = await promiseWithTimeout(
        puppeteer.connect({
          browserURL: `http://localhost:${CDP_PORT}`,
          defaultViewport: null,
          targetFilter,
        }),
        10000,
        'puppeteer.connect to localhost timed out'
      )
      console.log(pc.green('connectBrowser: 成功连接 localhost:9222'))
      return browser
    } catch (error2: unknown) {
      console.log(pc.yellow(`connectBrowser: 连接失败，将尝试唤起浏览器。错误原因: ${error2 instanceof Error ? error2.message : String(error2)}`))
      // 连接失败时，尝试唤起浏览器
      try {
        await killProcessOnPortIfZombie(CDP_PORT)
        await startChromeInBackground()
        // 再次尝试连接
        try {
          const is127Ready = await checkCdpReady(`http://127.0.0.1:${CDP_PORT}/json/version`, 3)
          if (!is127Ready) {
            throw new Error('127.0.0.1 CDP port not responding after launch')
          }
          console.log(pc.yellow('connectBrowser: 浏览器已启动，正在尝试连接 127.0.0.1:9222...'))
          const browser = await promiseWithTimeout(
            puppeteer.connect({
              browserURL: `http://127.0.0.1:${CDP_PORT}`,
              defaultViewport: null,
              targetFilter,
            }),
            10000,
            'puppeteer.connect to 127.0.0.1 after launch timed out'
          )
          console.log(pc.green('connectBrowser: 成功连接 127.0.0.1:9222'))
          return browser
        } catch (e) {
          const isLocalhostReady = await checkCdpReady(`http://localhost:${CDP_PORT}/json/version`, 3)
          if (!isLocalhostReady) {
            throw new Error('localhost CDP port not responding after launch')
          }
          console.log(pc.yellow('connectBrowser: 正在尝试连接 localhost:9222...'))
          const browser = await promiseWithTimeout(
            puppeteer.connect({
              browserURL: `http://localhost:${CDP_PORT}`,
              defaultViewport: null,
              targetFilter,
            }),
            10000,
            'puppeteer.connect to localhost after launch timed out'
          )
          console.log(pc.green('connectBrowser: 成功连接 localhost:9222'))
          return browser
        }
      } catch (launchError: unknown) {
        const msg = launchError instanceof Error ? launchError.message : String(launchError)
        console.error(pc.red(`无法连接或启动浏览器: ${msg}`))
        console.error(pc.yellow(`💡 提示：由于我们要使用你日常的默认浏览器（包含你的书签 and 登录态），如果你的 Chrome 目前正处于打开状态，它会拒绝使用带有调试端口的新参数启动。`))
        console.error(pc.yellow(`👉 解决办法：请先完全退出当前的 Chrome 浏览器（在 Mac 上按 Cmd+Q），然后再重新运行命令。`))
        throw new Error('Browser connection failed.')
      }
    }
  }
}


/**
 * 通过 CDP 获取页面真实的 Chrome target ID（UUID 格式字符串）
 * 供 state.ts 等命令展示 tabs 列表时使用
 */
export async function getPageTargetId(page: Page): Promise<string> {
  const session = await page.target().createCDPSession()
  try {
    const { targetInfo } = await session.send('Target.getTargetInfo')
    return targetInfo.targetId
  } finally {
    await session.detach().catch(() => {})
  }
}

export function getPageTargets(browser: Browser) {
  return browser.targets().filter(t => {
    try {
      const type = (typeof t.type === 'function' ? t.type() : (t as any).type) || ''
      const url = (typeof t.url === 'function' ? t.url() : (t as any).url) || ''
      return type === 'page' && !url.startsWith('devtools://')
    } catch {
      return false
    }
  })
}

export function getTargetIdFromTarget(target: any): string {
  return typeof target._getTargetInfo === 'function'
    ? target._getTargetInfo().targetId
    : (target._targetId || target.targetId || '')
}

export function findPageTargetByTabId(browser: Browser, tabid: string) {
  const pageTargets = getPageTargets(browser)
  return pageTargets.find(t => {
    const tid = getTargetIdFromTarget(t)
    return tid === tabid || tid.includes(tabid)
  }) ?? null
}

export async function activateTabById(browser: Browser, tabid: string): Promise<void> {
  const target = findPageTargetByTabId(browser, tabid)
  if (!target) {
    throw new Error(`Tab with targetId "${tabid}" not found.`)
  }

  const realTabId = getTargetIdFromTarget(target)
  const pages = await browser.pages()
  let sessionPage = pages.find(p => !p.url().startsWith('devtools://'))
  if (!sessionPage && pages.length > 0) {
    sessionPage = pages[0]
  }
  if (!sessionPage) {
    sessionPage = await browser.newPage()
  }

  const session = await sessionPage.createCDPSession()
  try {
    await session.send('Target.activateTarget', { targetId: realTabId })
  } finally {
    await session.detach().catch(() => {})
  }
}

export async function getTargetPage(browser: Browser, tabid?: string): Promise<Page> {
  const pageTargets = getPageTargets(browser)

  if (pageTargets.length === 0) {
    const newPage = await browser.newPage()
    await injectWebMCPPolyfillAndTools(newPage)
    return newPage
  }

  let targetPage: Page | null = null

  if (tabid !== undefined) {
    const target = findPageTargetByTabId(browser, tabid)
    if (!target) {
      throw new Error(`Tab with targetId "${tabid}" not found.`)
    }
    targetPage = await target.page()
  } else {
    // Chrome 的 /json/list 接口把当前激活 the tab 排在第一位，用它来判断激活 tab
    try {
      const urls = [
        `http://localhost:${CDP_PORT}/json/list`,
        `http://127.0.0.1:${CDP_PORT}/json/list`
      ]
      let activeTargetId: string | null = null
      for (const url of urls) {
        try {
          const res = await fetchWithTimeout(url, 1000)
          if (res.ok) {
            const targetsData: Array<{ id: string; type: string; url: string }> = await res.json()
            // 找第一个 type=page 且不是 devtools:// 的 target（Chrome 把激活的排第一）
            const active = targetsData.find(t => t.type === 'page' && !t.url.startsWith('devtools://'))
            if (active) { activeTargetId = active.id; break }
          }
        } catch { /* 忽略，继续试下一个地址 */ }
      }

      if (activeTargetId) {
        for (const target of pageTargets) {
          if (getTargetIdFromTarget(target) === activeTargetId) {
            targetPage = await target.page()
            break
          }
        }
      }
    } catch { /* 忽略，使用 fallback */ }

    // fallback：取最后一个非 devtools 页面
    if (!targetPage) {
      const lastTarget = pageTargets[pageTargets.length - 1]
      targetPage = await lastTarget.page()
    }
  }

  if (!targetPage) {
    throw new Error('无法获取目标页面')
  }

  // 注入 polyfill 和域名工具（幂等检查）
  await injectWebMCPPolyfillAndTools(targetPage)
  return targetPage
}

/**
 * 供 tabs open / back / forward 命令在导航完成后调用：强制注入（不做 flag 检查，因为 goto 后页面上下文已清空）
 */
export async function injectIntoPage(page: Page): Promise<void> {
  await injectWebMCPPolyfillAndTools(page, true)
}

async function injectWebMCPPolyfillAndTools(page: Page, force = false) {
  // 检查 polyfill 是否已注入（force=true 时跳过，用于 goto 之后的强制重注入）
  const polyfillReady = !force && await page.evaluate(() => {
    return !!(window as any).__webmcpcli_init
  }).catch(() => false)

  if (!polyfillReady) {
    console.log(pc.cyan('当前页面尚未注入 WebMCP 环境，正在执行自动注入...'))

    const injectScriptPath = path.resolve(__dirname, 'inject-bundle.js')
    if (!fs.existsSync(injectScriptPath)) {
      throw new Error(`Cannot find inject-bundle.js at ${injectScriptPath}. Please ensure you run 'pnpm build:inject' first.`)
    }

    const scriptContent = fs.readFileSync(injectScriptPath, 'utf-8')

    // 注入 WebMCP polyfill
    try {
      await page.evaluate(scriptContent)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error('自动注入脚本执行失败: ' + msg)
    }

    // 等待工具异步注册
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  // 无论 polyfill 是否刚注入，都检查域名工具（工具内部有防重复 flag）
  await injectDomainTools(page)
}

/**
 * 根据页面域名查找并注入对应的工具 bundle
 * bundle 文件位于 dist/webmcp-tools/{hostname}.js
 */
async function injectDomainTools(page: Page): Promise<void> {
  let hostname: string
  try {
    const url = new URL(page.url())
    hostname = url.hostname
  } catch {
    return // 非 http(s) 页面，跳过
  }

  const toolBundlePath = path.resolve(__dirname, 'webmcp-tools', `${hostname}.js`)
  if (!fs.existsSync(toolBundlePath)) {
    return // 没有对应的工具预置，跳过
  }

  console.log(pc.cyan(`检测到域名 ${hostname} 有预置工具，正在注入...`))

  const toolScript = fs.readFileSync(toolBundlePath, 'utf-8')
  try {
    await page.evaluate(toolScript)
    console.log(pc.green(`已为 ${hostname} 注入预置工具`))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    // 工具注入失败不阻断主流程，仅打印警告
    console.warn(pc.yellow(`域名工具注入失败 (${hostname}): ${msg}`))
  }
}

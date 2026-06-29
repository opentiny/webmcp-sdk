import puppeteer, { Browser, Page } from 'puppeteer-core'
import pc from 'picocolors'
import fs from 'fs'
import os from 'os'
import path from 'path'
import http from 'http'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CDP_PORT = 9222
// 使用 localhost 以兼容 IPv4/IPv6 绑定
const CDP_URL = `http://localhost:${CDP_PORT}`

/**
 * 使用 Node.js 原生 http 模块发起 GET 请求并返回响应体文本
 * 避免 Node.js fetch 将 localhost 解析为 IPv6 ::1 导致连接 Chrome CDP 失败的问题
 */
function httpGet(url: string, timeoutMs = 1500): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk.toString() })
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data)
        } else {
          reject(new Error(`HTTP ${res.statusCode}`))
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('request timeout')) })
  })
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
      await httpGet(url, 1500)
      return true
    } catch {}
    if (i < retries - 1) {
      await new Promise(r => setTimeout(r, 200))
    }
  }
  return false
}

/**
 * 找出第一个真正可达的 CDP 地址，避免 Windows 上 localhost 解析为 IPv6 导致 puppeteer 连接失败
 */
async function findAvailableCdpUrl(addresses: string[], retries = 2): Promise<string | null> {
  for (const addr of addresses) {
    if (await checkCdpReady(addr, retries)) {
      return addr.replace('/json/version', '')
    }
  }
  return null
}



interface BrowserInfo {
  path: string
  name: string
}

function getDefaultBrowserPath(): BrowserInfo | null {
  const platform = os.platform()
  if (platform === 'darwin') {
    // macOS：优先 Chrome，其次 Edge
    const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    if (fs.existsSync(chromePath)) return { path: chromePath, name: 'Chrome' }
    const edgePath = '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    if (fs.existsSync(edgePath)) return { path: edgePath, name: 'Edge' }
    return null
  } else if (platform === 'win32') {
    // Windows：优先 Chrome，其次 Edge（系统内置路径）
    const chromePaths = [
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe',
      process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe'
    ]
    const foundChrome = chromePaths.find(p => fs.existsSync(p))
    if (foundChrome) return { path: foundChrome, name: 'Chrome' }

    // Edge 在 Windows 上的常见路径（包括系统内置的 Edge）
    const edgePaths = [
      process.env.LOCALAPPDATA + '\\Microsoft\\Edge\\Application\\msedge.exe',
      process.env.PROGRAMFILES + '\\Microsoft\\Edge\\Application\\msedge.exe',
      process.env['PROGRAMFILES(X86)'] + '\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ]
    const foundEdge = edgePaths.find(p => fs.existsSync(p))
    if (foundEdge) return { path: foundEdge, name: 'Edge' }
    return null
  } else {
    // Linux：优先 Chrome，其次 Chromium，最后 Edge
    const paths: Array<{ p: string; name: string }> = [
      { p: '/usr/bin/google-chrome', name: 'Chrome' },
      { p: '/usr/bin/google-chrome-stable', name: 'Chrome' },
      { p: '/usr/bin/chromium', name: 'Chromium' },
      { p: '/usr/bin/chromium-browser', name: 'Chromium' },
      { p: '/usr/bin/microsoft-edge', name: 'Edge' },
      { p: '/usr/bin/microsoft-edge-stable', name: 'Edge' }
    ]
    const found = paths.find(({ p }) => fs.existsSync(p))
    return found ? { path: found.p, name: found.name } : null
  }
}

async function startBrowserInBackground(): Promise<void> {
  const browserInfo = getDefaultBrowserPath()
  if (!browserInfo || !fs.existsSync(browserInfo.path)) {
    throw new Error('无法在系统中找到 Chrome 或 Edge 浏览器的默认安装路径。')
  }

  console.log(pc.yellow(`正在启动后台 ${browserInfo.name} 实例 (端口: ${CDP_PORT})...`))
  
  // 用户可以通过 --workspace CLI 选项或 WEBMCP_WORKSPACE 环境变量自定义。
  const userDataDir = process.env.WEBMCP_WORKSPACE || path.join(os.homedir(), '.webmcp_chrome_profile')
  
  const child = spawn(
    browserInfo.path,
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

  // 轮询等待 CDP 端口就绪（优先 127.0.0.1，避免 Windows IPv6 解析问题）
  const pollUrls = [`http://127.0.0.1:${CDP_PORT}/json/version`, `http://localhost:${CDP_PORT}/json/version`]
  for (let i = 0; i < 30; i++) {
    for (const url of pollUrls) {
      try {
        await httpGet(url, 1000)
        console.log(pc.green(`${browserInfo.name} 启动并就绪。`))
        // 额外等待 500ms，确保 CDP 完全稳定（Mac 首次启动时端口通但连接不稳定）
        await new Promise(resolve => setTimeout(resolve, 500))
        return
      } catch {}
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  throw new Error(`${browserInfo.name} 启动超时，无法连接到 CDP 端口。`)
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

  // 第一步：找到第一个真正可达的 CDP 地址（优先 127.0.0.1，规避 Windows localhost → IPv6 问题）
  const versionAddresses = [
    `http://127.0.0.1:${CDP_PORT}/json/version`,
    `http://localhost:${CDP_PORT}/json/version`
  ]

  const existingUrl = await findAvailableCdpUrl(versionAddresses, 2)
  if (existingUrl) {
    try {
      console.log(pc.yellow(`connectBrowser: 检测到端口 ${CDP_PORT} 已就绪，正在连接 ${existingUrl}...`))
      const browser = await promiseWithTimeout(
        puppeteer.connect({ browserURL: existingUrl, defaultViewport: null, targetFilter }),
        10000,
        `puppeteer.connect to ${existingUrl} timed out`
      )
      console.log(pc.green(`connectBrowser: 成功连接 ${existingUrl}`))
      return browser
    } catch (err) {
      // 地址可达但 puppeteer 连接失败（如浏览器正在关闭），继续走启动流程
      console.log(pc.yellow(`connectBrowser: 连接 ${existingUrl} 失败，将尝试重新启动浏览器...`))
    }
  }

  // 第二步：端口无响应，启动新的浏览器实例（使用独立用户数据目录，不影响用户已有浏览器）
  console.log(pc.yellow(`connectBrowser: 端口 ${CDP_PORT} 无响应，正在启动新的浏览器实例...`))
  try {
    await startBrowserInBackground()
  } catch (launchError: unknown) {
    const msg = launchError instanceof Error ? launchError.message : String(launchError)
    console.error(pc.red(`无法启动浏览器: ${msg}`))
    throw new Error('Browser launch failed.')
  }

  // 第三步：浏览器启动后，再次找可用地址并连接
  const launchedUrl = await findAvailableCdpUrl(versionAddresses, 5)
  if (!launchedUrl) {
    throw new Error(`无法连接到浏览器（端口 ${CDP_PORT}），请检查 Chrome/Edge 是否已安装。`)
  }

  try {
    console.log(pc.yellow(`connectBrowser: 浏览器已启动，正在连接 ${launchedUrl}...`))
    const browser = await promiseWithTimeout(
      puppeteer.connect({ browserURL: launchedUrl, defaultViewport: null, targetFilter }),
      10000,
      `puppeteer.connect to ${launchedUrl} after launch timed out`
    )
    console.log(pc.green(`connectBrowser: 成功连接 ${launchedUrl}`))
    return browser
  } catch {
    throw new Error(`无法连接到浏览器（端口 ${CDP_PORT}），请检查 Chrome/Edge 是否已安装。`)
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
          const body = await httpGet(url, 1000)
          const targetsData: Array<{ id: string; type: string; url: string }> = JSON.parse(body)
          // 找第一个 type=page 且不是 devtools:// 的 target（Chrome 把激活的排第一）
          const active = targetsData.find(t => t.type === 'page' && !t.url.startsWith('devtools://'))
          if (active) { activeTargetId = active.id; break }
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

    // 显式等待 WebMCP 注册接口完全就绪
    await page.waitForFunction(() => {
      const mcp = (navigator as any).modelContext
      return mcp && typeof mcp.registerTool === 'function'
    }, { timeout: 10000 }).catch(() => {
      console.warn('等待 WebMCP registerTool 接口就绪超时，正在继续注入...')
    })
  }

  // 无论 polyfill 是否刚注入，都检查域名工具（工具内部有防重复 flag）
  await injectDomainTools(page)
}

function getToolsBundleName(hostname: string): string | null {
  const normalized = hostname.split(':')[0].toLowerCase()
  const toolsDir = path.resolve(__dirname, 'webmcp-tools')
  if (!fs.existsSync(toolsDir)) {
    return null
  }
  let files: string[] = []
  try {
    files = fs.readdirSync(toolsDir)
  } catch {
    return null
  }
  const supportedDomains = files
    .filter(f => f.endsWith('.js'))
    .map(f => f.slice(0, -3))

  if (supportedDomains.includes(normalized)) {
    return `webmcp-tools/${normalized}.js`
  }
  for (const domain of supportedDomains) {
    if (normalized.endsWith('.' + domain)) {
      return `webmcp-tools/${domain}.js`
    }
  }
  return null
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

  const bundleName = getToolsBundleName(hostname)
  if (!bundleName) {
    return // 没有对应的工具预置，跳过
  }

  const toolBundlePath = path.resolve(__dirname, bundleName)
  if (!fs.existsSync(toolBundlePath)) {
    return // 文件不存在，跳过
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

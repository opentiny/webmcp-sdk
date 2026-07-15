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

function getWorkspaceDir(): string {
  return process.env.WEBMCP_WORKSPACE || path.join(os.homedir(), '.webmcp_chrome_profile')
}

/**
 * 读取 Chrome 写入 user-data-dir 的 DevToolsActivePort 文件，获取该 profile 实际绑定的 CDP 端口。
 * 当 CDP_PORT（9222）被系统上其他工具占用时，Chrome 会静默切换到一个随机可用端口并记录在此文件中。
 * 注意：Chrome 136+ 起该文件在部分版本/场景下可能不再写入，因此这只是辅助检测手段，
 * 不能作为唯一依据，主逻辑仍以直接探测固定端口为准（见 candidateCdpBaseUrls）。
 */
function readActivePortFromProfile(userDataDir: string): number | null {
  try {
    const content = fs.readFileSync(path.join(userDataDir, 'DevToolsActivePort'), 'utf-8')
    const port = parseInt(content.split('\n')[0].trim(), 10)
    return Number.isFinite(port) && port > 0 ? port : null
  } catch {
    return null
  }
}

/**
 * 生成某端口下所有需要尝试的 CDP 基础地址。
 *
 * 背景：自 Chrome 136 起，`--remote-debugging-address` 已被忽略/移除（安全加固），
 * CDP 服务器改为固定绑定 "localhost" 解析出的回环地址；而不同系统上 "localhost" 的
 * DNS 解析顺序不一致（有的优先 IPv4 127.0.0.1，有的优先 IPv6 ::1），我们无法再通过
 * 启动参数强制指定地址族。因此这里显式列出 IPv4、IPv6 字面地址和 "localhost" 三种形式，
 * 逐一探测，不对地址族做任何假设，才能在所有平台上稳定探测到实际监听地址。
 */
function candidateCdpBaseUrls(port: number): string[] {
  return [
    `http://127.0.0.1:${port}`,
    `http://[::1]:${port}`,
    `http://localhost:${port}`
  ]
}

function getLastTabIdFilePath(): string {
  return path.join(getWorkspaceDir(), '.last-tab-id')
}

/** 记录最近一次 tabs open / tabs switch 操作的标签页，供 run 无 -t 时回退定位 */
export function setLastActiveTabId(tabid: string): void {
  try {
    const dir = getWorkspaceDir()
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(getLastTabIdFilePath(), tabid, 'utf-8')
  } catch {
    // 写入失败不阻断主流程
  }
}

function getLastActiveTabId(): string | null {
  try {
    const tabid = fs.readFileSync(getLastTabIdFilePath(), 'utf-8').trim()
    return tabid || null
  } catch {
    return null
  }
}

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

/**
 * 通过 Puppeteer 连接已运行的浏览器。
 * 注意：不要在 connect 时使用 targetFilter——在 Windows Edge 上会导致 WebSocket 握手后永久挂起；
 * 页面 target 的筛选在 getPageTargets / getTargetPage 中按需完成。
 */
async function connectPuppeteer(browserBaseUrl: string, attempt = 1, maxAttempts = 3): Promise<Browser> {
  try {
    return await promiseWithTimeout(
      puppeteer.connect({ browserURL: browserBaseUrl, defaultViewport: null }),
      10000,
      `puppeteer.connect to ${browserBaseUrl} timed out`
    )
  } catch (err) {
    if (attempt >= maxAttempts) {
      throw err
    }
    const delayMs = 500 * attempt
    console.log(pc.yellow(`connectBrowser: 第 ${attempt} 次连接失败，${delayMs}ms 后重试...`))
    await new Promise(resolve => setTimeout(resolve, delayMs))
    return connectPuppeteer(browserBaseUrl, attempt + 1, maxAttempts)
  }
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

async function startBrowserInBackground(): Promise<string> {
  const browserInfo = getDefaultBrowserPath()
  if (!browserInfo || !fs.existsSync(browserInfo.path)) {
    throw new Error('无法在系统中找到 Chrome 或 Edge 浏览器的默认安装路径。')
  }

  console.log(pc.yellow(`正在启动后台 ${browserInfo.name} 实例 (端口: ${CDP_PORT})...`))
  
  // 用户可以通过 --workspace CLI 选项或 WEBMCP_WORKSPACE 环境变量自定义。
  const userDataDir = getWorkspaceDir()

  // 启动前先清除旧的 DevToolsActivePort 记录，避免读取到上一次运行残留的过期端口
  try {
    fs.unlinkSync(path.join(userDataDir, 'DevToolsActivePort'))
  } catch {}
  
  // 注：Chrome 136+ 已不再支持 `--remote-debugging-address` 指定绑定地址（安全加固后被忽略），
  // CDP 服务器固定绑定 "localhost" 解析出的回环地址，具体是 IPv4 还是 IPv6 由系统决定，
  // 因此不再传递该参数，探测阶段改为同时尝试 IPv4/IPv6/localhost 三种地址形式。
  const launchArgs = [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check'
  ]

  const child = spawn(
    browserInfo.path,
    launchArgs,
    {
      detached: true,
      stdio: 'ignore'
    }
  )

  child.unref() // 让子进程脱离父进程独立运行

  // 轮询等待 CDP 端口就绪。优先探测固定的 CDP_PORT（IPv4/IPv6/localhost 三种地址形式都尝试，
  // 不对地址族做假设）；同时也检查 DevToolsActivePort 文件——如果 CDP_PORT 被其他程序占用，
  // 部分 Chrome 版本会自动切换到随机端口并记录在该文件中，作为额外兜底。
  for (let i = 0; i < 40; i++) {
    const ports = new Set<number>([CDP_PORT])
    const activePort = readActivePortFromProfile(userDataDir)
    if (activePort) ports.add(activePort)

    for (const port of ports) {
      for (const baseUrl of candidateCdpBaseUrls(port)) {
        try {
          await httpGet(`${baseUrl}/json/version`, 1000)
          if (port !== CDP_PORT) {
            console.log(pc.yellow(`检测到端口 ${CDP_PORT} 已被其他程序占用，${browserInfo.name} 已自动切换到端口 ${port}。`))
          }
          console.log(pc.green(`${browserInfo.name} 启动并就绪（${baseUrl}）。`))
          // 额外等待 500ms，确保 CDP 完全稳定（Mac 首次启动时端口通但连接不稳定）
          await new Promise(resolve => setTimeout(resolve, 500))
          return baseUrl
        } catch {}
      }
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  throw new Error(`${browserInfo.name} 启动超时，无法连接到 CDP 端口。`)
}

export async function connectBrowser(): Promise<Browser> {
  const userDataDir = getWorkspaceDir()

  // 第一步：找到第一个真正可达的 CDP 地址（IPv4/IPv6/localhost 三种形式都尝试，不假设地址族）。
  // 若本工具专属 profile 上一次运行时因端口冲突被 Chrome 切换到了非默认端口，
  // 优先尝试 DevToolsActivePort 记录的真实端口，避免误判为“未运行”而重复启动新实例。
  const recordedPort = readActivePortFromProfile(userDataDir)
  const versionAddresses = [
    ...(recordedPort && recordedPort !== CDP_PORT ? candidateCdpBaseUrls(recordedPort).map(u => `${u}/json/version`) : []),
    ...candidateCdpBaseUrls(CDP_PORT).map(u => `${u}/json/version`)
  ]

  const existingUrl = await findAvailableCdpUrl(versionAddresses, 2)
  if (existingUrl) {
    console.log(pc.yellow(`connectBrowser: 检测到端口 ${CDP_PORT} 已就绪，正在连接 ${existingUrl}...`))
    try {
      const browser = await connectPuppeteer(existingUrl)
      console.log(pc.green(`connectBrowser: 成功连接 ${existingUrl}`))
      return browser
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(
        `无法连接到已在运行的浏览器（${existingUrl}）：${msg}。` +
        'CDP 端口可用，请勿重复启动浏览器；可关闭多余窗口后重试。'
      )
    }
  }

  // 第二步：端口无响应，启动新的浏览器实例（使用独立用户数据目录，不影响用户已有浏览器）
  console.log(pc.yellow(`connectBrowser: 端口 ${CDP_PORT} 无响应，正在启动新的浏览器实例...`))
  let launchedUrl: string
  try {
    launchedUrl = await startBrowserInBackground()
  } catch (launchError: unknown) {
    const msg = launchError instanceof Error ? launchError.message : String(launchError)
    console.error(pc.red(`无法启动浏览器: ${msg}`))
    throw new Error('Browser launch failed.')
  }

  // 第三步：使用启动过程中确认过的真实 CDP 地址进行连接
  try {
    console.log(pc.yellow(`connectBrowser: 浏览器已启动，正在连接 ${launchedUrl}...`))
    const browser = await connectPuppeteer(launchedUrl)
    console.log(pc.green(`connectBrowser: 成功连接 ${launchedUrl}`))
    return browser
  } catch {
    throw new Error(`无法连接到浏览器（${launchedUrl}），请检查 Chrome/Edge 是否已安装。`)
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
    // 优先使用最近一次 tabs open/switch 记录的标签页（Agent 连续 CLI 调用更可靠）
    const lastTabId = getLastActiveTabId()
    if (lastTabId) {
      const lastTarget = findPageTargetByTabId(browser, lastTabId)
      if (lastTarget) {
        targetPage = await lastTarget.page()
      }
    }

    // Chrome 的 /json/list 接口把当前激活 the tab 排在第一位，用它来判断激活 tab
    if (!targetPage) {
      try {
        // 与 connectBrowser 一致：若 Chrome 因端口冲突切到非默认端口，一并探测 DevToolsActivePort
        const workspaceDir = getWorkspaceDir()
        const recordedPort = readActivePortFromProfile(workspaceDir)
        const ports = recordedPort && recordedPort !== CDP_PORT ? [recordedPort, CDP_PORT] : [CDP_PORT]
        const urls = ports.flatMap((port) => candidateCdpBaseUrls(port).map((u) => `${u}/json/list`))
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
    }

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
 * 供 tabs open / back / forward / state / run 等命令调用：仅在尚未注入时注入一次（幂等）。
 * 导航后页面 JS 上下文会清空，`__webmcpcli_init` 自然失效，下次调用会重新注入。
 */
export async function injectIntoPage(page: Page): Promise<void> {
  await injectWebMCPPolyfillAndTools(page)
}

async function injectWebMCPPolyfillAndTools(page: Page) {
  // 已注入则跳过，避免覆盖 page-agent-tool 闭包内的 refMap
  const polyfillReady = await page.evaluate(() => {
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
 * 注意：每个工具 bundle 内部会在 window 上设置 __webmcptools_{domain} flag 防止重复注册，
 * 此处在 JS 层额外做一次快速检查，避免每次都 evaluate 完整脚本带来不必要的 IPC 开销。
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

  // 快速检查：若页面已注入，直接返回，省去读文件和 evaluate 的开销
  const bundleKey = bundleName.replace(/^webmcp-tools\//, '').replace(/\.js$/, '')
  const flagKey = `__webmcptools_${bundleKey.replace(/[^a-zA-Z0-9]/g, '')}`
  const alreadyInjected = await page.evaluate((key: string) => !!(window as any)[key], flagKey).catch(() => false)
  if (alreadyInjected) {
    return
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


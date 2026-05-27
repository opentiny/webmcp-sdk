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
    console.log(pc.yellow('connectBrowser: 正在尝试连接 127.0.0.1:9222...'))
    // 优先尝试通过 127.0.0.1 连接
    const browser = await puppeteer.connect({
      browserURL: `http://127.0.0.1:${CDP_PORT}`,
      defaultViewport: null,
      targetFilter,
    })
    console.log(pc.green('connectBrowser: 成功连接 127.0.0.1:9222'))
    return browser
  } catch (error: unknown) {
    try {
      console.log(pc.yellow('connectBrowser: 正在尝试连接 localhost:9222...'))
      // 尝试使用 localhost 连接
      const browser = await puppeteer.connect({
        browserURL: `http://localhost:${CDP_PORT}`,
        defaultViewport: null,
        targetFilter,
      })
      console.log(pc.green('connectBrowser: 成功连接 localhost:9222'))
      return browser
    } catch (error2: unknown) {
      console.log(pc.yellow(`connectBrowser: 连接失败，将尝试唤起浏览器。错误原因: ${error2 instanceof Error ? error2.message : String(error2)}`))
      // 连接失败时，尝试唤起浏览器
      try {
        await startChromeInBackground()
        // 再次尝试连接
        try {
          console.log(pc.yellow('connectBrowser: 浏览器已启动，正在尝试连接 127.0.0.1:9222...'))
          const browser = await puppeteer.connect({
            browserURL: `http://127.0.0.1:${CDP_PORT}`,
            defaultViewport: null,
            targetFilter,
          })
          console.log(pc.green('connectBrowser: 成功连接 127.0.0.1:9222'))
          return browser
        } catch (e) {
          console.log(pc.yellow('connectBrowser: 正在尝试连接 localhost:9222...'))
          const browser = await puppeteer.connect({
            browserURL: `http://localhost:${CDP_PORT}`,
            defaultViewport: null,
            targetFilter,
          })
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

export async function getTargetPage(browser: Browser, tabid?: string): Promise<Page> {
  const targets = browser.targets()
  const pageTargets = targets.filter(t => {
    try {
      const type = (typeof t.type === 'function' ? t.type() : (t as any).type) || ''
      const url = (typeof t.url === 'function' ? t.url() : (t as any).url) || ''
      return type === 'page' && !url.startsWith('devtools://')
    } catch {
      return false
    }
  })

  if (pageTargets.length === 0) {
    const newPage = await browser.newPage()
    await injectWebMCPPolyfillAndTools(newPage)
    return newPage
  }

  let targetPage: Page | null = null

  if (tabid !== undefined) {
    // 按真实 Chrome target ID 查找
    for (const target of pageTargets) {
      const tid = typeof (target as any)._getTargetInfo === 'function'
        ? (target as any)._getTargetInfo().targetId
        : ((target as any)._targetId || (target as any).targetId || '')
      if (tid === tabid || tid.includes(tabid)) {
        targetPage = await target.page()
        break
      }
    }
    if (!targetPage) {
      throw new Error(`Tab with targetId "${tabid}" not found.`)
    }
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
          const res = await fetch(url)
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
          const tid = typeof (target as any)._getTargetInfo === 'function'
            ? (target as any)._getTargetInfo().targetId
            : ((target as any)._targetId || (target as any).targetId || '')
          if (tid === activeTargetId) {
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
 * 供 open 命令在 goto 完成后调用：强制注入（不做 flag 检查，因为 goto 后页面上下文已清空）
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

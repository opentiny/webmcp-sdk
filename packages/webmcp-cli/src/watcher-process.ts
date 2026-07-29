import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import pc from 'picocolors'
import { resolveInjectBundlePath } from './inject-bundle-path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
let foregroundBrowserConnectionActive = false

function getWorkspaceDir(): string {
  return process.env.WEBMCP_WORKSPACE || path.join(os.homedir(), '.webmcp_chrome_profile')
}

export function getWatcherPidPath(): string {
  return path.join(getWorkspaceDir(), '.inject-watcher.pid')
}

export function isInjectableUrl(url: string): boolean {
  if (url.startsWith('http://') || url.startsWith('https://')) return true
  if (url === 'about:blank' || url === '') return true
  if (url.startsWith('chrome://newtab') || url.startsWith('chrome://new-tab-page')) return true
  return false
}

/** 新标签准备阶段是否应收听（比 isInjectableUrl 更宽，含一般 chrome://） */
export function shouldPrepareWatcherUrl(url: string): boolean {
  if (
    url.startsWith('devtools://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('chrome://extensions') ||
    url.startsWith('chrome://settings')
  ) {
    return false
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return true
  if (url === '' || url === 'about:blank') return true
  if (url.startsWith('chrome://')) return true
  return false
}

export function isProcessAlive(pid: number): boolean {
  if (!Number.isFinite(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export function readWatcherPid(): number | null {
  try {
    const raw = fs.readFileSync(getWatcherPidPath(), 'utf-8').trim()
    const pid = Number.parseInt(raw, 10)
    return Number.isFinite(pid) ? pid : null
  } catch {
    return null
  }
}

export function writeWatcherPid(pid: number): void {
  const dir = getWorkspaceDir()
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(getWatcherPidPath(), String(pid), 'utf-8')
}

/** 仅当 PID 文件仍指向 expectedPid 时删除，避免并发误删新 watcher 登记 */
export function clearWatcherPid(expectedPid?: number): void {
  try {
    if (expectedPid !== undefined && readWatcherPid() !== expectedPid) return
    fs.unlinkSync(getWatcherPidPath())
  } catch {
    /* ignore */
  }
}

/**
 * Windows 的 Chromium/Puppeteer 在多个进程同时持有浏览器级 CDP 连接时，
 * 后加入的客户端可能卡在初始化阶段。前台 CLI 命令因此需要先接管连接，
 * 命令断开后再恢复 watcher；macOS/Linux 保持长期并行连接。
 */
export function shouldHandoffWatcherForForeground(
  platform: NodeJS.Platform = process.platform
): boolean {
  return platform === 'win32'
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Windows 前台命令连接前，让长期占用 CDP 的 watcher 退出。 */
export async function beginForegroundBrowserConnection(): Promise<void> {
  if (!shouldHandoffWatcherForForeground()) return
  if (process.env.WEBMCP_WATCHER_CHILD === '1') return

  foregroundBrowserConnectionActive = true
  const watcherPid = readWatcherPid()
  if (!watcherPid || watcherPid === process.pid) return
  if (!isProcessAlive(watcherPid)) {
    clearWatcherPid(watcherPid)
    return
  }

  try {
    process.kill(watcherPid, 'SIGTERM')
  } catch {
    clearWatcherPid(watcherPid)
    return
  }

  // 等待进程退出、CDP socket 释放后再让 Puppeteer 建立前台连接。
  for (let i = 0; i < 40 && isProcessAlive(watcherPid); i++) {
    await sleep(50)
  }
  if (isProcessAlive(watcherPid)) {
    throw new Error(`Windows CDP 连接交接失败：inject watcher (pid ${watcherPid}) 未能退出。`)
  }
  clearWatcherPid(watcherPid)
}

/** 前台命令断开 CDP 后恢复 watcher。 */
export function endForegroundBrowserConnection(): void {
  if (!foregroundBrowserConnectionActive) return
  foregroundBrowserConnectionActive = false
  ensureInjectWatcher()
}

/**
 * 幂等拉起后台 inject watcher（已在运行则复用）。
 * Windows 前台命令通过 begin/endForegroundBrowserConnection 独占并交接 CDP 连接。
 * - WEBMCP_NO_WATCHER=1：禁用
 * - WEBMCP_WATCHER_CHILD=1：当前进程已是 watcher，禁止递归
 */
export function ensureInjectWatcher(): void {
  if (process.env.WEBMCP_NO_WATCHER === '1') return
  if (process.env.WEBMCP_WATCHER_CHILD === '1') return
  if (foregroundBrowserConnectionActive) return

  const existing = readWatcherPid()
  if (existing && isProcessAlive(existing)) {
    return
  }
  if (existing) clearWatcherPid(existing)

  const binPath = path.resolve(__dirname, 'bin.js')
  if (!fs.existsSync(binPath)) {
    console.warn(pc.yellow(`inject watcher: 未找到 ${binPath}，跳过自动注入守护进程`))
    return
  }

  // inject-bundle 未就绪时不要拉起 watcher，否则子进程立刻失败且污染状态
  const injectBundle = resolveInjectBundlePath()
  if (!fs.existsSync(injectBundle)) {
    console.warn(
      pc.yellow(
        `inject watcher: 缺少 ${injectBundle}，跳过守护进程。请先执行 pnpm build 或 pnpm build:inject`
      )
    )
    return
  }

  const logDir = path.join(getWorkspaceDir(), 'logs')
  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
  } catch {
    /* ignore */
  }
  const logFile = path.join(logDir, 'inject-watcher.log')
  let logFd: number | 'ignore' = 'ignore'
  try {
    logFd = fs.openSync(logFile, 'a')
  } catch {
    logFd = 'ignore'
  }

  try {
    const child = spawn(process.execPath, [binPath, 'watch'], {
      detached: true,
      stdio: ['ignore', logFd, logFd],
      env: {
        ...process.env,
        WEBMCP_WATCHER_CHILD: '1',
        WEBMCP_WORKSPACE: getWorkspaceDir(),
        ...(process.env.WEBMCP_CDP_PORT
          ? { WEBMCP_CDP_PORT: process.env.WEBMCP_CDP_PORT }
          : {}),
      },
      windowsHide: true,
    })
    child.on('error', (err) => {
      console.warn(pc.yellow(`inject watcher 启动失败: ${err.message}`))
    })
    child.unref()
    if (typeof logFd === 'number') {
      try {
        fs.closeSync(logFd)
      } catch {
        /* ignore */
      }
    }
    if (child.pid) {
      writeWatcherPid(child.pid)
      console.log(pc.cyan(`inject watcher 已在后台启动 (pid ${child.pid})，日志: ${logFile}`))
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(pc.yellow(`inject watcher 启动失败: ${msg}`))
  }
}

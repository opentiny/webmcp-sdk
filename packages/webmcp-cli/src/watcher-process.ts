import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import pc from 'picocolors'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

export function clearWatcherPid(): void {
  try {
    fs.unlinkSync(getWatcherPidPath())
  } catch {
    /* ignore */
  }
}

/**
 * 幂等拉起后台 inject watcher。
 * - WEBMCP_NO_WATCHER=1：禁用
 * - WEBMCP_WATCHER_CHILD=1：当前进程已是 watcher，禁止递归
 */
export function ensureInjectWatcher(): void {
  if (process.env.WEBMCP_NO_WATCHER === '1') return
  if (process.env.WEBMCP_WATCHER_CHILD === '1') return

  const existing = readWatcherPid()
  if (existing && isProcessAlive(existing)) {
    // 每次 CLI 连接时重启 watcher，确保注入逻辑与 bin 版本一致（修复新标签 chrome://newtab 等）
    try {
      process.kill(existing, 'SIGTERM')
    } catch {
      /* ignore */
    }
    clearWatcherPid()
  } else if (existing) {
    clearWatcherPid()
  }

  const binPath = path.resolve(__dirname, 'bin.js')
  if (!fs.existsSync(binPath)) {
    console.warn(pc.yellow(`inject watcher: 未找到 ${binPath}，跳过自动注入守护进程`))
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

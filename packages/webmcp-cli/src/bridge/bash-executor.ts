import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { resolveWorkspaceDir, BashInvalidParamsError } from './workspace-manager.js'

export { BashInvalidParamsError }

export interface ExecBashParams {
  command: string
  cwd?: string
  workspacePath?: string
  conversationId?: string
  timeoutMs?: number
  env?: Record<string, string>
  maxBuffer?: number
}

export interface ExecBashResult {
  stdout: string
  stderr: string
  exitCode: number | null
  signal: NodeJS.Signals | null
  durationMs: number
  truncated?: boolean
}

export class BashTimeoutError extends Error {
  readonly code = 'TIMEOUT' as const
  readonly timeoutMs: number

  constructor(timeoutMs: number) {
    super(`命令执行超时 (${timeoutMs / 1000}s)`)
    this.name = 'BashTimeoutError'
    this.timeoutMs = timeoutMs
  }
}

const DEFAULT_TIMEOUT_MS = 30_000
const MAX_TIMEOUT_MS = 600_000 // 最大执行超时 10 分钟，避免超出 Node.js setTimeout 32 位有符号整数上限 (2147483647) 导致立即触发
const DEFAULT_MAX_BUFFER = 512 * 1024 // 512KB

let cachedShell: string | null = null

function findWindowsBash(): string | null {
  // 1. 检查 PATH 中是否存在 bash.exe
  const pathDirs = (process.env.PATH || '').split(path.delimiter)
  for (const dir of pathDirs) {
    if (!dir) continue
    const candidate = path.join(dir, 'bash.exe')
    try {
      if (fs.existsSync(candidate)) return candidate
    } catch {
      // 忽略
    }
  }

  // 2. 检查常见 Git for Windows 与系统级 bash 安装路径
  const localAppData = process.env.LOCALAPPDATA || ''
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files'
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
  const programW6432 = process.env.ProgramW6432 || programFiles

  const commonGitBashPaths = [
    path.join(programFiles, 'Git', 'bin', 'bash.exe'),
    path.join(programFiles, 'Git', 'usr', 'bin', 'bash.exe'),
    path.join(programW6432, 'Git', 'bin', 'bash.exe'),
    path.join(programFilesX86, 'Git', 'bin', 'bash.exe'),
    path.join(localAppData, 'Programs', 'Git', 'bin', 'bash.exe'),
    path.join(localAppData, 'Programs', 'Git', 'usr', 'bin', 'bash.exe'),
    path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'bash.exe')
  ]

  for (const candidate of commonGitBashPaths) {
    try {
      if (fs.existsSync(candidate)) return candidate
    } catch {
      // 忽略
    }
  }
  return null
}

/**
 * 跨平台解析可用的 Bash/Shell 路径：
 * - POSIX (macOS/Linux): 优先读取 process.env.SHELL，兜底 /bin/bash
 * - Windows: 优先探测系统中真实的 bash.exe（PATH、Git for Windows 常见安装目录、WSL），
 *   若存在则能 100% 完美执行原生 Bash 脚本；若未安装，降级回退至 powershell.exe（具备常用 Unix 别名）
 */
export function resolveShell(forcePlatform?: string): string {
  const currentPlatform = forcePlatform || process.platform
  if (!forcePlatform && cachedShell) {
    return cachedShell
  }

  if (currentPlatform !== 'win32') {
    const posixShell = process.env.SHELL || '/bin/bash'
    if (!forcePlatform) cachedShell = posixShell
    return posixShell
  }

  const winBash = findWindowsBash()
  if (winBash) {
    if (!forcePlatform) cachedShell = winBash
    return winBash
  }

  // 次选：PowerShell（自带 ls, cat, pwd, rm, cp 等常用 Unix 别名）
  const fallback = 'powershell.exe'
  if (!forcePlatform) cachedShell = fallback
  return fallback
}

/**
 * 跨平台杀死子进程树，防止 Windows 或 POSIX 下产生孤儿后台进程
 */
function killProcessTree(child: ReturnType<typeof spawn>): void {
  if (process.platform === 'win32' && child.pid) {
    try {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore'
      })
    } catch {
      child.kill('SIGKILL')
    }
  } else {
    child.kill('SIGTERM')
    setTimeout(() => {
      try {
        child.kill('SIGKILL')
      } catch {
        // ignore
      }
    }, 2000)
  }
}

export async function executeBash(params: ExecBashParams): Promise<ExecBashResult> {
  const trimmedCommand = params.command?.trim()
  if (!trimmedCommand) {
    throw new BashInvalidParamsError('命令不能为空')
  }

  // 拦截明显的高危系统破坏性命令（针对系统关键根路径的非受控删除或资源耗尽攻击）
  if (
    /rm\s+(-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+|--recursive\s+--force\s+)\s*(\/|~|\$HOME|\/\*)\s*$/i.test(
      trimmedCommand
    ) ||
    /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/i.test(trimmedCommand)
  ) {
    throw new BashInvalidParamsError('安全拦截：禁止在宿主机执行针对系统关键根路径的高危破坏性命令')
  }

  const cwd = resolveWorkspaceDir({
    cwd: params.cwd,
    workspacePath: params.workspacePath,
    conversationId: params.conversationId
  })

  const normalizedTimeoutMs =
    typeof params.timeoutMs === 'number' && Number.isFinite(params.timeoutMs) && params.timeoutMs > 0
      ? Math.min(params.timeoutMs, MAX_TIMEOUT_MS)
      : DEFAULT_TIMEOUT_MS
  const { env = {}, maxBuffer = DEFAULT_MAX_BUFFER } = params

  const startTime = Date.now()
  const shell = resolveShell()

  return new Promise((resolve, reject) => {
    const stdoutChunks: Buffer[] = []
    let stdoutBytes = 0
    const stderrChunks: Buffer[] = []
    let stderrBytes = 0
    let truncated = false
    let isKilled = false

    const child = spawn(trimmedCommand, {
      shell,
      cwd,
      env: { ...process.env, ...env },
      windowsHide: true
    })

    const killTimeoutTimer = setTimeout(() => {
      isKilled = true
      killProcessTree(child)
      reject(new BashTimeoutError(normalizedTimeoutMs))
    }, normalizedTimeoutMs)

    child.stdout.on('data', (chunk: Buffer) => {
      if (stdoutBytes < maxBuffer) {
        const remaining = maxBuffer - stdoutBytes
        if (chunk.length <= remaining) {
          stdoutChunks.push(chunk)
          stdoutBytes += chunk.length
        } else {
          stdoutChunks.push(chunk.subarray(0, remaining))
          stdoutBytes += remaining
          truncated = true
        }
      } else {
        truncated = true
      }
    })

    child.stderr.on('data', (chunk: Buffer) => {
      if (stderrBytes < maxBuffer) {
        const remaining = maxBuffer - stderrBytes
        if (chunk.length <= remaining) {
          stderrChunks.push(chunk)
          stderrBytes += chunk.length
        } else {
          stderrChunks.push(chunk.subarray(0, remaining))
          stderrBytes += remaining
          truncated = true
        }
      } else {
        truncated = true
      }
    })

    child.on('error', (err) => {
      clearTimeout(killTimeoutTimer)
      reject(err)
    })

    child.on('close', (exitCode, signal) => {
      clearTimeout(killTimeoutTimer)
      if (isKilled) return
      const stdout = Buffer.concat(stdoutChunks).toString('utf8').trim()
      const stderr = Buffer.concat(stderrChunks).toString('utf8').trim()
      resolve({
        stdout,
        stderr,
        exitCode,
        signal,
        durationMs: Date.now() - startTime,
        ...(truncated ? { truncated: true } : {})
      })
    })
  })
}

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import type { Readable } from 'node:stream'
import { StringDecoder } from 'node:string_decoder'
import { execa } from 'execa'
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
  /** 为 true 且非 Windows 时在伪终端中执行，让检测终端的程序及时写出 */
  tty?: boolean
  /** 进程仍在运行时，每收到一段新输出调用一次。text 是这段新文本，不是累计文本 */
  onOutput?: (chunk: BashOutputChunk) => void
}

export interface BashOutputChunk {
  stream: 'stdout' | 'stderr'
  text: string
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

const FORCE_KILL_AFTER_DELAY_MS = 2000

const TTY_HELPER = `
import errno, os, sys
cmd = os.environ.get("BASH_TTY_COMMAND") or ""
shell = os.environ.get("BASH_TTY_SHELL") or "/bin/bash"
if not cmd:
    sys.exit(127)
import pty
pid, fd = pty.fork()
if pid == 0:
    os.environ.pop("BASH_TTY_COMMAND", None)
    os.environ.pop("BASH_TTY_SHELL", None)
    os.environ["TERM"] = "xterm-256color"
    try:
        # stdout/stderr 仍是终端；stdin 换成 /dev/null，读取输入的命令会立刻遇到 EOF
        null_fd = os.open(os.devnull, os.O_RDONLY)
        os.dup2(null_fd, 0)
        os.close(null_fd)
        os.execvp(shell, [shell, "-c", cmd])
    except OSError:
        os._exit(127)
while True:
    try:
        data = os.read(fd, 65536)
    except OSError as exc:
        if exc.errno == errno.EINTR:
            continue
        break
    if not data:
        break
    try:
        os.write(1, data)
    except OSError:
        break
try:
    _, status = os.waitpid(pid, 0)
except OSError:
    sys.exit(1)
if os.WIFEXITED(status):
    sys.exit(os.WEXITSTATUS(status))
if os.WIFSIGNALED(status):
    sys.exit(128 + os.WTERMSIG(status))
sys.exit(1)
`

interface LimitedOutput {
  chunks: Buffer[]
  truncated: boolean
}

interface ExecaRunResult {
  exitCode?: number | null
  signal?: NodeJS.Signals | null
  timedOut?: boolean
  failed?: boolean
  isTerminated?: boolean
  shortMessage?: string
  message?: string
  durationMs?: number
}

const ANSI_PATTERN =
  /\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001B\\))/g

function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, '')
}

function createAnsiStripper(): { push(text: string): string; end(): string } {
  let pending = ''

  const take = (final: boolean): string => {
    let out = ''
    let index = 0
    while (index < pending.length) {
      if (pending[index] !== '\u001B') {
        out += pending[index]
        index += 1
        continue
      }
      const rest = pending.slice(index)
      ANSI_PATTERN.lastIndex = 0
      const match = ANSI_PATTERN.exec(rest)
      if (match && match.index === 0) {
        index += match[0].length
        continue
      }
      if (!final && rest.length < 128 && isOpenAnsi(rest)) {
        pending = rest
        return out
      }
      out += pending[index]
      index += 1
    }
    pending = ''
    return out
  }

  return {
    push(text: string) {
      pending += text
      return take(false)
    },
    end() {
      return take(true)
    }
  }
}

function isOpenAnsi(text: string): boolean {
  if (!text.startsWith('\u001B')) return false
  if (text.length === 1) return true
  if (text[1] === '[') {
    let index = 2
    while (index < text.length && /[0-?]/.test(text[index])) index += 1
    while (index < text.length && /[ -/]/.test(text[index])) index += 1
    return index >= text.length
  }
  if (text[1] === ']') return !text.includes('\u0007') && !text.includes('\u001B\\')
  return false
}

function withoutCarriageReturn(buf: Buffer): Buffer {
  if (!buf.includes(0x0d)) return buf
  const out = Buffer.allocUnsafe(buf.length)
  let size = 0
  for (let index = 0; index < buf.length; index += 1) {
    const byte = buf[index]
    if (byte === 0x0d) continue
    out[size] = byte
    size += 1
  }
  return out.subarray(0, size)
}

function collectLimited(
  stream: Readable | null | undefined,
  maxBuffer: number,
  onText?: (text: string) => void,
  stripCarriageReturn = false,
  ansi?: ReturnType<typeof createAnsiStripper>
): LimitedOutput {
  const state: LimitedOutput = { chunks: [], truncated: false }
  if (!stream) return state
  const decoder = new StringDecoder('utf8')
  let bytes = 0
  const emitText = (text: string) => {
    const cleaned = ansi ? ansi.push(text) : text
    if (cleaned) onText?.(cleaned)
  }
  const emit = (buf: Buffer) => {
    emitText(decoder.write(buf))
  }
  stream.on('data', (chunk: Buffer | Uint8Array) => {
    const raw = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    const buf = stripCarriageReturn ? withoutCarriageReturn(raw) : raw
    if (buf.length === 0) return
    emit(buf)
    if (bytes >= maxBuffer) {
      state.truncated = true
      return
    }
    const remaining = maxBuffer - bytes
    if (buf.length <= remaining) {
      state.chunks.push(buf)
      bytes += buf.length
      return
    }
    state.chunks.push(buf.subarray(0, remaining))
    bytes += remaining
    state.truncated = true
  })
  stream.on('end', () => {
    const rest = ansi ? `${ansi.push(decoder.end())}${ansi.end()}` : decoder.end()
    if (rest) onText?.(rest)
  })
  return state
}

function decodeLimited(state: LimitedOutput, removeAnsi = false): string {
  const decoder = new StringDecoder('utf8')
  const text = decoder.write(Buffer.concat(state.chunks))
  const flushed = state.truncated ? '' : decoder.end()
  const decoded = text + flushed
  return (removeAnsi ? stripAnsi(decoded) : decoded).trim()
}

function signalProcessTree(pid: number | undefined, signal: NodeJS.Signals): void {
  if (!pid || pid <= 0) return
  if (process.platform === 'win32') {
    try {
      spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true, timeout: 5000 })
    } catch {
      // 进程已退出
    }
    return
  }
  try {
    process.kill(-pid, signal)
  } catch {
    try {
      process.kill(pid, signal)
    } catch {
      // 进程已退出
    }
  }
}

function ignoreStreamError(stream: Readable | null | undefined): void {
  stream?.on('error', () => {})
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

  const shell = resolveShell()
  const useTty = params.tty === true && process.platform !== 'win32'
  const detached = process.platform !== 'win32'
  const subprocess = useTty
    ? execa('python3', ['-u', '-c', TTY_HELPER], {
        cwd,
        env: {
          ...env,
          PAGER: 'cat',
          GIT_PAGER: 'cat',
          BASH_TTY_COMMAND: trimmedCommand,
          BASH_TTY_SHELL: shell
        },
        stdin: 'ignore',
        buffer: false,
        encoding: 'buffer',
        reject: false,
        windowsHide: true,
        stripFinalNewline: false,
        detached
      })
    : execa(trimmedCommand, {
        shell,
        cwd,
        env,
        stdin: 'ignore',
        buffer: false,
        encoding: 'buffer',
        reject: false,
        windowsHide: true,
        stripFinalNewline: false,
        detached
      })
  ignoreStreamError(subprocess.stdout)
  ignoreStreamError(subprocess.stderr)
  let timedOut = false
  let forceTimer: ReturnType<typeof setTimeout> | undefined
  const timer = setTimeout(() => {
    timedOut = true
    signalProcessTree(subprocess.pid, 'SIGTERM')
    forceTimer = setTimeout(() => {
      signalProcessTree(subprocess.pid, 'SIGKILL')
      subprocess.stdout?.destroy()
      subprocess.stderr?.destroy()
    }, FORCE_KILL_AFTER_DELAY_MS)
  }, normalizedTimeoutMs)
  const emit = (stream: BashOutputChunk['stream']) => (text: string) => {
    params.onOutput?.({ stream, text })
  }
  const ansi = useTty ? createAnsiStripper() : undefined
  const stdoutState = collectLimited(subprocess.stdout, maxBuffer, emit('stdout'), useTty, ansi)
  const stderrState = collectLimited(subprocess.stderr, maxBuffer, emit('stderr'))
  let result: ExecaRunResult
  try {
    result = (await subprocess) as ExecaRunResult
  } catch (err) {
    if (timedOut) throw new BashTimeoutError(normalizedTimeoutMs)
    throw err
  } finally {
    clearTimeout(timer)
    if (forceTimer) clearTimeout(forceTimer)
  }

  if (timedOut) {
    throw new BashTimeoutError(normalizedTimeoutMs)
  }
  if (result.failed && result.exitCode == null && result.signal == null && !result.isTerminated) {
    throw new Error(result.shortMessage || result.message || '命令启动失败')
  }

  const truncated = stdoutState.truncated || stderrState.truncated
  return {
    stdout: decodeLimited(stdoutState, useTty),
    stderr: decodeLimited(stderrState),
    exitCode: result.exitCode ?? null,
    signal: result.signal ?? null,
    durationMs: result.durationMs ?? 0,
    ...(truncated ? { truncated: true } : {})
  }
}

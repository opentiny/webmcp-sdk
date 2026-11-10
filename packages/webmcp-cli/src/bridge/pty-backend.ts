import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { constants } from 'node:os'
import type { IPty } from 'node-pty'
import { resolveShell } from './bash-executor.js'

export interface HostPtyExit {
  exitCode: number | null
  signal: string | null
}

export interface HostPty {
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
  pause(): void
  resume(): void
  onData(cb: (data: string) => void): void
  onExit(cb: (info: HostPtyExit) => void): void
}

export interface SpawnHostPtyOptions {
  cwd: string
  cols: number
  rows: number
  shell?: string
}

function interactiveArgs(shell: string): string[] {
  if (process.platform !== 'win32') return ['-i']
  const base = path.basename(shell).toLowerCase()
  if (base === 'powershell.exe' || base === 'pwsh.exe') return ['-NoLogo']
  if (base === 'cmd.exe') return []
  return ['-i']
}

function ptyEnvironment(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value
  }
  env.TERM = 'xterm-256color'
  return env
}

/** node-pty 1.1.0 解析不到 PATH 最后一项里的 powershell.exe，因此这里先解析成绝对路径。 */
export function resolveSpawnFile(shell: string, pathEnv = process.env.PATH || ''): string {
  if (!shell || path.isAbsolute(shell)) return shell
  const names =
    process.platform === 'win32' && !shell.toLowerCase().endsWith('.exe') ? [shell, `${shell}.exe`] : [shell]
  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) continue
    for (const name of names) {
      const candidate = path.join(dir, name)
      try {
        if (existsSync(candidate)) return candidate
      } catch {
        // 忽略无法访问的目录
      }
    }
  }
  if (process.platform === 'win32') {
    const systemRoot = process.env.SystemRoot || 'C:\\Windows'
    const fallbacks = [
      path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      path.join(systemRoot, 'Sysnative', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
    ]
    for (const candidate of fallbacks) {
      try {
        if (existsSync(candidate)) return candidate
      } catch {
        // 忽略
      }
    }
  }
  return shell
}

export function describeSpawnHelperChmodError(helper: string, code: string | undefined): string | null {
  if (code !== 'EPERM' && code !== 'EACCES') return null
  return `spawn-helper 无法设置为可执行（${helper}）。当前用户没有权限修改该文件。请用安装时的用户重新安装 @opentiny/webmcp-cli，或对该文件执行 chmod 755。`
}

function loadNodePty(): typeof import('node-pty') {
  try {
    return createRequire(import.meta.url)('node-pty') as typeof import('node-pty')
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    throw new Error(`交互终端不可用：未能加载 node-pty（${detail}）。其余桥接命令仍可使用。`)
  }
}

function spawnHelperPath(): string | null {
  try {
    const pkgJson = createRequire(import.meta.url).resolve('node-pty/package.json')
    return path.join(path.dirname(pkgJson), 'prebuilds', `${process.platform}-${process.arch}`, 'spawn-helper')
  } catch {
    return null
  }
}

function ensureSpawnHelper(): string | null {
  if (process.platform === 'win32') return null
  const helper = spawnHelperPath()
  if (!helper || !existsSync(helper)) return null
  try {
    chmodSync(helper, 0o755)
    return null
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? String((err as { code?: unknown }).code) : undefined
    return describeSpawnHelperChmodError(helper, code)
  }
}

function signalName(code: number | undefined): string | null {
  if (!code) return null
  for (const [name, value] of Object.entries(constants.signals)) {
    if (value === code) return name
  }
  return String(code)
}

function descendantPids(rootPid: number): number[] {
  const result = spawnSync('ps', ['-ax', '-o', 'pid=,ppid='], { encoding: 'utf8', timeout: 3000 })
  if (result.status !== 0 || !result.stdout) return []
  const children = new Map<number, number[]>()
  for (const line of result.stdout.split('\n')) {
    const [pidText, ppidText] = line.trim().split(/\s+/)
    const pid = Number(pidText)
    const ppid = Number(ppidText)
    if (!pid || !ppid) continue
    const list = children.get(ppid)
    if (list) list.push(pid)
    else children.set(ppid, [pid])
  }
  const out: number[] = []
  const walk = (pid: number) => {
    for (const child of children.get(pid) || []) {
      walk(child)
      out.push(child)
    }
  }
  walk(rootPid)
  return out
}

function killPtySession(term: IPty): void {
  const pid = term.pid
  if (pid && pid > 0) {
    if (process.platform === 'win32') {
      try {
        spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true, timeout: 3000 })
      } catch {
        // 进程已退出
      }
    } else {
      // 前台作业会另起进程组，并且可能忽略 SIGHUP。先记下子孙再 SIGKILL。
      for (const victim of [...descendantPids(pid), pid]) {
        try {
          process.kill(victim, 'SIGKILL')
        } catch {
          // 进程已退出
        }
      }
    }
  }
  try {
    term.kill('SIGHUP')
  } catch {
    // 进程已退出
  }
}

export function spawnHostPty(options: SpawnHostPtyOptions): HostPty {
  const pty = loadNodePty()
  const helperError = ensureSpawnHelper()
  const shell = resolveSpawnFile(options.shell || resolveShell())
  const pending: string[] = []
  let dataCb: ((data: string) => void) | null = null
  let exitCb: ((info: HostPtyExit) => void) | null = null
  let pendingExit: HostPtyExit | null = null
  let settled = false
  let term: IPty | null = null

  const emitData = (data: string) => {
    if (!data) return
    if (dataCb) dataCb(data)
    else pending.push(data)
  }

  const finish = (info: HostPtyExit) => {
    if (settled) return
    settled = true
    if (exitCb) exitCb(info)
    else pendingExit = info
  }

  try {
    term = pty.spawn(shell, interactiveArgs(shell), {
      name: 'xterm-256color',
      cols: options.cols,
      rows: options.rows,
      cwd: options.cwd,
      env: ptyEnvironment()
    })
    term.onData((data) => emitData(data))
    term.onExit((event) => {
      finish({ exitCode: event.exitCode, signal: signalName(event.signal) })
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const detail = helperError ? `${helperError} ${message}` : message
    emitData(`\r\n[终端启动失败] ${detail}\r\n`)
    finish({ exitCode: null, signal: null })
  }

  return {
    write(data: string) {
      try {
        term?.write(data)
      } catch {
        // 进程已退出
      }
    },
    resize(cols: number, rows: number) {
      try {
        term?.resize(cols, rows)
      } catch {
        // 进程已退出
      }
    },
    kill() {
      if (term) killPtySession(term)
    },
    pause() {
      try {
        term?.pause()
      } catch {
        // 进程已退出
      }
    },
    resume() {
      try {
        term?.resume()
      } catch {
        // 进程已退出
      }
    },
    onData(cb) {
      dataCb = cb
      for (const chunk of pending) cb(chunk)
      pending.length = 0
    },
    onExit(cb) {
      exitCb = cb
      if (pendingExit) cb(pendingExit)
    }
  }
}
